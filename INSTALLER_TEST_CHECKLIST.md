# JSERP Windows Installer - Testing Checklist

## Phase 1: Pre-Installation ✓

- [ ] Installer file exists: `release/JSERP Setup 1.0.0.exe`
- [ ] File size reasonable (~150-200 MB expected)
- [ ] Can double-click to launch

## Phase 2: Installation Window

**Run**: `.\release\"JSERP Setup 1.0.0.exe"`

### Visual Elements
- [ ] Installer window appears with title "JSERP Setup"
- [ ] Sidebar image displays (left side, dark blue)
- [ ] Header shows branding/logo
- [ ] License text visible and readable
- [ ] No corruption or missing graphics

### Installation Steps
1. **Welcome Screen**
   - [ ] Shows next/back buttons
   - [ ] Can proceed without errors

2. **License Agreement**
   - [ ] License text fully visible
   - [ ] Must accept to continue
   - [ ] Accept button enabled after scroll

3. **Installation Directory Selection**
   - [ ] Shows current selected path (e.g., `C:\Users\...\AppData\Local\Programs\JSERP`)
   - [ ] "Browse" button works
   - [ ] Can change installation directory
   - [ ] Path validation works

4. **Installation Progress**
   - [ ] Files extract without errors
   - [ ] Progress bar moves smoothly
   - [ ] No permission errors
   - [ ] Completes within 30-60 seconds

5. **Completion Screen**
   - [ ] "Installation Complete" message shown
   - [ ] Option to create desktop shortcut ✓
   - [ ] Option to create Start Menu entry ✓
   - [ ] Option to launch app immediately

## Phase 3: Post-Installation Verification

### Shortcuts Created
- [ ] Desktop shortcut "JSERP" exists
- [ ] Start Menu → JSERP folder created
- [ ] Can launch from both shortcuts

### Files Installed
```
C:\Users\<YourUsername>\AppData\Local\Programs\JSERP\
├── JSERP.exe
├── resources/
│   ├── app.asar
│   └── (other files)
└── (supporting files)
```

- [ ] All files present at installation path
- [ ] Total size ~200-250 MB
- [ ] Permissions correct

### Application Data Folder
```
%APPDATA%\JSERP\
├── erp-pro.db
├── logs/
└── (config files)
```

- [ ] Folder created in `C:\Users\<YourUsername>\AppData\Roaming\JSERP`
- [ ] Database file initialized
- [ ] No permission errors

## Phase 4: Application Launch & Testing

### First Launch
- [ ] Double-click desktop shortcut
- [ ] App window opens (may take 5-10 seconds first time)
- [ ] splash screen or loading indicator appears
- [ ] Main dashboard/home page loads
- [ ] No crash or error dialogs

### UI Verification
- [ ] Menu bar visible
- [ ] Navigation items accessible
- [ ] Dark/Light theme working
- [ ] Responsive layout (try resizing window)

### Database Functionality

**Test 1: Create New Record**
1. Navigate to any module (e.g., Customers, Items, Purchases)
2. Click "Add New" or "+" button
3. Fill in required fields
4. Click "Save"
   - [ ] Record saves successfully
   - [ ] No database errors
   - [ ] Record appears in list

**Test 2: Edit Record**
1. Select any record from list
2. Make changes to a field
3. Click "Save"
   - [ ] Changes persist
   - [ ] Confirmation message shown
   - [ ] List updates

**Test 3: Delete Record**
1. Select a record
2. Click "Delete" button
3. Confirm deletion
   - [ ] Record removed from list
   - [ ] Confirmation shown
   - [ ] No errors in console

### Settings Access
- [ ] Settings menu accessible
- [ ] Can view/change theme
- [ ] Can view/change language
- [ ] Settings persist after app restart

## Phase 5: Data Persistence Testing

### Test 1: Restart Application
1. Create at least 3 test records (in different modules if possible)
2. Close application completely
3. Re-launch from shortcut
   - [ ] All created records still visible
   - [ ] Data not lost
   - [ ] Database intact

