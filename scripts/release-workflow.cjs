#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
      ...options 
    });
    return result.trim();
  } catch (error) {
    if (options.ignoreErrors) {
      return '';
    }
    throw error;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function selectReleaseType() {
  log('\n🎯 JSERP Complete Release Workflow', colors.bright);
  log('=================================', colors.bright);
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  log(`📦 Current version: ${packageJson.version}`, colors.cyan);
  
  log('\n📝 Select release type:');
  log('1. Patch (bug fixes): 1.0.0 → 1.0.1', colors.cyan);
  log('2. Minor (new features): 1.0.0 → 1.1.0', colors.cyan);
  log('3. Major (breaking changes): 1.0.0 → 2.0.0', colors.cyan);
  
  const choice = await question('\nEnter your choice (1-3): ');
  
  const releaseTypes = {
    '1': 'patch',
    '2': 'minor', 
    '3': 'major'
  };
  
  const releaseType = releaseTypes[choice];
  if (!releaseType) {
    log('❌ Invalid choice', colors.red);
    process.exit(1);
  }
  
  return releaseType;
}

async function confirmRelease(releaseType, newVersion) {
  log(`\n🔍 Release Summary:`, colors.bright);
  log(`   Type: ${releaseType}`, colors.cyan);
  log(`   New version: ${newVersion}`, colors.cyan);
  log(`   Platform: Windows`, colors.cyan);
  
  const confirm = await question('\nProceed with this release? (y/N): ');
  return confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes';
}

function calculateVersion(currentVersion, releaseType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (releaseType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid release type: ${releaseType}`);
  }
}

async function runPreReleaseChecks() {
  log('\n🔍 Running pre-release checks...', colors.blue);
  
  // Check git status
  try {
    const gitStatus = run('git status --porcelain');
    if (gitStatus !== '') {
      log('   ❌ Git workspace has uncommitted changes', colors.red);
      log('   Please commit or stash changes before releasing', colors.red);
      return false;
    } else {
      log('   ✅ Git workspace is clean');
    }
  } catch (error) {
    log('   ⚠️ Git check failed - continuing anyway', colors.yellow);
  }
  
  // Check if tests pass
  try {
    log('   🧪 Running tests...');
    run('npm test', { stdio: 'pipe' });
    log('   ✅ Tests passed');
  } catch (error) {
    log('   ❌ Tests failed', colors.red);
    const continueAnyway = await question('   Continue anyway? (y/N): ');
    if (continueAnyway.toLowerCase() !== 'y') {
      return false;
    }
    log('   ⚠️ Continuing despite test failures', colors.yellow);
  }
  
  // Check if build works
  try {
    log('   🔧 Testing build system...');
    run('npm run prepare-build -- --skip-tests', { stdio: 'pipe' });
    log('   ✅ Build system ready');
  } catch (error) {
    log('   ❌ Build preparation failed', colors.red);
    return false;
  }
  
  return true;
}

async function executeRelease(releaseType) {
  log(`\n🚀 Executing ${releaseType} release...`, colors.blue);
  
  try {
    // Run release script
    log('   📝 Updating version and changelog...');
    run(`node scripts/release.cjs ${releaseType}`, { stdio: 'inherit' });
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const newVersion = packageJson.version;
    
    log(`   ✅ Release prepared: v${newVersion}`, colors.green);
    return newVersion;
    
  } catch (error) {
    log(`   ❌ Release preparation failed: ${error.message}`, colors.red);
    throw error;
  }
}

async function executeProductionBuild() {
  log('\n🏗️ Creating production build...', colors.blue);
  
  try {
    log('   ⚡ Building Windows installer...');
    run('node scripts/build-production.cjs win', { stdio: 'inherit' });
    
    // Check if installer was created
    const releaseDir = path.join(process.cwd(), 'release');
    if (fs.existsSync(releaseDir)) {
      const installerFiles = fs.readdirSync(releaseDir)
        .filter(file => file.endsWith('.exe'));
      
      if (installerFiles.length > 0) {
        log('   ✅ Production build completed', colors.green);
        installerFiles.forEach(file => {
          const filePath = path.join(releaseDir, file);
          const fileSize = fs.statSync(filePath).size;
          const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
          log(`      📄 ${file} (${sizeMB} MB)`, colors.cyan);
        });
        return true;
      }
    }
    
    log('   ❌ No installer files found', colors.red);
    return false;
    
  } catch (error) {
    log(`   ❌ Production build failed: ${error.message}`, colors.red);
    return false;
  }
}

async function showNextSteps(version) {
  log(`\n🎉 Release v${version} is ready!`, colors.green);
  log('\n📋 Next steps:', colors.bright);
  log('   1. Test the installer on a clean Windows system', colors.cyan);
  log('   2. Push to GitHub to trigger automated deployment:', colors.cyan);
  log(`      git push origin main && git push origin v${version}`, colors.yellow);
  log('   3. Monitor GitHub Actions for build completion', colors.cyan);
  log('   4. Verify the GitHub release was created automatically', colors.cyan);
  log('   5. Download and distribute the installer', colors.cyan);
  
  const pushNow = await question('\nPush to GitHub now? (y/N): ');
  if (pushNow.toLowerCase() === 'y') {
    try {
      log('\n📤 Pushing to GitHub...', colors.blue);
      run('git push origin main');
      run(`git push origin v${version}`);
      log('   ✅ Pushed successfully!', colors.green);
      log('   🔗 Check GitHub Actions for build progress', colors.cyan);
      log(`   🔗 https://github.com/USERNAME/REPO/actions`, colors.cyan);
    } catch (error) {
      log(`   ❌ Push failed: ${error.message}`, colors.red);
      log('   💡 You can push manually later with the commands above', colors.yellow);
    }
  }
}

async function main() {
  try {
    const releaseType = await selectReleaseType();
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const currentVersion = packageJson.version;
    const newVersion = calculateVersion(currentVersion, releaseType);
    
    const confirmed = await confirmRelease(releaseType, newVersion);
    if (!confirmed) {
      log('\n❌ Release cancelled by user', colors.yellow);
      process.exit(0);
    }
    
    const checksPass = await runPreReleaseChecks();
    if (!checksPass) {
      log('\n❌ Pre-release checks failed', colors.red);
      process.exit(1);
    }
    
    const version = await executeRelease(releaseType);
    
    const buildSuccess = await executeProductionBuild();
    if (!buildSuccess) {
      log('\n❌ Production build failed', colors.red);
      log('💡 You can try building manually with: npm run build:production:win', colors.yellow);
      process.exit(1);
    }
    
    await showNextSteps(version);
    
  } catch (error) {
    log(`\n❌ Release workflow failed: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n❌ Release workflow interrupted by user', colors.yellow);
  rl.close();
  process.exit(1);
});

main();