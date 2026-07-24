#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function run(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf-8', 
      stdio: options.stdio || 'pipe',
      env: { ...process.env, ...options.env },
      ...options 
    });
    return result;
  } catch (error) {
    if (options.ignoreErrors) {
      return error.message;
    }
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const platform = args[0] || 'win'; // win, mac, linux, all
const skipTests = args.includes('--skip-tests');
const skipClean = args.includes('--skip-clean');

const validPlatforms = ['win', 'mac', 'linux', 'all'];
if (!validPlatforms.includes(platform)) {
  log('❌ Invalid platform. Use: win, mac, linux, or all', colors.red);
  process.exit(1);
}

function showBuildInfo() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  
  log('🏗️  JSERP Production Build', colors.bright);
  log('=========================', colors.bright);
  log(`📦 Package: ${packageJson.name} v${packageJson.version}`, colors.cyan);
  log(`🎯 Platform: ${platform}`, colors.cyan);
  log(`📅 Build Time: ${new Date().toISOString()}`, colors.cyan);
  log(`🌍 Environment: NODE_ENV=production`, colors.cyan);
  
  if (skipTests) log('⚠️  Skipping tests', colors.yellow);
  if (skipClean) log('⚠️  Skipping clean', colors.yellow);
}

function validateEnvironment() {
  log('\\n🔍 Validating build environment...', colors.blue);
  
  // Check required environment
  if (process.env.NODE_ENV !== 'production') {
    log('   Setting NODE_ENV=production', colors.yellow);
    process.env.NODE_ENV = 'production';
  }
  
  // Check required files
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'electron-builder.json',
    'electron/main.ts',
    'src/App.tsx'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`   ❌ Required file missing: ${file}`, colors.red);
      process.exit(1);
    }
  }
  
  log('   ✅ Environment validation passed');
}

function buildReactApp() {
  log('\\n⚛️  Building React application...', colors.blue);
  
  try {
    const buildEnv = {
      NODE_ENV: 'production',
      VITE_APP_VERSION: JSON.parse(fs.readFileSync('package.json', 'utf-8')).version,
      VITE_BUILD_TIME: new Date().toISOString(),
    };
    
    run('npm run build', { 
      stdio: 'inherit',
      env: buildEnv 
    });
    
    // Check build output
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('React build output not found');
    }
    
    // Get build size
    const indexHtmlPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      const stats = fs.statSync(indexHtmlPath);
      const buildSize = getDirSize(distPath);
      log(`   ✅ React build completed (${formatBytes(buildSize)})`, colors.green);
    }
    
  } catch (error) {
    log(`   ❌ React build failed: ${error.message}`, colors.red);
    throw error;
  }
}

function buildElectronApp() {
  log('\\n⚡ Building Electron application...', colors.blue);
  
  try {
    const buildEnv = {
      NODE_ENV: 'production'
    };
    
    run('npm run build:electron', { 
      stdio: 'inherit',
      env: buildEnv 
    });
    
    // Check electron build output
    const electronDistPath = path.join(process.cwd(), 'dist-electron');
    if (!fs.existsSync(electronDistPath) || !fs.existsSync(path.join(electronDistPath, 'main.js'))) {
      throw new Error('Electron build output not found');
    }
    
    const buildSize = getDirSize(electronDistPath);
    log(`   ✅ Electron build completed (${formatBytes(buildSize)})`, colors.green);
    
  } catch (error) {
    log(`   ❌ Electron build failed: ${error.message}`, colors.red);
    throw error;
  }
}

function createInstaller() {
  log('\\n📦 Creating installer packages...', colors.blue);
  
  const platformCommands = {
    win: 'npm run dist:win',
    mac: 'npm run dist:mac', 
    linux: 'npm run dist:linux',
    all: 'npm run dist'
  };
  
  const command = platformCommands[platform];
  if (!command) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  
  try {
    run(command, { stdio: 'inherit' });
    
    // Check installer output
    const releasePath = path.join(process.cwd(), 'release');
    if (fs.existsSync(releasePath)) {
      const installerFiles = fs.readdirSync(releasePath)
        .filter(file => file.endsWith('.exe') || file.endsWith('.dmg') || file.endsWith('.AppImage') || file.endsWith('.deb'));
      
      if (installerFiles.length > 0) {
        log(`   ✅ Installer(s) created:`, colors.green);
        installerFiles.forEach(file => {
          const filePath = path.join(releasePath, file);
          const fileSize = fs.statSync(filePath).size;
          log(`      📄 ${file} (${formatBytes(fileSize)})`, colors.cyan);
        });
      }
    }
    
  } catch (error) {
    log(`   ❌ Installer creation failed: ${error.message}`, colors.red);
    throw error;
  }
}

function getDirSize(dirPath) {
  let size = 0;
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        size += getDirSize(itemPath);
      } else {
        size += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  const startTime = Date.now();
  
  try {
    showBuildInfo();
    
    // Step 1: Validate environment
    validateEnvironment();
    
    // Step 2: Prepare build (optional clean and tests)
    if (!skipClean || !skipTests) {
      log('\\n🔧 Running preparation...', colors.blue);
      const prepareArgs = [];
      if (skipTests) prepareArgs.push('--skip-tests');
      if (skipClean) prepareArgs.push('--skip-clean');
      
      try {
        run(`node scripts/prepare-build.cjs ${prepareArgs.join(' ')}`, { stdio: 'inherit' });
      } catch (error) {
        log('   ⚠️  Preparation failed, continuing anyway...', colors.yellow);
      }
    }
    
    // Step 3: Build React app
    buildReactApp();
    
    // Step 4: Build Electron app
    buildElectronApp();
    
    // Step 5: Create installer
    createInstaller();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log(`\\n🎉 Production build completed successfully in ${duration}s!`, colors.green);
    log('\\n📋 Build Summary:', colors.bright);
    log(`   Platform: ${platform}`, colors.cyan);
    log(`   Environment: production`, colors.cyan);
    log(`   Output: release/ directory`, colors.cyan);
    
    // Show next steps
    log('\\n🚀 Next Steps:', colors.bright);
    log('   1. Test the installer locally', colors.cyan);
    log('   2. Create a GitHub release', colors.cyan);
    log('   3. Upload installer to distribution channels', colors.cyan);
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\\n❌ Production build failed after ${duration}s`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    
    log('\\n🔧 Troubleshooting:', colors.yellow);
    log('   1. Check the error message above', colors.yellow);
    log('   2. Ensure all dependencies are installed: npm ci', colors.yellow);
    log('   3. Try a clean build: npm run prepare-build', colors.yellow);
    log('   4. Check GitHub Issues for similar problems', colors.yellow);
    
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\\n❌ Build interrupted by user', colors.yellow);
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\\n❌ Build terminated', colors.yellow);
  process.exit(1);
});

main();