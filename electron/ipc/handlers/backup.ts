/**
 * Backup IPC Handlers
 * Handles IPC communication for backup and restore operations
 */

import { registerIPCHandler, validators } from '../index';
import { BackupService } from '../../backup/BackupService';
import { BackupScheduler } from '../../backup/BackupScheduler';
import { existsSync, copyFileSync } from 'fs';
import { app, dialog, BrowserWindow } from 'electron';
import { closeDatabase, initializeDatabase, getDatabase } from '../../database';
import type { BackupScheduleSettings } from '../../backup/types';

let backupService: BackupService | null = null;
let backupScheduler: BackupScheduler | null = null;

/**
 * Initialize backup service with database path
 */
export function initializeBackupService(dbPath: string): void {
  backupService = new BackupService(dbPath);
  backupScheduler = new BackupScheduler(backupService);
}

/**
 * Start backup scheduler with initial settings from database
 */
export async function startBackupScheduler(): Promise<void> {
  if (!backupScheduler || !backupService) {
    throw new Error('Backup service not initialized');
  }

  try {
    // Load scheduler settings from database if available
    // For now, use default settings - can be enhanced to load from settings table
    backupScheduler.start();
  } catch (error) {
    console.error('Failed to start backup scheduler:', error);
  }
}

/**
 * Register all backup-related IPC handlers
 */
