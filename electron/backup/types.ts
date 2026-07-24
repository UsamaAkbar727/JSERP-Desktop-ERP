/**
 * Backup Service Types
 * Type definitions for database backup and restore functionality
 */

/**
 * Backup metadata
 */
export interface BackupMetadata {
  id: string;
  filename: string;
  timestamp: number;
  date: string;
  size: number;
  description?: string;
}

/**
 * Backup options
 */
export interface BackupOptions {
  description?: string;
  includeAssets?: boolean;
}

/**
 * Restore options
 */
export interface RestoreOptions {
  backupId: string;
}

/**
 * Backup schedule settings
 */
export interface BackupScheduleSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // Format: HH:mm
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  maxBackups: number; // Keep last N backups
}

/**
 * Backup statistics
 */
export interface BackupStatistics {
  totalBackups: number;
  totalSize: number;
  lastBackup?: {
    timestamp: number;
    size: number;
  };
}
