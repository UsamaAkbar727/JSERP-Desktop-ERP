import { execSync } from 'child_process';
import * as os from 'os';
import * as crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

/**
 * Hardware Fingerprint Generator
 * Generates a unique hardware ID based on system characteristics
 */

interface HardwareInfo {
  machineId: string;
  macAddress: string;
  cpuId: string;
  diskSerial: string;
  hostname: string;
  platform: string;
}

/**
 * Get unique machine ID using node-machine-id
 */
function getMachineId(): string {
  try {
    return machineIdSync(true); // true = original machine id
  } catch (error) {
    console.error('Error getting machine ID:', error);
    return 'unknown-machine-id';
  }
}

/**
 * Get MAC address of the first network interface
 */
function getMacAddress(): string {
  try {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      if (interfaces) {
        for (const iface of interfaces) {
          // Skip internal/loopback addresses
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            return iface.mac;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error getting MAC address:', error);
  }
  return 'unknown-mac';
}

/**
 * Get CPU ID based on platform
 */
function getCpuId(): string {
  try {
    const platform = os.platform();
    let cpuId = '';

    if (platform === 'win32') {
      // Windows: Use CPU model as fallback (WMIC deprecated)
      const cpus = os.cpus();
      if (cpus && cpus.length > 0) {
        cpuId = cpus[0].model + '-' + cpus.length;
      }
    } else if (platform === 'linux') {
      // Linux: Use CPU serial from /proc/cpuinfo
      const cpuInfo = execSync('cat /proc/cpuinfo | grep "Serial" | head -n1', { encoding: 'utf8' });
      cpuId = cpuInfo.split(':')[1]?.trim() || '';
      
      // If no serial, try model name
      if (!cpuId) {
        const modelInfo = execSync('cat /proc/cpuinfo | grep "model name" | head -n1', { encoding: 'utf8' });
        cpuId = modelInfo.split(':')[1]?.trim() || '';
      }
    } else if (platform === 'darwin') {
      // macOS: Use IOPlatformSerialNumber
      cpuId = execSync('ioreg -l | grep IOPlatformSerialNumber | awk \'{print $4}\' | sed s/\\"//g', { encoding: 'utf8' })
        .trim();
    }

    return cpuId || os.cpus()[0]?.model || 'unknown-cpu';
  } catch (error) {
    console.error('Error getting CPU ID:', error);
    // Fallback to CPU model
    return os.cpus()[0]?.model || 'unknown-cpu';
  }
}

/**
 * Get disk serial number based on platform
 */
function getDiskSerial(): string {
  try {
    const platform = os.platform();
    let diskSerial = '';

    if (platform === 'win32') {
      // Windows: Use hostname + platform as fallback (WMIC deprecated)
      diskSerial = os.hostname() + '-' + os.platform() + '-' + os.arch();
    } else if (platform === 'linux') {
      // Linux: Try to get disk serial from /dev/sda
      diskSerial = execSync('udevadm info --query=all --name=/dev/sda | grep ID_SERIAL_SHORT | cut -d= -f2', { encoding: 'utf8' })
        .trim();
    } else if (platform === 'darwin') {
      // macOS: Use diskutil
      diskSerial = execSync('diskutil info / | grep "Volume UUID" | awk \'{print $3}\'', { encoding: 'utf8' })
        .trim();
    }

    return diskSerial || 'unknown-disk';
  } catch (error) {
    console.error('Error getting disk serial:', error);
    return 'unknown-disk';
  }
}

/**
 * Collect all hardware information
 */
export function getHardwareInfo(): HardwareInfo {
  return {
    machineId: getMachineId(),
    macAddress: getMacAddress(),
    cpuId: getCpuId(),
    diskSerial: getDiskSerial(),
    hostname: os.hostname(),
    platform: os.platform(),
  };
}

/**
 * Generate a unique hardware fingerprint
 * Creates a deterministic hash from hardware components
 */
export function generateHardwareFingerprint(): string {
  const hwInfo = getHardwareInfo();
  
  // Combine hardware info into a single string (prioritize machine ID)
  const combinedInfo = [
    hwInfo.machineId,
    hwInfo.macAddress,
    hwInfo.cpuId,
    hwInfo.diskSerial,
    hwInfo.hostname,
    hwInfo.platform,
  ].join('|');

  // Create SHA256 hash
  const hash = crypto
    .createHash('sha256')
    .update(combinedInfo)
    .digest('hex');

  // Return first 32 characters for brevity
  return hash.substring(0, 32).toUpperCase();
}

/**
 * Verify if a hardware fingerprint matches the current system
 */
export function verifyHardwareFingerprint(storedFingerprint: string): boolean {
  const currentFingerprint = generateHardwareFingerprint();
  return currentFingerprint === storedFingerprint;
}

/**
 * Get a human-readable hardware summary
 */
export function getHardwareSummary(): string {
  const hwInfo = getHardwareInfo();
  return `Platform: ${hwInfo.platform}, Hostname: ${hwInfo.hostname}, MAC: ${hwInfo.macAddress.substring(0, 8)}...`;
}