export function registerBackupHandlers(): void {
  if (!backupService) {
    throw new Error('Backup service not initialized. Call initializeBackupService first.');
  }

  // Create backup
  registerIPCHandler('backup:create', async (event, args) => {
    try {
      const metadata = await backupService!.createBackup({
        description: args?.description,
      });
     
      return metadata;
    } catch (error) {
      console.error('❌ [IPC:backup:create] Error:', error);
      throw error;
    }
  });

  // List backups
  registerIPCHandler('backup:list', async (event, args) => {
    try {
      const backups = await backupService!.listBackups();
      return backups;
    } catch (error) {
      console.error('❌ [IPC:backup:list] Error:', error);
      throw error;
    }
  });

  // Get backup statistics
  registerIPCHandler('backup:stats', async (event, args) => {
    try {
      const stats = await backupService!.getStatistics();
  
      return stats;
    } catch (error) {
      console.error('❌ [IPC:backup:stats] Error:', error);
      throw error;
    }
  });

  // Delete backup
  registerIPCHandler('backup:delete', async (event, args) => {
    try {
      validators.requiredString(args.backupId, 'Backup ID');

      await backupService!.deleteBackup(args.backupId);
    } catch (error) {
      console.error('❌ [IPC:backup:delete] Error:', error);
      throw error;
    }
  });

  // Restore backup (prepare for restore) - MERGE mode
  registerIPCHandler('backup:restore', async (event, args) => {
    try {
      validators.requiredString(args.backupId, 'Backup ID');

      // Step 1: Extract backup to temp location
      const restoredDbPath = await backupService!.restoreBackup({ backupId: args.backupId });

      // Step 2: Get current database connection (DON'T close it)
      const dbManager = getDatabase();
      const currentDb = dbManager.getDatabase();

      if (!currentDb) {
        throw new Error('Database connection not available');
      }

      // Step 3: Merge backup data into current database
      const mergeResult = await backupService!.mergeRestore(restoredDbPath, currentDb);

      return { 
        success: true,
        merged: mergeResult.merged,
        skipped: mergeResult.skipped,
        errors: mergeResult.errors,
        message: `Backup merged successfully! ${mergeResult.merged} records added/updated${mergeResult.skipped > 0 ? `, ${mergeResult.skipped} skipped` : ''}. Please restart the application.`
      };
    } catch (error) {
      console.error('❌ [IPC:backup:restore] Error:', error);
      throw error;
    }
  });

  // Create backup with file dialog
  registerIPCHandler('backup:create-with-dialog', async (event, args) => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      
      if (!mainWindow) {
        throw new Error('No window available to show dialog');
      }

      // Generate default filename with description and date
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      let defaultFilename = `erp-backup-${dateStr}.gz`;
      
      if (args?.description && args.description.trim()) {
        // Sanitize description for filename
        const sanitized = args.description
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
          .substring(0, 50); // Limit length
        
        defaultFilename = `${sanitized}-${dateStr}.gz`;
      }

      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Backup',
        defaultPath: defaultFilename,
        filters: [
          { name: 'Backup Files', extensions: ['gz'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      // User cancelled
      if (result.canceled || !result.filePath) {
        return { cancelled: true };
      }

      // Create backup at selected location
      const metadata = await backupService!.createBackupToFile(result.filePath, {
        description: args?.description,
      });

      return { success: true, metadata };
    } catch (error) {
      console.error('❌ [IPC:backup:create-with-dialog] Error:', error);
      throw error;
    }
  });

  // Restore backup from file dialog (MERGE mode - preserves existing data)
  registerIPCHandler('backup:restore-from-file', async (event, args) => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      
      if (!mainWindow) {
        throw new Error('No window available to show dialog');
      }

      // Show open dialog
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Backup File to Restore',
        filters: [
          { name: 'Backup Files', extensions: ['gz'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      // User cancelled
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { cancelled: true };
      }

      const backupFilePath = result.filePaths[0];

      // Check if file exists
      if (!existsSync(backupFilePath)) {
        throw new Error('Selected backup file does not exist');
      }

      // Step 1: Extract backup to temp location
      const restoredDbPath = await backupService!.restoreBackupFromFile(backupFilePath);

      // Step 2: Get current database connection (DON'T close it)
      const dbManager = getDatabase();
      const currentDb = dbManager.getDatabase();

      if (!currentDb) {
        throw new Error('Database connection not available');
      }

      // Step 3: Merge backup data into current database
      const mergeResult = await backupService!.mergeRestore(restoredDbPath, currentDb);

      return { 
        success: true,
        merged: mergeResult.merged,
        skipped: mergeResult.skipped,
        errors: mergeResult.errors,
        message: `Backup merged successfully! ${mergeResult.merged} records added/updated${mergeResult.skipped > 0 ? `, ${mergeResult.skipped} skipped` : ''}. Please restart the application.`
      };
    } catch (error) {
      console.error('❌ [IPC:backup:restore-from-file] Error:', error);
      throw error;
    }
  });

  // Cleanup old backups
  registerIPCHandler('backup:cleanup', async (event, args) => {
    try {
      const maxBackups = args?.maxBackups || 10;
      validators.requiredNumber(maxBackups, 'Max Backups');

      await backupService!.cleanupOldBackups(maxBackups);
    } catch (error) {
      console.error('❌ [IPC:backup:cleanup] Error:', error);
      throw error;
    }
  });

  // Cleanup restore temp files
  registerIPCHandler('backup:cleanup-restore', async (event, args) => {
    try {
      await backupService!.cleanupRestoreTemp();
    } catch (error) {
      console.error('❌ [IPC:backup:cleanup-restore] Error:', error);
      throw error;
    }
  });

  // Backup Scheduler Handlers
  registerIPCHandler('backup:scheduler-status', async (event, args) => {
    try {
      if (!backupScheduler) {
        throw new Error('Backup scheduler not initialized');
      }
      const status = backupScheduler.getStatus();
      return status;
    } catch (error) {
      console.error('❌ [IPC:backup:scheduler-status] Error:', error);
      throw error;
    }
  });

  registerIPCHandler('backup:scheduler-update', async (event, args) => {
    try {
      if (!backupScheduler) {
        throw new Error('Backup scheduler not initialized');
      }

      const settings: Partial<BackupScheduleSettings> = {
        enabled: args.enabled,
        frequency: args.frequency,
        time: args.time,
        dayOfWeek: args.dayOfWeek,
        dayOfMonth: args.dayOfMonth,
        maxBackups: args.maxBackups,
      };

      backupScheduler.updateSettings(settings);

      return backupScheduler.getStatus();
    } catch (error) {
      console.error('❌ [IPC:backup:scheduler-update] Error:', error);
      throw error;
    }
  });

  registerIPCHandler('backup:scheduler-test', async (event, args) => {
    try {
      if (!backupScheduler) {
        throw new Error('Backup scheduler not initialized');
      }

      await backupScheduler.test();
    } catch (error) {
      console.error('❌ [IPC:backup:scheduler-test] Error:', error);
      throw error;
    }
  });

  // Restart application
  registerIPCHandler('app:restart', async (event, args) => {
    try {
      app.relaunch();
      app.exit(0);
    } catch (error) {
      console.error('❌ [IPC:app:restart] Error:', error);
      throw error;
    }
  });
}

/**
 * Get the backup service instance
 */
export function getBackupService(): BackupService {
  if (!backupService) {
    throw new Error('Backup service not initialized');
  }
  return backupService;
}

/**
 * Get the backup scheduler instance
 */
export function getBackupScheduler(): BackupScheduler {
  if (!backupScheduler) {
    throw new Error('Backup scheduler not initialized');
  }
  return backupScheduler;
}
