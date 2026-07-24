import { useState, useEffect, useCallback } from 'react';
import type { LicenseInfo, License, LicenseFeatures, HardwareInfo } from '../types/license';

/**
 * React Hook for License Management
 * Provides license checking, activation, and feature management
 */

interface UseLicenseReturn {
  // State
  licenseInfo: LicenseInfo | null;
  isLoading: boolean;
  error: string | null;
  isValid: boolean;
  isActivated: boolean;

  // Actions
  checkLicense: () => Promise<void>;
  activateLicense: (licenseKey: string) => Promise<boolean>;
  verifyOnline: () => Promise<boolean>;
  deactivateLicense: () => Promise<boolean>;
  getHardwareId: () => Promise<HardwareInfo | null>;
  hasFeature: (featureName: string) => Promise<boolean>;
  getFeatures: () => Promise<LicenseFeatures | null>;
  checkExpiry: (days?: number) => Promise<{ isExpiring: boolean; daysRemaining: number | null } | null>;

  // License details
  license: License | undefined;
  features: LicenseFeatures | undefined;
  expiryInfo: LicenseInfo['expiryInfo'];
  hardwareId: string | undefined;
}

export function useLicense(): UseLicenseReturn {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check license status
   */
  const checkLicense = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if running in Electron environment
      if (typeof window === 'undefined' || !window.electron) {
        // Set default unlicensed state for non-Electron environments
        setLicenseInfo({
          isActivated: false,
          isValid: false,
          license: undefined,
          expiryInfo: undefined,
          features: undefined,
          hardwareId: '',
        });
        setIsLoading(false);
        return;
      }

      const response = await window.electron.licenseCheck();

      if (response.success && response.data) {
        
        setLicenseInfo(response.data);
      } else {
        console.error('❌ [useLicense] License check failed:', response.error);
        throw new Error(response.error || 'Failed to check license');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('💥 [useLicense] Error checking license:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get hardware ID
   */
  const getHardwareId = useCallback(async (): Promise<HardwareInfo | null> => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }

      const response = await window.electron.licenseGetHardwareId();

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get hardware ID');
      }
    } catch (err) {
      console.error('Error getting hardware ID:', err);
      return null;
    }
  }, []);

  /**
   * Activate license with license key
   */
  const activateLicense = useCallback(async (licenseKey: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if running in Electron environment
      if (typeof window === 'undefined' || !window.electron) {
        setError('License activation only available in Electron app');
        setIsLoading(false);
        return false;
      }

      // Call the main process to activate the license (main process will perform server verification)
      const response = await window.electron.licenseActivate(licenseKey);

      if (response.success) {
        // Refresh license info after activation
        await checkLicense();
        return true;
      } else {
        console.error('❌ ACTIVATION FAILED');
        console.error('Error Message:', response.message || response.error);
        throw new Error(response.message || response.error || 'Failed to activate license');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('💥 ACTIVATION ERROR CAUGHT');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error Type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('Error Message:', errorMessage);
      console.error('Full Error:', err);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkLicense]);

  /**
   * Verify license online with server
   */
  const verifyOnline = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }

      const response = await window.electron.licenseVerifyOnline();

      if (response.success) {
        // Refresh license info after verification
        await checkLicense();
        return true;
      } else {
        throw new Error(response.message || response.error || 'Failed to verify license');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error verifying license online:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkLicense]);

  /**
   * Deactivate current license
   */
  const deactivateLicense = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }

      const response = await window.electron.licenseDeactivate();

      if (response.success) {
        // Refresh license info to update state and trigger modal
        await checkLicense();
        return true;
      } else {
        throw new Error(response.message || response.error || 'Failed to deactivate license');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('💥 [useLicense] Error deactivating license:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkLicense]);


  /**
   * Check if specific feature is enabled
   */
  const hasFeature = useCallback(async (featureName: string): Promise<boolean> => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }

      const response = await window.electron.licenseHasFeature(featureName);

      if (response.success && response.data !== undefined) {
        return response.data;
      }

      return false;
    } catch (err) {
      console.error('Error checking feature:', err);
      return false;
    }
  }, []);

  /**
   * Get all enabled features
   */
  const getFeatures = useCallback(async (): Promise<LicenseFeatures | null> => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }

      const response = await window.electron.licenseGetFeatures();

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (err) {
      console.error('Error getting features:', err);
      return null;
    }
  }, []);

  /**
   * Check if license is expiring within specified days
   */
  const checkExpiry = useCallback(async (days: number = 30): Promise<{ isExpiring: boolean; daysRemaining: number | null } | null> => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }

      const response = await window.electron.licenseIsExpiring(days);

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (err) {
      console.error('Error checking expiry:', err);
      return null;
    }
  }, []);

  // Check license on mount
  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  // Re-check whenever the main process (or AuthContext) signals that the
  // license was invalidated / deactivated during a startup online verification.
  useEffect(() => {
    const handleInvalidation = () => {
      checkLicense();
    };
    window.addEventListener('license:invalidated', handleInvalidation);
    return () => {
      window.removeEventListener('license:invalidated', handleInvalidation);
    };
  }, [checkLicense]);

  return {
    // State
    licenseInfo,
    isLoading,
    error,
    isValid: licenseInfo?.isValid ?? true,
    isActivated: licenseInfo?.isActivated ?? true,

    // Actions
    checkLicense,
    activateLicense,
    verifyOnline,
    deactivateLicense,
    getHardwareId,
    hasFeature,
    getFeatures,
    checkExpiry,

    // License details
    license: licenseInfo?.license,
    features: licenseInfo?.features,
    expiryInfo: licenseInfo?.expiryInfo,
    hardwareId: licenseInfo?.hardwareId,
  };
}
