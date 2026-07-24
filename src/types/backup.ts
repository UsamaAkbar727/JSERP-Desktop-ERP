/**
 * Backup Types
 * Type definitions for backup functionality
 */

export interface BackupMetadata {
  id: string;
  filename: string;
  timestamp: number;
  date: string;
  size: number;
  description?: string;
}

export interface BackupStatistics {
  totalBackups: number;
  totalSize: number;
  lastBackup?: {
    timestamp: number;
    size: number;
  };
}

export interface BackupOptions {
  description?: string;
  includeAssets?: boolean;
}

export interface RestoreOptions {
  backupId: string;
}

export interface BackupScheduleSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // Format: HH:mm
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  maxBackups: number; // Keep last N backups
}
