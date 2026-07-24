/**
 * Rebuild native modules for Electron
 * This script ensures better-sqlite3 works with Electron
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { resolve } = require('path');
const { readFileSync } = require('fs');

const rootDir = resolve(__dirname, '..');


try {
  // Check if node_modules exists
  if (!existsSync(resolve(rootDir, 'node_modules'))) {
    console.error('❌ node_modules not found. Please run npm install first.');
    process.exit(1);
  }

  // Check if better-sqlite3 is installed
  if (!existsSync(resolve(rootDir, 'node_modules/better-sqlite3'))) {
    console.error('❌ better-sqlite3 not found. Please run npm install first.');
    process.exit(1);
  }

  // Try to use prebuilt binaries for electron
  try {
    const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
    const electronVersion = (pkg.devDependencies && pkg.devDependencies.electron)
      ? String(pkg.devDependencies.electron).replace(/^[^0-9]*/, '')
      : '';

    // Use project-pinned electron-rebuild from node_modules (deterministic)
    const rebuildCommand = electronVersion
      ? `npx electron-rebuild -f -w better-sqlite3 -v ${electronVersion}`
      : 'npx electron-rebuild -f -w better-sqlite3';

    execSync(rebuildCommand, {
      cwd: rootDir,
      stdio: 'inherit',
    });
    
  } catch (rebuildError) {
    
    // Alternative: reinstall better-sqlite3 to get prebuilt binaries
    try {
      execSync('npm rebuild better-sqlite3 --update-binary', {
        cwd: rootDir,
        stdio: 'inherit',
      });
    } catch (altError) {
      console.warn('⚠ Warning: Could not rebuild native modules');
      console.warn('   The application may not work if native binaries are incompatible');
      console.warn('   Please ensure Python and build tools are installed for production builds');
    }
  }
} catch (error) {
  console.warn('⚠ Warning: Could not prepare native modules:', error.message);
  console.warn('   The application may not work correctly');
}
