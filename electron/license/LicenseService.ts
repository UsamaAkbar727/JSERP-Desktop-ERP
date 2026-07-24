import { LicenseRepository, License, LicenseFeatures } from '../database/repositories/LicenseRepository';
import { generateHardwareFingerprint, getHardwareSummary } from '../utils/hardware';
import { verifyLicense, activateLicense as activateLicenseAPI, LicenseVerificationResponse } from './api';
import type { Database } from 'better-sqlite3';
import { getStoreService } from '../store/StoreService';

/**
 * License Service
 * Manages license verification, activation, and validation
 */

export interface LicenseInfo {
  isValid: boolean;
  isActivated: boolean;
  isVerified?: boolean;
  license?: License;
  features?: LicenseFeatures;
  expiryInfo?: {
    hasExpiry: boolean;
    isExpired: boolean;
    daysRemaining: number | null;
    expiryDate: Date | null;
  };
  hardwareId: string;
  message?: string;
}

export interface ActivationResult {
  success: boolean;
  message: string;
  license?: License;
  errorCode?: string;
}

export class LicenseService {
  private repository: LicenseRepository;
  private hardwareId: string;
  private activeLicense: License | null = null; // In-memory storage
  private store = getStoreService();

  constructor(db: Database) {
    this.repository = new LicenseRepository(db);
    this.hardwareId = generateHardwareFingerprint();
    
    // Load license from persistent storage on initialization
    this.loadLicenseFromStore();
  }

  /**
   * Load license from persistent storage
   */
  private loadLicenseFromStore(): void {
    try {
      const storedLicense = this.store.getLicense();
      
      if (storedLicense.isActivated && storedLicense.licenseKey) {
        // Reconstruct the license object
        this.activeLicense = {
          id: 1,
          license_key: storedLicense.licenseKey,
          activation_date: storedLicense.activationDate || '',
          expiry_date: storedLicense.expiryDate || undefined,
          hardware_id: storedLicense.hardwareId || this.hardwareId,
          customer_name: storedLicense.customerName || '',
          customer_email: storedLicense.customerEmail || '',
          status: (storedLicense.status as 'active' | 'expired' | 'revoked' | 'suspended') || 'active',
          last_verified_at: storedLicense.lastVerifiedAt || new Date().toISOString(),
        };

        // Keep hardware ID stable across app restarts for already-activated licenses.
        // This avoids false invalidation when transient hardware probes differ (e.g. offline NIC states).
        this.hardwareId = this.activeLicense.hardware_id || this.hardwareId;
        
      }
    } catch (error) {
      console.error('Error loading license from store:', error);
    }
  }

  /**
   * Save license to persistent storage
   */
  private saveLicenseToStore(validationState?: { isValid?: boolean; isVerified?: boolean }): void {
    try {
      if (this.activeLicense) {
        this.store.setLicense({
          isActivated: true,
          isValid: validationState?.isValid ?? this.activeLicense.status === 'active',
          isVerified: validationState?.isVerified ?? false,
          licenseKey: this.activeLicense.license_key,
          activationDate: this.activeLicense.activation_date,
          expiryDate: this.activeLicense.expiry_date || undefined,
          hardwareId: this.activeLicense.hardware_id,
          customerName: this.activeLicense.customer_name || undefined,
          customerEmail: this.activeLicense.customer_email || undefined,
          status: this.activeLicense.status,
          lastVerifiedAt: this.activeLicense.last_verified_at,
        });
        
      }
    } catch (error) {
      console.error('Error saving license to store:', error);
    }
  }

  /**
   * Get current hardware ID
   */
  getHardwareId(): string {
    return this.hardwareId;
  }

  /**
   * Get hardware summary for display
   */
  getHardwareSummary(): string {
    return getHardwareSummary();
  }

