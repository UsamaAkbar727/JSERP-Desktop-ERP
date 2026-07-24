#!/usr/bin/env node

/**
 * Quick Build Script for JSERP
 * Node.js-based build automation with progress tracking
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper functions
const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const step = (message) => log(`📦 ${message}`, 'cyan');
const success = (message) => log(`✅ ${message}`, 'green');
const error = (message) => log(`❌ ${message}`, 'red');
const info = (message) => log(`ℹ️  ${message}`, 'yellow');

// Run command with promise
function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, cwd, stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Get file size in MB
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024 / 1024).toFixed(2);
}

// Main build function
async function buildProduction() {
  try {
    log('🚀 JSERP Quick Build Script', 'green');
    log('==========================', 'green');
    console.log();
    
    const projectDir = path.resolve('E:/optify srudio/erp-pro');
    process.chdir(projectDir);
    
    // Step 1: Clean previous builds
    step('Cleaning previous builds...');
    const dirsToClean = ['dist', 'dist-electron', 'release'];
    for (const dir of dirsToClean) {
      if (fileExists(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    success('Cleaned previous builds');
    
    // Step 2: Build React app
    step('Building React application...');
    await runCommand('npm run build', projectDir);
    success('React app built successfully');
    
    // Step 3: Build Electron main process
    step('Building Electron main process...');
    await runCommand('npm run build:electron', projectDir);
    success('Electron main process built successfully');
    
    // Step 4: Create Windows installer
    step('Creating Windows installer (this may take a few minutes)...');
    await runCommand('electron-builder --win --publish never', projectDir);
    success('Windows installer created successfully');
    
    // Step 5: Verify build output
    step('Verifying build output...');
    const installerPath = path.join(projectDir, 'release', 'JSERP Setup 1.0.0.exe');
    const exePath = path.join(projectDir, 'release', 'win-unpacked', 'JSERP.exe');
    
    if (fileExists(installerPath)) {
      const size = getFileSizeMB(installerPath);
      
      console.log();
      log('🎉 BUILD SUCCESSFUL!', 'green');
      log('==================', 'green');
      console.log();
      log(`📁 Installer: release/JSERP Setup 1.0.0.exe (${size} MB)`, 'white');
      log(`📁 Executable: release/win-unpacked/JSERP.exe`, 'white');
      console.log();
      log('🚀 Installation Commands:', 'yellow');
      log('   Install:    ./release/JSERP Setup 1.0.0.exe', 'white');
      log('   Test:       ./release/win-unpacked/JSERP.exe', 'white');
      console.log();
      
      // Additional info
      info('Features included:');
      log('   • Migration v21 with credit payment support', 'white');
      log('   • Boxes tracking with auto-status updates', 'white');
      log('   • Production optimized (no dev tools)', 'white');
      log('   • Code signed Windows installer', 'white');
      
    } else {
      throw new Error('Installer not found after build completion');
    }
    
    success('Production build completed successfully!');
    
  } catch (err) {
    error(`Build failed: ${err.message}`);
    process.exit(1);
  }
}

// Run the build
if (require.main === module) {
  buildProduction();
}

module.exports = { buildProduction };