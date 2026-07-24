# License System Setup

## Overview

The application uses a real license verification system hosted at **jserp.jahasoft.com**. All license activation and verification happens through the official API endpoint.

## License Management Portal

**URL**: https://jserp.jahasoft.com/

**Admin Credentials**:
- Username: `admin`
- Password: `admin123`

Use this portal to:
- Create new licenses
- View active licenses
- Manage system bindings
- Revoke licenses if needed

## API Endpoint

**Verify License Endpoint**: `https://jserp.jahasoft.com/api/verify.php`

**Method**: POST

**Request Format**:
```json
{
    "licenseKey": "YOUR-LICENSE-KEY",
    "systemId": "YOUR-SYSTEM-ID"
}
```

**Success Response (200 OK)**:
```json
{
    "success": true,
    "message": "License is valid",
    "data": {
        "license_key": "YOUR-LICENSE-KEY",
        "system_key": "YOUR-SYSTEM-ID",
        "created_at": "2026-02-11 10:30:00",
        "updated_at": "2026-02-11 10:30:00"
    }
}
```

**Error Response (404 Not Found)**:
```json
{
    "success": false,
    "message": "Invalid license or system ID"
}
```

## How It Works

### 1. License Activation
- User enters a license key obtained from the portal
- App generates a unique system ID (hardware fingerprint)
- License key + system ID are sent to the API for verification
- On success, the license is stored locally for offline use

### 2. Offline Operation
- Once activated, the app works offline for up to 30 days
- The last verification timestamp is stored locally
- App checks if 30-day grace period has expired

### 3. Background Verification
- When online, the app verifies the license every 24 hours
- Initial verification happens 5 seconds after startup
- Verification failures don't immediately block the app (grace period applies)

### 4. Grace Period
- 30 days of offline operation after last successful verification
- After 30 days without internet, user must go online to reverify
- Network errors don't invalidate the license during grace period

## Getting a License Key

1. **Login to Portal**: Visit https://jserp.jahasoft.com/ and login with admin credentials

2. **Create License**: Generate a new license key in the management portal

3. **Activate in App**: 
   - Start the JSERP application
   - Enter the license key when prompted
   - The app will automatically bind to your system

4. **Verification**: The license is immediately verified and stored locally

## Testing the License System

See [TESTING_OFFLINE_LICENSE.md](TESTING_OFFLINE_LICENSE.md) for detailed testing instructions.

### Quick Test:
1. Get a license key from the portal
2. Start the app: `npm run dev`
3. Enter the license key
4. Test offline mode by disconnecting internet
5. Restart the app - should work without asking for license

## Troubleshooting

### "Invalid license or system ID" error
- Verify the license key is correct (copy from portal)
- Ensure the license hasn't been revoked
- Check if the system ID was already bound to another license

### "Cannot connect to license server" message
- Check your internet connection
- Verify you can access https://jserp.jahasoft.com
- If offline, the app should still work (check grace period)

### License not persisting after restart
- Check electron-store config location:
  - Windows: `%APPDATA%\erp-pro-config\config.json`
  - Mac: `~/Library/Application Support/erp-pro-config/config.json`
  - Linux: `~/.config/erp-pro-config/config.json`
- Verify `isActivated: true` is in the config
- Check file permissions

### Grace period expired
- Connect to the internet
- App will automatically reverify the license
- Start the app normally

## Environment Variables

You can override the license API URL using environment variables:

```bash
# Use a different license server
export LICENSE_API_URL=https://your-custom-server.com/api/verify.php
npm run dev
```

## Implementation Files

- **electron/license/api.ts** - API client for license verification
- **electron/license/LicenseService.ts** - Core license management service
- **electron/utils/network.ts** - Network connectivity detection
- **electron/utils/hardware.ts** - Hardware ID generation
- **src/components/LicenseActivation.tsx** - UI for license activation
- **src/hooks/useLicense.ts** - React hook for license management

## Security Notes

- License keys are stored locally in electron-store (encrypted on Windows/Mac)
- System ID is generated from hardware fingerprint
- All API requests use HTTPS
- Network errors don't invalidate licenses (offline-first approach)
- Grace period prevents service disruption from temporary network issues

## Support

For license-related issues or questions, contact the license system administrator at jserp.jahasoft.com.
