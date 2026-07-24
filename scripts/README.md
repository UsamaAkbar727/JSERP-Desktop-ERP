# JSERP Scripts Directory

This directory contains automation scripts for building, testing, and releasing JSERP Desktop.

## 🚀 Quick Start Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| **Complete Release** | `npm run release:workflow` | Interactive complete release process |
| **Production Build** | `npm run build:production:win` | Create Windows production installer |
| **Prepare Build** | `npm run prepare-build` | Clean, install, lint, test |

## 📝 Release Scripts

### Automated Release Scripts

- **`npm run release:workflow`** - Interactive complete release workflow
  - Guides you through version selection
  - Runs pre-release checks (git status, tests, build)
  - Creates version/changelog/tag
  - Builds production installer
  - Offers to push to GitHub

### Version Bump Scripts

- **`npm run release:patch`** - Bug fixes (1.0.0 → 1.0.1)
- **`npm run release:minor`** - New features (1.0.0 → 1.1.0)  
- **`npm run release:major`** - Breaking changes (1.0.0 → 2.0.0)

## 🏗️ Build Scripts

### Production Build Scripts

- **`npm run build:production:win`** - Windows-only production build
- **`npm run build:production:mac`** - macOS-only production build
- **`npm run build:production:linux`** - Linux-only production build
- **`npm run build:production:all`** - All platforms
- **`npm run build:production`** - Default (Windows)

### Build Options

Add these flags to production build commands:
- `--skip-tests` - Skip running tests
- `--skip-clean` - Skip cleaning build directories

Example: `npm run build:production:win -- --skip-tests`

### Component Build Scripts

- **`npm run build`** - React app only
- **`npm run build:electron`** - Electron main process only
- **`npm run build:app`** - React + Electron (no installer)
- **`npm run prepare-build`** - Pre-build preparation

## 🧪 Testing & Quality Scripts

- **`npm run test`** - Run test suite
- **`npm run test:watch`** - Run tests in watch mode
- **`npm run lint`** - Run ESLint
- **`npm run check-db`** - Check database status

## 📁 Script Files

| File | Purpose | Language |
|------|---------|----------|
| `build-electron.cjs` | Electron build configuration | Node.js |
| `build-production.cjs` | Complete production build | Node.js |
| `build-production.bat` | Windows batch production build | Batch |
| `prepare-build.cjs` | Pre-build preparation | Node.js |
| `release.cjs` | Version bump and tagging | Node.js |
| `release-workflow.cjs` | Complete release workflow | Node.js |
| `rebuild-native.cjs` | Rebuild native modules | Node.js |

## 🔧 Development Scripts

- **`npm run dev`** - Start development server
- **`npm run electron:dev`** - Start Electron in development
- **`npm run rebuild`** - Rebuild native modules
- **`npm run reset-db`** - Reset database

## 🌐 CI/CD Integration

The scripts integrate with GitHub Actions (`.github/workflows/build.yml`):

- Push to `main` branch: Builds and tests
- Push git tag `v*`: Creates full release with installer
- Pull requests: Tests only

## 📋 Common Workflows

### Standard Release
```bash
npm run release:workflow
```

### Quick Patch Release
```bash
npm run release:patch
git push origin main && git push origin v{version}
```

### Manual Build Only
```bash
npm run prepare-build
npm run build:production:win
```

### Development
```bash
npm run dev                    # Start dev server
npm run electron:dev           # Start Electron app
```

## 🚨 Troubleshooting

### Common Issues

**"Native module compilation failed"**
```bash
npm run rebuild
```

**"Git workspace not clean"**
```bash
git status
git add .
git commit -m "Prepare for release"
```

**"Build preparation failed"**
```bash
npm ci                         # Fresh install
npm run prepare-build
```

### Environment Variables

All production builds automatically set:
- `NODE_ENV=production`
- `VITE_APP_VERSION={version}`
- `VITE_BUILD_TIME={timestamp}`

### Windows Batch Alternative

For Windows users, you can also use:
```batch
scripts\build-production.bat win --skip-tests
```

## 📞 Support

- See [RELEASE.md](../RELEASE.md) for detailed release documentation
- Check [GitHub Issues](https://github.com/jahasoft/erp-pro/issues) for known problems
- Review the main [README.md](../README.md) for project setup