  /**
   * Check if a valid license exists (in-memory check)
   */
  async checkLicense(): Promise<LicenseInfo> {
    try {
      // Check in-memory license
      const license = this.activeLicense;
      const storedLicense = this.store.getLicense();
      const hasCachedVerifiedState = !!(
        storedLicense?.isActivated &&
        storedLicense?.isValid &&
        storedLicense?.isVerified
      );

      if (!license) {
        return {
          isValid: false,
          isActivated: false,
          isVerified: false,
          hardwareId: this.hardwareId,
          message: 'No license found. Please activate a license.',
        };
      }

      // Verify hardware binding against runtime hardware ID.
      // Runtime hardware ID is restored from persisted activated license on app startup.
      if (license.hardware_id !== this.hardwareId) {
        if (hasCachedVerifiedState) {
          return {
            isValid: true,
            isActivated: true,
            isVerified: true,
            license,
            features: this.repository.getFeatures(license),
            expiryInfo: this.repository.getExpiryInfo(license),
            hardwareId: this.hardwareId,
            message: 'Using cached verified license state.',
          };
        }

        return {
          isValid: false,
          isActivated: false,
          isVerified: false,
          hardwareId: this.hardwareId,
          message: 'License is bound to a different machine.',
        };
      }

      // Check expiry
      const expiryInfo = this.repository.getExpiryInfo(license);
      if (expiryInfo.isExpired) {
        return {
          isValid: false,
          isActivated: true,
          isVerified: !!storedLicense?.isVerified,
          license,
          features: this.repository.getFeatures(license),
          expiryInfo,
          hardwareId: this.hardwareId,
          message: 'License has expired.',
        };
      }

      // Check status
      if (license.status !== 'active') {
        if (hasCachedVerifiedState) {
          return {
            isValid: true,
            isActivated: true,
            isVerified: true,
            license,
            features: this.repository.getFeatures(license),
            expiryInfo,
            hardwareId: this.hardwareId,
            message: 'Using cached verified license state.',
          };
        }

        return {
          isValid: false,
          isActivated: true,
          isVerified: !!storedLicense?.isVerified,
          license,
          features: this.repository.getFeatures(license),
          expiryInfo,
          hardwareId: this.hardwareId,
          message: `License is ${license.status}.`,
        };
      }

      // License is valid
      return {
        isValid: true,
        isActivated: true,
        isVerified: !!storedLicense?.isVerified,
        license,
        features: this.repository.getFeatures(license),
        expiryInfo,
        hardwareId: this.hardwareId,
        message: 'License is valid.',
      };
    } catch (error) {
      console.error('Error checking license:', error);
      return {
        isValid: false,
        isActivated: false,
        hardwareId: this.hardwareId,
        message: 'Error checking license: ' + (error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  /**
   * Activate a new license using verify.php endpoint
   * If server responds with success: true, save license locally and activate system
   */
  async activateLicense(licenseKey: string, customerEmail?: string): Promise<ActivationResult> {
    try {
      // Call verify.php endpoint to validate the license
      const response: LicenseVerificationResponse = await activateLicenseAPI({
        licenseKey,
        hardwareId: this.hardwareId,
        customerEmail,
      });


      // Only proceed if server responds with success: true
      if (!response.success || !response.license) {
        return {
          success: false,
          message: response.message || 'Invalid license or system ID',
          errorCode: response.errorCode,
        };
      }

      // License is valid - save locally and activate system
      
      // Convert API license to repository format and store in memory
      const license: License = {
        id: 1,
        license_key: response.license.licenseKey,
        activation_date: response.license.activationDate,
        expiry_date: response.license.expiryDate,
        hardware_id: this.hardwareId,
        customer_name: response.license.customerName,
        customer_email: response.license.customerEmail,
        status: response.license.status,
        last_verified_at: new Date().toISOString(),
      };
      
      // Store in memory
      this.activeLicense = license;
      
      // Persist to storage
      this.saveLicenseToStore({ isValid: true, isVerified: true });
      
      
      return {
        success: true,
        message: 'License activated successfully!',
        license: license,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: 'Failed to activate license: ' + (error instanceof Error ? error.message : 'Unknown error'),
        errorCode: 'ACTIVATION_ERROR',
      };
    }
  }

  /**
   * Get current license information
   */
  async getLicenseInfo(): Promise<LicenseInfo> {
    return this.checkLicense();
  }

  /**
   * Check if license is valid (simplified boolean check)
   */
  async isLicenseValid(): Promise<boolean> {
    const info = await this.checkLicense();
    return info.isValid;
  }

  /**
   * Check if a specific feature is enabled
   */
  async hasFeature(featureName: string): Promise<boolean> {
    const license = this.activeLicense; // Use in-memory license
    if (!license) {
      return false;
    }

    const info = await this.checkLicense();
    if (!info.isValid) {
      return false;
    }

    return this.repository.hasFeature(license, featureName);
  }

  /**
   * Get all enabled features
   */
  async getFeatures(): Promise<LicenseFeatures> {
    const license = this.activeLicense; // Use in-memory license
    if (!license) {
      return {};
    }

    return this.repository.getFeatures(license);
  }

  /**
   * Verify license with server (online check)
   * Updates local license information if successful
   */
  async verifyLicenseOnline(): Promise<ActivationResult> {
    try {
      const license = this.activeLicense; // Use in-memory license
      if (!license) {
        return {
          success: false,
          message: 'No license found to verify.',
        };
      }

      // Call API to verify license
      const response: LicenseVerificationResponse = await verifyLicense({
        licenseKey: license.license_key,
        hardwareId: this.hardwareId,
      });

      if (!response.success || !response.license) {
        // If the server explicitly rejects the license, wipe it from storage entirely
        // so the next launch starts clean. Network/server errors are excluded –
        // only definitive "license not found / unauthorized" responses clear the store.
        const hardRejectCodes = ['UNAUTHORIZED', 'NOT_FOUND', 'INVALID_REQUEST', 'INVALID_LICENSE', 'VERIFICATION_FAILED'];
        if (response.errorCode && hardRejectCodes.includes(response.errorCode)) {
          this.activeLicense = null;
          try {
            this.store.clearLicense();
          } catch (clearError) {
            console.error('Failed to clear license from store after server rejection:', clearError);
          }
        }

        return {
          success: false,
          message: response.message || 'License verification failed.',
          errorCode: response.errorCode,
        };
      }

      // Update in-memory license with server data
      const licenseData = response.license;
      this.activeLicense = {
        id: 1,
        license_key: licenseData.licenseKey,
        activation_date: licenseData.activationDate,
        expiry_date: licenseData.expiryDate,
        hardware_id: this.hardwareId,
        customer_name: licenseData.customerName,
        customer_email: licenseData.customerEmail,
        status: licenseData.status,
        last_verified_at: new Date().toISOString(),
      };
      
      // Persist to storage
      this.saveLicenseToStore({ isValid: true, isVerified: true });

      return {
        success: true,
        message: 'License verified successfully.',
        license: this.activeLicense,
      };
    } catch (error) {
      console.error('Error verifying license online:', error);
      return {
        success: false,
        message: 'Failed to verify license: ' + (error instanceof Error ? error.message : 'Unknown error'),
        errorCode: 'VERIFICATION_ERROR',
      };
    }
  }

  /**
   * Deactivate current license
   */
  async deactivateLicense(): Promise<ActivationResult> {
    try {
      if (!this.activeLicense) {
        return {
          success: false,
          message: 'No active license found.',
        };
      }
      
      // Clear from persistent storage
      this.store.clearLicense();

      // Clear in-memory license
      this.activeLicense = null;

      return {
        success: true,
        message: 'License deactivated successfully.',
      };
    } catch (error) {
      console.error('Error deactivating license:', error);
      return {
        success: false,
        message: 'Failed to deactivate license: ' + (error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  /**
   * Get days until license expires
   */
  getDaysUntilExpiry(): number | null {
    const license = this.activeLicense; // Use in-memory license
    if (!license) {
      return null;
    }

    const expiryInfo = this.repository.getExpiryInfo(license);
    return expiryInfo.daysRemaining;
  }

  /**
   * Check if license expires within specified days
   */
  isExpiringWithin(days: number): boolean {
    const daysRemaining = this.getDaysUntilExpiry();
    if (daysRemaining === null) {
      return false; // Perpetual license
    }

    return daysRemaining <= days && daysRemaining > 0;
  }
}
