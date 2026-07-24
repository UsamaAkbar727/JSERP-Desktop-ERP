import { ipcMain } from 'electron';
import { LicenseService } from '../../license/LicenseService';
import { getDatabase } from '../../database/manager';

/**
 * License IPC Handlers
 * Handles license-related IPC communication between renderer and main process
 */

let licenseService: LicenseService | null = null;

/**
 * Initialize license service
 */
function getLicenseService(): LicenseService {
  if (!licenseService) {
    const dbManager = getDatabase();
    const db = dbManager.getDatabase();
    licenseService = new LicenseService(db);
  }
  return licenseService;
}

/**
 * Check license status (offline validation)
 */
ipcMain.handle('license:check', async () => {
  try {
    const service = getLicenseService();
    const result = await service.checkLicense();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error checking license:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check license',
    };
  }
});

/**
 * Activate license with license key
 */
ipcMain.handle('license:activate', async (_event, licenseKey: string, customerEmail?: string) => {

  
  try {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return {
        success: false,
        error: 'Invalid license key provided',
      };
    }

   
    const service = getLicenseService();
    
    const result = await service.activateLicense(licenseKey.trim(), customerEmail);
   

    
    return {
      success: result.success,
      data: result.license,
      message: result.message,
      errorCode: result.errorCode,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to activate license',
    };
  }
});

/**
 * Get license information
 */
ipcMain.handle('license:info', async () => {
  try {
    const service = getLicenseService();
    const result = await service.getLicenseInfo();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error getting license info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get license info',
    };
  }
});

/**
 * Verify license online with server
 */
ipcMain.handle('license:verify-online', async () => {
  try {
    const service = getLicenseService();
    const result = await service.verifyLicenseOnline();
    
    return {
      success: result.success,
      data: result.license,
      message: result.message,
      errorCode: result.errorCode,
    };
  } catch (error) {
    console.error('Error verifying license online:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify license online',
    };
  }
});

/**
 * Deactivate current license
 */
ipcMain.handle('license:deactivate', async () => {
  try {
    const service = getLicenseService();
    const result = await service.deactivateLicense();
    
    return {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    console.error('Error deactivating license:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate license',
    };
  }
});

/**
 * Get hardware ID
 */
ipcMain.handle('license:hardware-id', async () => {
  try {
    const service = getLicenseService();
    return {
      success: true,
      data: {
        hardwareId: service.getHardwareId(),
        summary: service.getHardwareSummary(),
      },
    };
  } catch (error) {
    console.error('Error getting hardware ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get hardware ID',
    };
  }
});

/**
 * Check if specific feature is enabled
 */
ipcMain.handle('license:has-feature', async (_event, featureName: string) => {
  try {
    if (!featureName || typeof featureName !== 'string') {
      return {
        success: false,
        error: 'Invalid feature name provided',
      };
    }

    const service = getLicenseService();
    const hasFeature = await service.hasFeature(featureName);
    
    return {
      success: true,
      data: hasFeature,
    };
  } catch (error) {
    console.error('Error checking feature:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check feature',
    };
  }
});

/**
 * Get all enabled features
 */
ipcMain.handle('license:get-features', async () => {
  try {
    const service = getLicenseService();
    const features = await service.getFeatures();
    
    return {
      success: true,
      data: features,
    };
  } catch (error) {
    console.error('Error getting features:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get features',
    };
  }
});

/**
 * Check if license is expiring within specified days
 */
ipcMain.handle('license:is-expiring', async (_event, days: number = 30) => {
  try {
    const service = getLicenseService();
    const isExpiring = service.isExpiringWithin(days);
    const daysRemaining = service.getDaysUntilExpiry();
    
    return {
      success: true,
      data: {
        isExpiring,
        daysRemaining,
      },
    };
  } catch (error) {
    console.error('Error checking license expiry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check license expiry',
    };
  }
});