### Test 2: Long-Term Persistence
1. Create more records over multiple sessions
2. Close and reopen app 3-4 times
   - [ ] All historical data remains
   - [ ] No data corruption
   - [ ] App loads faster after first launch

### Test 3: Database Backup
- [ ] Database file size increasing with data input
- [ ] Database located at: `%APPDATA%\JSERP\erp-pro.db`

## Phase 6: Uninstallation Testing

### Method 1: Control Panel
1. Go to: Settings → Apps → Apps & features
2. Find "JSERP"
3. Click "Uninstall"
   - [ ] Uninstaller window appears with sidebar
   - [ ] Shows "Are you sure?" confirmation
   - [ ] Uninstall completes without errors

### Method 2: Start Menu
1. Right-click Start Menu → All apps → JSERP → Uninstall
   - [ ] Uninstaller launches
   - [ ] Same process as Method 1

### Post-Uninstall Verification
- [ ] Application files removed from `C:\Users\...\AppData\Local\Programs\JSERP`
- [ ] Desktop shortcut removed
- [ ] Start Menu folder removed
- [ ] Application registry entries cleaned (if applicable)

### User Data Handling (Optional)
- [ ] User data folder `%APPDATA%\JSERP` still exists (optional to keep or remove)
- [ ] Database preserved for re-installation if desired
- [ ] Clean uninstall suitable for reinstalling updated versions

## Phase 7: Performance Testing

### Launch Time
- [ ] First launch: < 15 seconds
- [ ] Subsequent launches: < 5 seconds
- [ ] No freezing or hanging

### Memory Usage
- [ ] Check Task Manager while app is running
- [ ] Expected: 200-400 MB RAM
- [ ] No memory leaks (memory stable after 10+ minutes)

### CPU Usage
- [ ] Idle app: < 5% CPU
- [ ] During data operations: temp spike, then returns to idle
- [ ] No runaway processes

## Phase 8: Edge Cases & Error Handling

### Test 1: Insufficient Disk Space
- [ ] App shows proper error if disk full
- [ ] Gracefully handles save failures

### Test 2: Network Issues (if applicable)
- [ ] App doesn't crash if network unavailable
- [ ] Shows timeout/connection errors gracefully

### Test 3: Invalid Data Input
- [ ] Form validation works
- [ ] Error messages clear and helpful
- [ ] Can recover and retry

## Phase 9: File Association Testing (Optional)

### .erp File Association
1. Create a test export file from the app (`.erp` format)
2. Double-click the `.erp` file
   - [ ] App launches
   - [ ] File opens/loads automatically
   - [ ] Data displays correctly

## Phase 10: Final Verification

- [ ] Installer creation date: February 7, 2026
- [ ] Version: 1.0.0
- [ ] Architecture: x64 bit
- [ ] No warnings/errors in Event Viewer
- [ ] Registry entries correct (if code-signed)

## Test Results Summary

| Category | Status | Notes |
|----------|--------|-------|
| Installation | ✓/✗ | |
| Launch | ✓/✗ | |
| Data Operations | ✓/✗ | |
| Persistence | ✓/✗ | |
| Uninstallation | ✓/✗ | |
| Performance | ✓/✗ | |

## Issues Found

```
Issue #1: [Description]
- Severity: High/Medium/Low
- Steps to reproduce: 
- Expected: 
- Actual: 
- Resolution: 

Issue #2: [Description]
...
```

## Sign-Off

- [ ] All critical tests passed
- [ ] Ready for distribution
- [ ] Date tested: ___________
- [ ] Tested by: ___________
- [ ] Environment: Windows 10/11, x64

---

**Note**: If any tests fail, check:
1. Event Viewer for error logs
2. Application console output (if running from terminal)
3. Database integrity in `%APPDATA%\JSERP\erp-pro.db`
