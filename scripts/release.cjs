#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to run commands
function run(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: options.stdio || 'pipe', ...options });
  } catch (error) {
    if (options.ignoreErrors) {
      return error.message;
    }
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const versionType = args[0] || 'patch'; // patch, minor, major

if (!['major', 'minor', 'patch'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: major, minor, or patch');
  process.exit(1);
}


// Step 1: Read current version
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

// Step 2: Calculate new version
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;

switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}


// Step 3: Check git status
try {
  const gitStatus = run('git status --porcelain', { ignoreErrors: false });
  if (gitStatus.trim() !== '') {
    console.error('❌ Git workspace is not clean. Please commit or stash changes.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking git status:', error.message);
  process.exit(1);
}

// Step 4: Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Step 5: Generate changelog entry
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
const timestamp = new Date().toISOString().split('T')[0];
const changelogEntry = `## [${newVersion}] - ${timestamp}

### Added
- 

### Changed
- 

### Fixed
- 

### Removed
- 

`;

let existingChangelog = '';
if (fs.existsSync(changelogPath)) {
  existingChangelog = fs.readFileSync(changelogPath, 'utf-8');
}

fs.writeFileSync(changelogPath, changelogEntry + existingChangelog);

// Step 6: Commit changes
run('git add package.json CHANGELOG.md');
run(`git commit -m "chore: release v${newVersion}"`);

// Step 7: Create git tag
run(`git tag -a v${newVersion} -m "Release version ${newVersion}"`);

// Step 8: Display success message and next steps
console.log('\n✅ Release preparation completed successfully!');
console.log(`\n📦 Version: ${currentVersion} → ${newVersion}`);
console.log('📝 Changelog updated');
console.log('🏷️  Git tag created');

console.log('\n🚀 Next steps:');
console.log('1. Review CHANGELOG.md and edit if needed');
console.log('2. Push to trigger automated build:');
console.log(`   git push origin main && git push origin v${newVersion}`);
console.log('\n3. Monitor the GitHub Actions build');
console.log('4. The release will be created automatically when the build completes');

// Optional: Ask if user wants to push now
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nPush now? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    try {
      console.log('\n⏳ Pushing to remote repository...');
      run('git push origin main');
      run(`git push origin v${newVersion}`);
      console.log('✅ Pushed successfully!');
      console.log('🔗 Check GitHub Actions for build progress');
    } catch (error) {
      console.error('❌ Error during push:', error.message);
      console.log('\n🔧 You can push manually:');
      console.log(`   git push origin main && git push origin v${newVersion}`);
    }
  } else {
    console.log('\n⏸️  Skipped push. Run manually when ready:');
    console.log(`   git push origin main && git push origin v${newVersion}`);
  }
  rl.close();
});
