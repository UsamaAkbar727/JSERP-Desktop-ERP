# Production Build Fix - White Screen Issue

## Issue
The Electron desktop app was showing a blank/white screen when running on Windows machines due to incorrect file path resolution in production builds.

## Root Causes
1. **Path Resolution**: The `__dirname` variable behaves differently in packaged Electron apps vs development
2. **Missing Error Logging**: No visibility into what was failing during production load
3. **Build Configuration**: Needed proper asset handling and source maps for debugging

## Changes Made

### 1. electron/main.ts
- **Added import**: `pathToFileURL` from 'url' module (for future file URL handling)
- **Added helper function**: `getResourcePath()` to handle development vs production paths correctly
- **Updated icon path**: Uses conditional logic to find icon in correct location for dev/prod
- **Added error logging**: 
  - `did-fail-load` event handler to catch loading failures
  - `console-message` event handler to see renderer console logs
  - Detailed logging of paths being used
- **Improved loadFile**: Added error handling with fallback path attempts
- **Temporary DevTools**: Opens DevTools in production for debugging (can be removed after testing)

### 2. vite.config.ts
- **Added asset naming**: Consistent naming for CSS/JS assets
- **Source maps**: Enabled for non-production builds to aid debugging

### 3. package.json
- **Updated build:electron script**: Now explicitly sets `NODE_ENV=production` using cross-env

### 4. electron-builder.json
- **Added asarUnpack**: Ensures better-sqlite3 native modules are properly unpacked
- **Refined files array**: More precise control over what gets packaged

## Testing the Fix

### 1. Test on Development Machine
Run the installer from: `release\JSERP Setup 1.0.0.exe`

The app should now:
- Load properly without white screen
- Show DevTools (temporarily enabled) with any console messages
- Display proper error messages if something is still failing

### 2. Test on Another Windows Machine
Copy the installer to another Windows laptop and install it.

### 3. Check DevTools Console
When the app opens, check the DevTools console for:
- Path information (logged at startup)
- Any error messages
- Successful load messages

## After Successful Testing

Once you confirm the app works correctly on all machines, **remove the DevTools** from production:

In [electron/main.ts](electron/main.ts#L64-L65), remove or comment out these lines:
```typescript
// Open DevTools in production for debugging (remove after testing)
mainWindow.webContents.openDevTools();
```

Then rebuild:
```bash
npm run dist:win
```

## Path Resolution Details

### Development
- `__dirname` points to: `E:\optify srudio\erp-pro\dist-electron`
- Loads: `http://localhost:8080`

### Production (Installed)
- `__dirname` points to: `C:\Users\...\AppData\Local\Programs\erp-pro\resources\app.asar\dist-electron`
- `process.resourcesPath` points to: `C:\Users\...\AppData\Local\Programs\erp-pro\resources`
- Loads: `../dist/index.html` (relative to dist-electron directory inside app.asar)

## Alternative Path Resolution (If Still Failing)

If the app still shows a white screen, the fallback path logic will try:
```typescript
join(process.resourcesPath, 'app', 'dist/index.html')
```

Check the console logs to see which path is being attempted and what errors occur.

## Build Commands Reference

```bash
# Build everything (Vite + Electron)
npm run build:app

# Create Windows installer
npm run dist:win

# Create installer for other platforms
npm run dist:mac
npm run dist:linux
```

## Additional Improvements Made

1. **Better error visibility**: Console logs show exact paths being used
2. **Graceful fallback**: Tries alternative paths if primary path fails
3. **Proper environment detection**: Uses NODE_ENV consistently
4. **Native module handling**: Ensures better-sqlite3 is properly packaged

## Support

If you still encounter issues:
1. Open DevTools in the installed app (temporarily enabled)
2. Check the Console tab for errors
3. Note the paths being logged
4. Check if index.html exists at the logged path
