#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command-line arguments
const args = process.argv.slice(2);
const skipTests = args.includes('--skip-tests');
const skipLint = args.includes('--skip-lint');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function run(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf-8', 
      stdio: options.stdio || 'pipe',
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

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', colors.blue);
  
  // Check Node.js version
  const nodeVersion = process.version;
  log(`   Node.js: ${nodeVersion}`);
  
  // Check npm version
  const npmVersion = run('npm --version').trim();
  log(`   npm: v${npmVersion}`);
  
  // Check git status
  try {
    const gitStatus = run('git status --porcelain').trim();
    if (gitStatus !== '') {
      log('   ⚠️ Git workspace has uncommitted changes (continuing anyway)', colors.yellow);
    } else {
      log('   ✅ Git workspace is clean');
    }
  } catch (error) {
    log('   ⚠️ Warning: Git not available or not a git repository', colors.yellow);
  }
  
  // Check package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log('   ❌ package.json not found', colors.red);
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  log(`   📦 Package: ${packageJson.name} v${packageJson.version}`);
  
  return true;
}

function cleanBuildDirectories() {
  log('\n🧹 Cleaning build directories...', colors.blue);
  
  const dirsToClean = ['dist', 'dist-electron', 'release'];
  
  dirsToClean.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        log(`   ✅ Cleaned ${dir}/`);
      } catch (error) {
        log(`   ⚠️ Warning: Could not clean ${dir}/: ${error.message}`, colors.yellow);
      }
    } else {
      log(`   ℹ️ ${dir}/ does not exist`);
    }
  });
}

function installDependencies() {
  log('\n📦 Installing dependencies...', colors.blue);
  
  try {
    // On Windows, sometimes npm ci fails due to locked files
    // Try npm ci first, fall back to npm install if it fails
    try {
      run('npm ci', { stdio: 'inherit' });
      log('   ✅ Dependencies installed with npm ci');
    } catch (ciError) {
      log('   ⚠️ npm ci failed, trying npm install...', colors.yellow);
      
      // Clean node_modules more thoroughly
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        log('   🧹 Removing node_modules...');
        try {
          fs.rmSync(nodeModulesPath, { recursive: true, force: true, maxRetries: 3 });
        } catch (rmError) {
          log('   ⚠️ Could not fully remove node_modules, continuing...', colors.yellow);
        }
      }
      
      run('npm install', { stdio: 'inherit' });
      log('   ✅ Dependencies installed with npm install');
    }
  } catch (error) {
    log('   ❌ Failed to install dependencies', colors.red);
    throw error;
  }
}

function runLinting() {
  log('\n🔍 Running linter...', colors.blue);
  
  try {
    run('npm run lint', { stdio: 'inherit' });
    log('   ✅ Linting passed');
  } catch (error) {
    log('   ❌ Linting failed', colors.red);
    throw error;
  }
}

function runTests() {
  log('\n🧪 Running tests...', colors.blue);
  
  try {
    run('npm run test', { stdio: 'inherit' });
    log('   ✅ Tests passed');
  } catch (error) {
    log('   ❌ Tests failed', colors.red);
    throw error;
  }
}

function main() {
  log('🚀 JSERP Pre-Build Preparation', colors.bright);
  log('============================', colors.bright);
  
  if (skipTests) {
    log('⚠️ Skipping tests (--skip-tests flag set)', colors.yellow);
  }
  if (skipLint) {
    log('⚠️ Skipping linting (--skip-lint flag set)', colors.yellow);
  }
  
  const startTime = Date.now();
  
  try {
    // Step 1: Check prerequisites
    if (!checkPrerequisites()) {
      log('\n❌ Prerequisites check failed. Please fix the issues above.', colors.red);
      process.exit(1);
    }
    
    // Step 2: Clean build directories
    cleanBuildDirectories();
    
    // Step 3: Install dependencies
    installDependencies();
    
    // Step 4: Run linting (if not skipped)
    if (!skipLint) {
      runLinting();
    } else {
      log('\n⏭️ Skipping linting', colors.yellow);
    }
    
    // Step 5: Run tests (if not skipped)
    if (!skipTests) {
      runTests();
    } else {
      log('\n⏭️ Skipping tests', colors.yellow);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log(`\n✅ Pre-build preparation completed successfully in ${duration}s`, colors.green);
    log('\n🎯 Ready to build! Run one of:', colors.cyan);
    log('   npm run dist:win      - Windows installer', colors.cyan);
    log('   npm run build:app     - Application only', colors.cyan);
    log('   npm run release:patch - Full release cycle', colors.cyan);
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n❌ Pre-build preparation failed after ${duration}s`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main();