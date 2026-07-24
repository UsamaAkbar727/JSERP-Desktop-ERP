/**
 * License Management Types
 * Type definitions for license-related functionality
 */

export interface License {
  id?: number;
  license_key: string;
  activation_date: string;
  expiry_date?: string;
  hardware_id: string;
  customer_name: string;
  customer_email: string;
  features?: string;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  verification_response?: string;
  last_verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LicenseFeatures {
  [key: string]: boolean | number | string;
}

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

export interface HardwareInfo {
  hardwareId: string;
  summary: string;
}

// Electron API interface
declare global {
  interface Window {
    electron?: {
      // License management
      licenseCheck: () => Promise<{ success: boolean; data?: LicenseInfo; error?: string }>;
      licenseActivate: (licenseKey: string) => Promise<{ 
        success: boolean; 
        data?: License; 
        message?: string;
        errorCode?: string;
        error?: string;
      }>;
      licenseInfo: () => Promise<{ success: boolean; data?: LicenseInfo; error?: string }>;
      licenseVerifyOnline: () => Promise<{ 
        success: boolean; 
        data?: License; 
        message?: string;
        errorCode?: string;
        error?: string;
      }>;
      licenseDeactivate: () => Promise<{ success: boolean; message?: string; error?: string }>;
      licenseGetHardwareId: () => Promise<{ success: boolean; data?: HardwareInfo; error?: string }>;
      licenseHasFeature: (featureName: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      licenseGetFeatures: () => Promise<{ success: boolean; data?: LicenseFeatures; error?: string }>;
      licenseIsExpiring: (days?: number) => Promise<{ 
        success: boolean; 
        data?: { isExpiring: boolean; daysRemaining: number | null }; 
        error?: string;
      }>;
    };
  }
}

export {};
