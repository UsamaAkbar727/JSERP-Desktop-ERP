# JSERP Release Process Guide

This document provides comprehensive instructions for creating and managing releases of JSERP Desktop.

## 🎯 Quick Start

For a standard patch release (most common):

```bash
npm run release:patch
```

This single command will:
- ✅ Verify git workspace is clean
- ✅ Update version in package.json (1.0.0 → 1.0.1)
- ✅ Generate changelog entry
- ✅ Commit changes and create git tag
- ✅ Prompt to push (triggers automated build)

## 📋 Available Release Scripts

| Command | Purpose | Version Change |
|---------|---------|----------------|
| `npm run release:patch` | Bug fixes, small updates | 1.0.0 → 1.0.1 |
| `npm run release:minor` | New features, minor changes | 1.0.0 → 1.1.0 |
| `npm run release:major` | Breaking changes, major updates | 1.0.0 → 2.0.0 |

## 🔧 Build & Development Scripts

| Command | Purpose | Description |
|---------|---------|-------------|
| `npm run prepare-build` | Pre-build preparation | Cleans, installs, lints, tests |
| `npm run build:production` | Complete production build | React + Electron + Windows installer |
| `npm run build:production:win` | Windows-only build | Optimized for Windows platform |
| `npm run build:production:mac` | macOS-only build | Optimized for macOS platform |
| `npm run build:production:linux` | Linux-only build | Optimized for Linux platform |

## 🚀 Automated Release Workflow

### Step 1: Prepare the Release

Choose the appropriate release type:

```bash
# For bug fixes and minor updates
npm run release:patch

# For new features
npm run release:minor

# For breaking changes
npm run release:major
```

### Step 2: Review and Edit Changelog

After running the release script, edit the generated changelog entry in `CHANGELOG.md`:

```markdown
## [1.0.1] - 2026-02-16

### Added
- New reporting features for inventory tracking
- Export functionality for customer data

### Changed
- Improved performance for large datasets
- Updated user interface for better accessibility

### Fixed
- Fixed crash when importing large CSV files
- Resolved printing issues on Windows 11

### Removed
- Deprecated old backup format support
```

### Step 3: Push and Trigger Automated Build

When you push the tag, GitHub Actions will automatically:

```bash
git push origin main && git push origin v1.0.1
```

The automated workflow will:
- ✅ Run tests and linting
- ✅ Build Windows installer
- ✅ Create GitHub release
- ✅ Upload installer as release asset
- ✅ Generate release notes

## 🏗️ Manual Build Process

If you need to build manually:

### Prerequisites Check

```bash
npm run prepare-build
```

This command will:
- Check Node.js and npm versions
- Verify git workspace is clean
- Clean old build directories
- Install dependencies
- Run linter and tests

### Production Build

```bash
npm run build:production:win
```

Build options:
- `--skip-tests` - Skip running tests
- `--skip-clean` - Skip cleaning build directories

### Manual Installer Creation

```bash
# Build React app
npm run build

# Build Electron app
npm run build:electron

# Create Windows installer
npm run dist:win
```

## 📦 Build Environment

### Environment Variables

The build system automatically sets these variables:

```bash
NODE_ENV=production                          # Production mode
VITE_APP_VERSION={version}                   # App version from package.json
VITE_BUILD_TIME={timestamp}                  # Build timestamp
process.env.IS_PRODUCTION=true              # Production flag
process.env.ENABLE_DEVTOOLS=false           # Disable dev tools
process.env.BUILD_HASH={hash}                # Unique build identifier
```

### Build Optimization

Production builds include:
- ✅ Code minification and tree-shaking
- ✅ Source map generation (disabled in production)
- ✅ Bundle size optimization
- ✅ Native module packaging
- ✅ Installer compression

## 🎮 CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/build.yml` automates:

1. **Testing Phase**
   - Runs on Ubuntu with Node.js 18
   - Executes `npm test` and `npm run lint`
   - Must pass before building

2. **Build Phase** 
   - Runs on Windows (for native compilation)
   - Creates production installer
   - Uploads artifacts to GitHub

3. **Release Phase** (on git tags)
   - Creates GitHub release
   - Uploads installer as release asset
   - Generates automated release notes

### Triggering Builds

| Trigger | Action |
|---------|--------|
| Push to `main` | Build and test |
| Push git tag `v*` | Full release cycle |
| Pull request | Test only |

## 📊 Release Checklist

### Pre-Release

- [ ] All tests passing locally: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Database migrations tested: `npm run check-db`
- [ ] Git workspace is clean
- [ ] Version number is appropriate for changes

### Release

- [ ] Run release script: `npm run release:patch`
- [ ] Review and edit `CHANGELOG.md`
- [ ] Push tag: `git push origin main && git push origin v{version}`
- [ ] Monitor GitHub Actions build
- [ ] Verify installer creation

### Post-Release

- [ ] Test installer on clean Windows system
- [ ] Update documentation if needed
- [ ] Announce release to stakeholders
- [ ] Monitor for user feedback/issues

## 🔍 Troubleshooting

### Common Build Issues

**Native module compilation errors:**
```bash
npm run rebuild
npm run build:production:win
```

**Git workspace not clean:**
```bash
git status
git add .
git commit -m "Pre-release cleanup"
```

**GitHub Actions build failure:**
- Check the Actions tab in GitHub
- Review build logs for specific errors
- Common fixes: dependency issues, environment variables

### Build Performance

