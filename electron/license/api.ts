import axios, { AxiosError } from 'axios';

/**
 * License API Client
 * Handles communication with external license verification server
 */

// Configure your license server URL here
const LICENSE_API_URL = process.env.LICENSE_API_URL || 'https://jserp.jahasoft.com/api';
const API_TIMEOUT = 30000; // 30 seconds

export interface LicenseVerificationRequest {
  licenseKey: string;
  hardwareId: string;
  appVersion?: string;
  customerEmail?: string;
}

export interface LicenseVerificationResponse {
  success: boolean;
  message: string;
  license?: {
    licenseKey: string;
    customerName: string;
    customerEmail: string;
    activationDate: string;
    expiryDate?: string;
    features?: string[];
    maxActivations?: number;
    currentActivations?: number;
    status: 'active' | 'expired' | 'revoked' | 'suspended';
  };
  error?: string;
  errorCode?: string;
}

export interface LicenseDeactivationRequest {
  licenseKey: string;
  hardwareId: string;
}

export interface LicenseDeactivationResponse {
  success: boolean;
  message: string;
}

/**
 * Verify license key with remote server
 */
export async function verifyLicense(
  request: LicenseVerificationRequest
): Promise<LicenseVerificationResponse> {
  try {
    // Map to new API format: systemId instead of hardwareId
    const requestBody = {
      licenseKey: request.licenseKey,
      systemId: request.hardwareId,
    };

   

    const response = await axios.post<any>(
      `${LICENSE_API_URL}/verify.php`,
      requestBody,
      {
        timeout: API_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
  
    
    // Transform API response to expected format
    // The API returns { "success": true, "message": "...", "data": {...} }
    if (response.data?.success === true) {
      const licenseData = response.data.data || {};
      return {
        success: true,
        message: response.data.message || 'License verified successfully',
        license: {
          licenseKey: licenseData.license_key || request.licenseKey,
          customerName: request.customerEmail?.split('@')[0] || 'Customer',
          customerEmail: request.customerEmail || 'customer@example.com',
          activationDate: licenseData.created_at || new Date().toISOString(),
          expiryDate: undefined, // Perpetual license
          features: ['pos', 'inventory', 'accounting', 'reports'],
          maxActivations: 1,
          currentActivations: 1,
          status: 'active',
        },
      };
    } else {
    
      return {
        success: false,
        message: response.data?.message || 'License verification failed',
        errorCode: 'VERIFICATION_FAILED',
      };
    }
  } catch (error) {
   
    if (axios.isAxiosError(error)) {
      console.error('- Status:', error.response?.status);
     
    }
    return handleApiError(error, 'License verification failed');
  }
}

/**
 * Activate license using verify.php endpoint
 * This function attempts to verify the license with the server
 * If successful, it means the license is valid and can be activated locally
 */
export async function activateLicense(
  request: LicenseVerificationRequest
): Promise<LicenseVerificationResponse> {
  try {
    // Use verify.php endpoint for activation as requested
    const requestBody = {
      licenseKey: request.licenseKey,
      systemId: request.hardwareId,
    };

  

    const response = await axios.post<any>(
      `${LICENSE_API_URL}/verify.php`,
      requestBody,
      {
        timeout: API_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );


    // Check for success response as specified in requirements
    if (response.data?.success === true) {
      const licenseData = response.data.data || {};
      return {
        success: true,
        message: response.data.message || 'License activated successfully',
        license: {
          licenseKey: licenseData.license_key || request.licenseKey,
          customerName: request.customerEmail?.split('@')[0] || 'Customer',
          customerEmail: request.customerEmail || 'customer@example.com',
          activationDate: licenseData.created_at || new Date().toISOString(),
          expiryDate: licenseData.expiry_date || undefined,
          features: ['pos', 'inventory', 'accounting', 'reports'], // All features enabled
          maxActivations: 1,
          currentActivations: 1,
          status: 'active',
        },
      };
    } else {
      // Invalid license - ignore as requested
     
      return {
        success: false,
        message: response.data?.message || 'Invalid license or system ID',
        errorCode: 'INVALID_LICENSE',
      };
    }
  } catch (error) {
  
    if (axios.isAxiosError(error)) {
      console.error('- Status:', error.response?.status);
     
    } else {
      console.error('🔴 Non-Axios Error:', error);
    }
    
    return handleApiError(error, 'License activation failed');
  }
}

/**
 * Deactivate license (unbind from hardware)
 */
export async function deactivateLicense(
  request: LicenseDeactivationRequest
): Promise<LicenseDeactivationResponse> {
  try {

    const response = await axios.post<LicenseDeactivationResponse>(
      `${LICENSE_API_URL}/deactivate-license`,
      request,
      {
        timeout: API_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    return handleApiError(error, 'License deactivation failed');
  }
}

/**
 * Check license status with server
 */
export async function checkLicenseStatus(
  licenseKey: string,
  hardwareId: string
): Promise<LicenseVerificationResponse> {
  try {

    const response = await axios.get<LicenseVerificationResponse>(
      `${LICENSE_API_URL}/status`,
      {
        params: { licenseKey, hardwareId },
        timeout: API_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    return handleApiError(error, 'License status check failed');
  }
}

/**
 * Handle API errors gracefully
 */
function handleApiError(error: unknown, defaultMessage: string): LicenseVerificationResponse {
  
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;


    // Network error (no internet, server down, etc.)
    if (!axiosError.response) {
      
      if (axiosError.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'License verification timed out. Please check your internet connection.',
          errorCode: 'TIMEOUT',
        };
      }
      
      // Network errors should not invalidate licenses
      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENETUNREACH') {
        return {
          success: false,
          message: 'Cannot connect to license server. Your license remains valid for offline use.',
          errorCode: 'NETWORK_ERROR',
        };
      }

      return {
        success: false,
        message: `Unable to connect to license server. Your license remains valid for offline use.`,
        errorCode: 'NETWORK_ERROR',
      };
    }

    // Server returned an error response
    const status = axiosError.response.status;
    const serverMessage = axiosError.response.data?.message || axiosError.response.data?.error;

    if (status === 400) {
      return {
        success: false,
        message: serverMessage || 'Invalid license key or request data.',
        errorCode: 'INVALID_REQUEST',
      };
    }

    if (status === 401 || status === 403) {
      return {
        success: false,
        message: serverMessage || 'License key is invalid or unauthorized.',
        errorCode: 'UNAUTHORIZED',
      };
    }

    if (status === 404) {
      return {
        success: false,
        message: serverMessage || 'Invalid license or system ID',
        errorCode: 'NOT_FOUND',
      };
    }

    if (status === 429) {
      return {
        success: false,
        message: 'Too many requests. Please try again later.',
        errorCode: 'RATE_LIMIT',
      };
    }

    if (status >= 500) {
      return {
        success: false,
        message: 'License server error. Your license remains valid for offline use.',
        errorCode: 'SERVER_ERROR',
      };
    }

    return {
      success: false,
      message: serverMessage || defaultMessage,
      errorCode: 'API_ERROR',
    };
  }

  // Unknown error

  console.error('License API error:', error);
  
  return {
    success: false,
    message: `${defaultMessage}. Your license remains valid for offline use.`,
    error: error instanceof Error ? error.message : 'Unknown error',
    errorCode: 'UNKNOWN_ERROR',
  };
}

/**
 * Test connection to license server
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await axios.get(`${LICENSE_API_URL}/health`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    console.error('License server connection test failed:', error);
    return false;
  }
}
