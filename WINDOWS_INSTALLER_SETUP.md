# Windows NSIS Installer Setup Guide

## ✅ Build Complete

The professional Windows installer has been successfully created at:
```
release/JSERP Setup 1.0.0.exe
```

## Configuration Overview

### NSIS Installer Settings (`electron-builder.json`)
- **Installation Type**: Assisted (non-silent)
  - Users can choose installation directory
  - Desktop and Start Menu shortcuts created automatically
  - Per-machine installation disabled (per-user install)

### Assets Generated in `build/`
- `icon.ico` — Multi-size application icon (16–256px)
- `installerIcon.ico` — Installer window icon
- `uninstallerIcon.ico` — Uninstaller window icon
- `installerHeader.png` — Installer header (150×57)
- `installerSidebar.png` — Installer sidebar (164×314)
- `uninstallerSidebar.png` — Uninstaller sidebar (164×314)
- `license.txt` — License placeholder (edit to add your EULA)

### File Association
- `.erp` files are associated with JSERP
- Files can be opened with the app for data import

### Code Signing
Currently disabled (`signAndEditExecutable: false`). To enable:
1. Obtain a code-signing certificate (PFX/P12)
2. Set environment variables:
   ```powershell
   $env:CSC_LINK = "path/to/certificate.pfx"
   $env:CSC_KEY_PASSWORD = "your_certificate_password"
   ```
3. In `electron-builder.json`, set `forceCodeSigning: true` and remove `signAndEditExecutable: false`

### Auto-Update Configuration
Placeholder in `electron-builder.json`:
```json
"publish": [
  {
    "provider": "generic",
    "url": "https://your-update-server.com/updates/"
  }
]
```
Configure for your update server (GitHub, S3, custom server, etc.).

## Installation & Testing Steps

### On a Clean Windows Machine

#### Step 1: Run the Installer
```powershell
.\release\"JSERP Setup 1.0.0.exe"
```

#### Step 2: Verify Installation
- [ ] Installer shows header image and sidebar
- [ ] License text is displayed
- [ ] User can choose installation directory
- [ ] Desktop shortcut created
- [ ] Start Menu entry created
- [ ] Installation completes without errors

#### Step 3: Verify App Launch & Functionality
```powershell
# App is installed to (default):
# C:\Users\<YourUsername>\AppData\Local\Programs\JSERP

# Run from shortcut or manually
& "$env:APPDATA\Local\Programs\<AppName>\JSERP.exe"
```

- [ ] App launches successfully
- [ ] Database initializes (check `%APPDATA%\JSERP`)
- [ ] Create test data (e.g., new customer, purchase) to verify DB functionality
- [ ] Verify `.erp` file association (if applicable)

#### Step 4: Verify Data Persistence
- [ ] Close and reopen the app
- [ ] Previously created records still exist
- [ ] Settings and preferences are preserved

#### Step 5: Test Uninstall
- [ ] Use Control Panel → Programs → Uninstall a program
- [ ] Or run uninstaller shortcut
- [ ] Uninstaller displays sidebar
- [ ] App files removed
- [ ] (Optional) User data in `%APPDATA%\JSERP` removed (configure in NSIS script if desired)

## Project Metadata

**Author**: JahaSoft <support@jahasoft.com>  
**Description**: JSERP desktop application — business management and POS.  
**Homepage**: https://www.jahasoft.com/erp-pro  
**App ID**: com.jahasoft.erp-pro

## Build/Release Commands

```bash
# Generate installer assets (icons, images, license)
npm run build:icons

# Build full Windows installer
npm run dist:win

# Build for all platforms
npm run dist

# Build specific platform
npm run dist:mac
npm run dist:linux
```

## Customization

### 1. Update License File
Edit `build/license.txt` with your EULA before rebuilding.

### 2. Customize Installer Images
- Replace PNG files in `build/` with custom designs (maintain dimensions)
- Header: 150×57 | Sidebar: 164×314
- Regenerate if using design tools

### 3. Add Code Signing
Follow code signing section above.

### 4. Adjust NSIS Settings
Edit `electron-builder.json`:
```json
"nsis": {
  "oneClick": false,           // Assisted installer (false) vs one-click (true)
  "perMachine": false,         // false = per-user, true = per-machine
  "allowToChangeInstallationDirectory": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "installerIcon": "build/installerIcon.ico",
  "uninstallerIcon": "build/uninstallerIcon.ico",
  "installerHeader": "build/installerHeader.png",
  "installerSidebar": "build/installerSidebar.png",
  "license": "build/license.txt"
}
```

### 5. Enable Multi-Architecture (x64 + ia32)
In `electron-builder.json`, update win.target:
```json
"win": {
  "target": [{"target": "nsis", "arch": ["x64", "ia32"]}]
}
```
(Note: Requires resolved file-lock issues with `better-sqlite3` native module)

## Troubleshooting

### Installer Won't Build
- **Error**: File locks on `better-sqlite3`
  - Solution: Run `npm uninstall better-sqlite3 && npm install better-sqlite3`
  - Or: Kill all node processes: `taskkill /IM node.exe /F`

- **Error**: `NSIS not available`
  - electron-builder automatically downloads NSIS (requires internet connection)

- **Error**: Symbolic link permission denied
  - Solution: Run as Administrator or disable `forceCodeSigning`

### Installer Runs but App Won't Start
- Check Event Viewer for errors
- Verify `dist/` and `dist-electron/` folders exist
- Check app data location: `%APPDATA%\JSERP`
- Run from terminal to see console output

### Uninstall Doesn't Remove Data
Edit NSIS config to include uninstaller cleanup:
```json
"nsis": {
  "deleteAppDataOnUninstall": true  // removes %APPDATA% folder
}
```

## File Structure After Install

```
C:\Users\<User>\AppData\Local\Programs\JSERP\
├── JSERP.exe                    # Main executable
├── resources\
│   ├── app.asar                  # Packaged app code
│   └── ...
└── ...

%APPDATA%\JSERP\                # User data location
├── erp-pro.db                    # SQLite database
├── logs\
├── cache\
└── config.json
```

## Next Steps

1. **Customize installer images** with your branding
2. **Update license.txt** with your EULA
3. **Configure auto-update server** (GitHub Releases, S3, custom)
4. **Obtain code-signing certificate** for production releases
5. **Test on clean Windows VM** following verification steps above
6. **Create portable version** (modify `win.target` to include `"portable"`)

---

**Installer Version**: 1.0.0  
**Generated**: February 7, 2026  
**Platform**: Windows x64 (x86/ia32 support available)
