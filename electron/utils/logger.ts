import log from 'electron-log';
import path from 'path';
import { app } from 'electron';
import os from 'os';
import fs from 'fs';

// Configure logging
export function setupLogger() {
  const logsDir = path.join(app.getPath('userData'), 'logs');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Configure file transport
  log.transports.file.level = 'debug';
  log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
  log.transports.file.resolvePath = () => path.join(logsDir, 'main.log');
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

  // Configure console transport (only in development)
  if (process.env.NODE_ENV === 'development') {
    log.transports.console.level = 'warn'; // Changed from 'debug' to reduce noise
    log.transports.console.format = '[{level}] {text}';
  } else {
    log.transports.console.level = 'error';
  }

  // Handle uncaught exceptions
  log.catchErrors({
    showDialog: false,
  });

  return log;
}

// Export logger instance
export const logger = log;

// Helper function to get system info
export function getSystemInfo() {
  return {
    os: os.type(),
    osVersion: os.release(),
    arch: os.arch(),
    platform: process.platform,
    nodeVersion: process.version,
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeArch: os.arch(),
  };
}

// Helper function to get log file path
export function getLogFilePath() {
  const logsDir = path.join(app.getPath('userData'), 'logs');
  return path.join(logsDir, 'main.log');
}

// Helper function to read log file
export function readLogFile(lines: number = 500): string {
  try {
    const logPath = getLogFilePath();
    if (!fs.existsSync(logPath)) {
      return 'No log file found';
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    const logLines = content.split('\n');
    
    // Return the last N lines
    return logLines.slice(-lines).join('\n');
  } catch (error) {
    logger.error('Error reading log file:', error);
    return 'Error reading log file';
  }
}

// Helper function to get all logs directory contents
export function getLogsDirectory() {
  const logsDir = path.join(app.getPath('userData'), 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      return [];
    }
    return fs.readdirSync(logsDir);
  } catch (error) {
    logger.error('Error reading logs directory:', error);
    return [];
  }
}
