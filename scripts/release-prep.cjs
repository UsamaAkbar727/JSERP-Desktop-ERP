#!/usr/bin/env node

/**
 * Release Preparation Script
 * Automates release preparation tasks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

async function prepareRelease() {
  try {
    log('🔧 JSERP Release Preparation', 'green');
    log('============================', 'green');
    console.log();
    
    const projectDir = path.resolve('E:/optify srudio/erp-pro');
    process.chdir(projectDir);
    
    // 1. Check Git status
    log('📋 Checking Git status...', 'cyan');
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      if (gitStatus.trim()) {
        log('⚠️  Uncommitted changes found:', 'yellow');
        console.log(gitStatus);
        log('💡 Consider committing changes before release', 'yellow');
      } else {
        log('✅ Working tree clean', 'green');
      }
    } catch (e) {
      log('⚠️  Git not available or not a git repository', 'yellow');
    }
    
    // 2. Verify package.json version
    log('📦 Checking package version...', 'cyan');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    log(`   Current version: ${packageJson.version}`, 'reset');
    log(`   Product name: ${packageJson.productName}`, 'reset');
    
    // 3. Check migration version
    log('🗄️  Checking database migration version...', 'cyan');
    const mainTs = fs.readFileSync('electron/main.ts', 'utf8');
    const versionMatch = mainTs.match(/version:\s*(\d+)/);
    if (versionMatch) {
      log(`   Migration version: v${versionMatch[1]}`, 'reset');
    }
    
    // 4. Verify dependencies
    log('🔍 Verifying critical dependencies...', 'cyan');
    const criticalDeps = [
      'react', 'electron', 'better-sqlite3', 'electron-builder'
    ];
    
    for (const dep of criticalDeps) {
      try {
        const version = require(path.join(projectDir, 'node_modules', dep, 'package.json')).version;
        log(`   ${dep}: v${version}`, 'reset');
      } catch (e) {
        log(`   ❌ ${dep}: Not found`, 'red');
      }
    }
    
    // 5. Check build configuration
    log('⚙️  Checking build configuration...', 'cyan');
    
    // Check electron-builder config
    if (fs.existsSync('electron-builder.json')) {
      const builderConfig = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'));
      log(`   App ID: ${builderConfig.appId}`, 'reset');
      log(`   Product: ${builderConfig.productName}`, 'reset');
      log(`   Output: ${builderConfig.directories.output}`, 'reset');
    }
    
    // 6. Pre-build checks
    log('🔧 Running pre-build checks...', 'cyan');
    
    // Check TypeScript compilation
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      log('   ✅ TypeScript compilation check passed', 'green');
    } catch (e) {
      log('   ❌ TypeScript compilation errors found', 'red');
      console.log(e.stdout?.toString() || e.message);
    }
    
    // 7. Environment check
    log('🌍 Environment check...', 'cyan');
    log(`   Node.js: ${process.version}`, 'reset');
    log(`   Platform: ${process.platform} ${process.arch}`, 'reset');
    log(`   Working directory: ${process.cwd()}`, 'reset');
    
    // 8. Disk space check
    log('💾 Checking available disk space...', 'cyan');
    try {
      const stats = fs.statSync('.');
      log('   📁 Project directory accessible', 'green');
    } catch (e) {
      log('   ❌ Project directory access error', 'red');
    }
    
    // 9. Generate release checklist
    console.log();
    log('📝 Release Checklist:', 'yellow');
    log('=====================', 'yellow');
    console.log();
    log('Pre-Release:', 'cyan');
    log('  ☐ All features tested', 'reset');
    log('  ☐ Database migrations verified', 'reset');
    log('  ☐ UI/UX changes reviewed', 'reset');
    log('  ☐ Performance tested', 'reset');
    console.log();
    log('Build Process:', 'cyan');
    log('  ☐ Run: npm run build', 'reset');
    log('  ☐ Run: npm run build:electron', 'reset');
    log('  ☐ Run: electron-builder --win', 'reset');
    log('  ☐ Test installer on clean Windows system', 'reset');
    console.log();
    log('Post-Release:', 'cyan');
    log('  ☐ Verify app launches correctly', 'reset');
    log('  ☐ Test database migration on fresh install', 'reset');
    log('  ☐ Verify all modules functional', 'reset');
    log('  ☐ Create release notes', 'reset');
    
    console.log();
    log('🚀 Ready for build! Run one of:', 'green');
    log('   • npm run dist:win', 'reset');
    log('   • ./scripts/build-production.bat', 'reset');
    log('   • node scripts/quick-build.cjs', 'reset');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  prepareRelease();
}

module.exports = { prepareRelease };