| Build Type | Typical Duration | Output Size |
|------------|------------------|-------------|
| React app | 30-60s | ~2MB |
| Electron | 15-30s | ~5MB |
| Windows installer | 2-5min | ~85MB |
| Full production | 3-7min | ~85MB |

### Version Management

**Roll back a release:**
```bash
git tag -d v1.0.1                    # Delete local tag
git push origin --delete v1.0.1     # Delete remote tag
```

**Create hotfix release:**
```bash
git checkout v1.0.0                  # Checkout previous version
git checkout -b hotfix-1.0.1         # Create hotfix branch
# Make minimal fixes
npm run release:patch                 # Create patch release
```

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/jahasoft/erp-pro/issues)
- **Documentation**: See project README.md
- **Internal**: Contact the development team

---

> **Note**: This release process is designed for reliability and automation. Always test releases thoroughly before distribution.

```bash
# Edit CHANGELOG.md to fill in details
nano CHANGELOG.md

# Commit the changes
git add CHANGELOG.md
git commit --amend --no-edit
```

### Step 3: Push Changes and Tag

```bash
# Push the commit and tag to GitHub
git push origin main --tags

# Verify the tag was pushed
git tag -l
```

### Step 4: Monitor the Build

Once the tag is pushed:
1. GitHub Actions workflow (`build.yml`) automatically starts
2. You can monitor progress in the **Actions** tab on GitHub
3. The workflow will:
   - Install dependencies
   - Run tests
   - Build the application
   - Build Windows installer
   - Create a GitHub release with the installer as an asset

### Step 5: Verify the Release (Optional)

Monitor the workflow completion:

```bash
# Check workflow status
gh workflow view build.yml

# View the latest run
gh run list --workflow=build.yml --limit=1

# Download the artifact
gh run download <run-id> --name erp-pro-installer
```

## Available npm Scripts

```bash
# Build and release scripts
npm run build:app          # Build Vite + Electron apps
npm run dist:win           # Build Windows installer (manual)
npm run release:patch      # Create patch release
npm run release:minor      # Create minor release
npm run release:major      # Create major release

# Development
npm run dev                # Start development server
npm run electron:dev       # Start Electron with dev server
npm run build              # Build Vite app only
npm run build:electron     # Build Electron main/preload

# Testing and quality
npm run test               # Run tests once
npm run test:watch        # Run tests in watch mode
npm run lint              # Run ESLint
```

## Release Notes Template

When editing `CHANGELOG.md`, use this template:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description
- Another new feature

### Changed
- Modified behavior description
- Component improvements

### Fixed
- Bug fix description
- Another bug fix

### Removed
- Deprecated feature
- Removed component
```

## Environment Variables

The build process uses these environment variables:

```bash
# For production builds
NODE_ENV=production npm run build:app

# The version from package.json is automatically injected
```

## Troubleshooting

### "Git workspace is not clean" error

```bash
# Stash uncommitted changes
git stash

# Or discard them
git clean -fd
git checkout -- .
```

### Tag already exists

```bash
# Delete the local tag
git tag -d v1.0.0

# Delete the remote tag (if pushed)
git push origin :refs/tags/v1.0.0

# Run the release script again
npm run release:patch
```

### GitHub Actions build failed

1. Check the **Actions** tab in GitHub for error details
2. Verify all dependencies are installed: `npm install`
3. Check build logs: `git push origin main --tags` and monitor Actions
4. For local diagnostics: `NODE_ENV=production npm run dist:win`

### Manual Build (Emergency Only)

If automated builds fail, create the installer manually:

```bash
# Clean previous build
Remove-Item -Path release -Recurse -Force -ErrorAction SilentlyContinue

# Build the application
npm run build

# Build Electron files
npm run build:electron

# Build Windows installer
electron-builder --win

# The installer will be in the release/ directory
```

## Version Numbering

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR version** (X.0.0): Incompatible API changes, major features
- **MINOR version** (0.X.0): New features, backwards compatible
- **PATCH version** (0.0.X): Bug fixes, maintenance

Example: `1.2.3`
- 1 = Major (breaking changes)
- 2 = Minor (new features)
- 3 = Patch (bug fixes)

## Best Practices

1. **Always test before releasing**
   ```bash
   npm run test
   npm run lint
   ```

2. **Make sure git is clean**
   ```bash
   git status
   ```

3. **Create meaningful commit messages**
   - Use clear, descriptive messages
   - Reference issues/PRs when applicable

4. **Fill in CHANGELOG.md completely**
   - Document all changes for users
   - Include breaking changes clearly

5. **Wait for CI to complete**
   - Don't push changes to main while building
   - Monitor GitHub Actions for successful completion

6. **Test the installer**
   - Download from GitHub release
   - Test on clean Windows installation if possible

## Release Checklist

Before releasing, verify:

- [ ] All tests pass (`npm run test`)
- [ ] Linting is clean (`npm run lint`)
- [ ] Code changes are committed
- [ ] Version number is appropriate (major/minor/patch)
- [ ] CHANGELOG.md is meaningful for users
- [ ] `.github/workflows/build.yml` is configured correctly
- [ ] Git workspace is clean (`git status`)
- [ ] Ready to push to main branch

## Rollback

If a release has issues:

```bash
# Tag the rollback commit
git tag -a v1.0.0-rollback -m "Rollback v1.0.0"
git push origin v1.0.0-rollback

# Or revert the tag
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# Create a patch release with fixes
npm run release:patch
```

## Additional Resources

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Electron Builder Documentation](https://www.electron.build/)
- [Project License](./LICENSE)
