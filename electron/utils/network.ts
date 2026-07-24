import { net } from 'electron';
import axios from 'axios';

/**
 * Network utility for checking internet connectivity
 */

/**
 * Check if internet connection is available
 * Uses multiple methods for reliability
 */
export async function isOnline(): Promise<boolean> {
  // Method 1: Electron's net.isOnline() - quick but not always reliable
  if (!net.isOnline()) {
    return false;
  }

  // Method 2: Try to reach a reliable endpoint with a short timeout
  try {
    await axios.get('https://dns.google/resolve?name=google.com&type=A', {
      timeout: 3000, // 3 second timeout
      validateStatus: (status) => status < 500,
    });
    return true;
  } catch (error) {
    // If we can't reach the endpoint, we're likely offline
    return false;
  }
}

/**
 * Check if license server is reachable
 */
export async function isLicenseServerReachable(serverUrl: string): Promise<boolean> {
  try {
    await axios.get(serverUrl, {
      timeout: 5000, // 5 second timeout
      validateStatus: (status) => status < 500,
    });
    return true;
  } catch (error) {
    return false;
  }
}
