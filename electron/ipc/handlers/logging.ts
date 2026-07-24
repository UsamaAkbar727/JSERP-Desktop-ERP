import { ipcMain } from 'electron';
import { logger, getLogFilePath, readLogFile, getSystemInfo } from '../../utils/logger';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export function registerLoggingHandlers() {
  // Get system information
  ipcMain.handle('system:info', async () => {
    try {
      logger.debug('System info requested');
      return getSystemInfo();
    } catch (error) {
      logger.error('Failed to get system info:', error);
      throw error;
    }
  });

  // Get application logs
  ipcMain.handle('logs:get', async (_, lines: number = 500) => {
    try {
      logger.debug(`Logs requested: ${lines} lines`);
      return readLogFile(lines);
    } catch (error) {
      logger.error('Failed to get logs:', error);
      throw error;
    }
  });

  // Get all logs as array
  ipcMain.handle('logs:list', async () => {
    try {
      logger.debug('Logs list requested');
      const logsDir = path.join(app.getPath('userData'), 'logs');
      
      if (!fs.existsSync(logsDir)) {
        return [];
      }

      const files = fs.readdirSync(logsDir);
      return files.map((file) => ({
        name: file,
        path: path.join(logsDir, file),
        size: fs.statSync(path.join(logsDir, file)).size,
        modified: fs.statSync(path.join(logsDir, file)).mtime,
      }));
    } catch (error) {
      logger.error('Failed to list logs:', error);
      throw error;
    }
  });

  // Clear logs
  ipcMain.handle('logs:clear', async () => {
    try {
      logger.warn('Logs clear requested');
      const logPath = getLogFilePath();
      
      if (fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '');
        logger.info('Logs cleared');
        return { success: true };
      }
      
      return { success: false, message: 'Log file not found' };
    } catch (error) {
      logger.error('Failed to clear logs:', error);
      throw error;
    }
  });

  // Log message from renderer
  ipcMain.on('logger:log', (_, { level, message, data }) => {
    if (level === 'debug') logger.debug(message, data);
    else if (level === 'info') logger.info(message, data);
    else if (level === 'warn') logger.warn(message, data);
    else if (level === 'error') logger.error(message, data);
  });

  // Handle error from error boundary
  ipcMain.on('error:boundary', (_, errorData) => {
    logger.error('React Error Boundary caught error', {
      errorId: errorData.errorId,
      message: errorData.message,
      stack: errorData.stack,
      componentStack: errorData.componentStack,
      timestamp: errorData.timestamp,
    });
  });

  // Submit issue report
  ipcMain.handle('issue:submit', async (_, reportData) => {
    try {
      const submissionId = `ISSUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const reportsDir = path.join(app.getPath('userData'), 'reports');

      // Ensure reports directory exists
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Create report file
      const reportFile = path.join(reportsDir, `${submissionId}.json`);
      const reportContent = {
        submissionId,
        timestamp: reportData.timestamp,
        appVersion: getSystemInfo().appVersion,
        errorId: reportData.errorId,
        summary: reportData.summary,
        description: reportData.description,
        steps: reportData.steps,
        logs: reportData.logs,
        systemInfo: reportData.systemInfo,
      };

      fs.writeFileSync(reportFile, JSON.stringify(reportContent, null, 2));

      logger.info('Issue report submitted', {
        submissionId,
        summary: reportData.summary,
        errorId: reportData.errorId,
      });

      return { success: true, submissionId };
    } catch (error) {
      logger.error('Failed to submit issue report:', error);
      throw error;
    }
  });

  // Get reports directory
  ipcMain.handle('reports:list', async () => {
    try {
      logger.debug('Reports list requested');
      const reportsDir = path.join(app.getPath('userData'), 'reports');

      if (!fs.existsSync(reportsDir)) {
        return [];
      }

      const files = fs.readdirSync(reportsDir);
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => {
          const filePath = path.join(reportsDir, file);
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            id: path.basename(file, '.json'),
            ...content,
            size: fs.statSync(filePath).size,
            modified: fs.statSync(filePath).mtime,
          };
        });
    } catch (error) {
      logger.error('Failed to list reports:', error);
      throw error;
    }
  });

  // Export report
  ipcMain.handle('reports:export', async (_, submissionId: string) => {
    try {
      const reportsDir = path.join(app.getPath('userData'), 'reports');
      const reportFile = path.join(reportsDir, `${submissionId}.json`);

      if (!fs.existsSync(reportFile)) {
        throw new Error('Report not found');
      }

      logger.debug('Report exported:', submissionId);
      return fs.readFileSync(reportFile, 'utf-8');
    } catch (error) {
      logger.error('Failed to export report:', error);
      throw error;
    }
  });

  logger.debug('Logging handlers registered');
}
