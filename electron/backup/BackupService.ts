/**
 * Backup Service
 * Handles database backup, restore, and management
 */

import { createWriteStream, createReadStream, existsSync, mkdirSync, statSync, readdirSync, unlinkSync, rmSync, copyFileSync, writeFileSync, readFileSync } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { join, basename, dirname } from 'path';
import { app } from 'electron';
import type { BackupMetadata, BackupOptions, RestoreOptions, BackupScheduleSettings, BackupStatistics } from './types';

export class BackupService {
  private backupDir: string;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;

    // Setup backup directory
    const userDataPath = app.getPath('userData');
    this.backupDir = join(userDataPath, 'backups');

    // Create backup directory if it doesn't exist
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }

  }

  /**
   * Sanitize description for use in filename
   */
  private sanitizeFilename(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  /**
   * Generate backup filename with description and date
   */
  private generateBackupFilename(description?: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const dateObj = new Date(ts);
    const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

    if (description && description.trim()) {
      const sanitized = this.sanitizeFilename(description.trim());
      return `${sanitized}-${dateStr}`;
    }

    return `backup-${dateStr}`;
  }

  /**
   * Create a backup of the database
   */
  public async createBackup(options?: BackupOptions): Promise<BackupMetadata> {
    try {

      const timestamp = Date.now();
      const date = new Date(timestamp).toISOString();
      
      // Generate filename with description and date
      const backupId = this.generateBackupFilename(options?.description, timestamp);
      const backupPath = join(this.backupDir, `${backupId}.gz`);

      // Check if database file exists
      if (!existsSync(this.dbPath)) {
        throw new Error('Database file does not exist');
      }

      // CRITICAL: Checkpoint the database to merge WAL file into main database
      // This ensures all recent changes are written to the main .db file
      // Without this, only old data gets backed up (WAL file is not copied)
      try {
        const Database = require('better-sqlite3');
        const db = new Database(this.dbPath);
        db.pragma('wal_checkpoint(TRUNCATE)');
        db.close();
        console.log('✅ Database checkpointed before backup');
      } catch (checkpointError) {
        console.warn('⚠️  Could not checkpoint database before backup:', checkpointError);
        // Continue anyway - backup might still have some data
      }

      // Create gzip compressed copy of database file
      await pipeline(
        createReadStream(this.dbPath),
        createGzip(),
        createWriteStream(backupPath)
      );

      // Get file size
      const stats = statSync(backupPath);
      const size = stats.size;

      const metadata: BackupMetadata = {
        id: backupId,
        filename: basename(backupPath),
        timestamp,
        date,
        size,
        description: options?.description,
      };

      // Save metadata to JSON file for persistence
      const metadataPath = join(this.backupDir, `${backupId}.json`);
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

      console.log(`✅ Backup created successfully: ${backupPath} (${(size / 1024).toFixed(2)} KB)`);

      return metadata;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a backup to a user-specified file path
   */
  public async createBackupToFile(filePath: string, options?: BackupOptions): Promise<BackupMetadata> {
    try {
      const timestamp = Date.now();
      const date = new Date(timestamp).toISOString();

      // Check if database file exists
      if (!existsSync(this.dbPath)) {
        throw new Error('Database file does not exist');
      }

      // Ensure directory exists
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Add .gz extension if not present
      if (!filePath.endsWith('.gz')) {
        filePath = `${filePath}.gz`;
      }

      // CRITICAL: Checkpoint the database to merge WAL file into main database
      try {
        const Database = require('better-sqlite3');
        const db = new Database(this.dbPath);
        db.pragma('wal_checkpoint(TRUNCATE)');
        db.close();
        console.log('✅ Database checkpointed before backup');
      } catch (checkpointError) {
        console.warn('⚠️  Could not checkpoint database before backup:', checkpointError);
      }

      // Create gzip compressed copy of database file
      await pipeline(
        createReadStream(this.dbPath),
        createGzip(),
        createWriteStream(filePath)
      );

      // Get file size
      const stats = statSync(filePath);
      const size = stats.size;

      const metadata: BackupMetadata = {
        id: basename(filePath, '.gz'),
        filename: basename(filePath),
        timestamp,
        date,
        size,
        description: options?.description,
      };

      return metadata;
    } catch (error) {
      console.error('❌ Backup to file failed:', error);
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore database from backup (Step 1: Extract to temp location)
   */
  public async restoreBackup(options: RestoreOptions): Promise<string> {
    try {

      const backupPath = join(this.backupDir, `${options.backupId}.gz`);

      if (!existsSync(backupPath)) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }

      // Create temp directory for extracted files
      const tempDir = join(this.backupDir, '.restore-temp');
      if (existsSync(tempDir)) {
        // Clean up old temp dir
        this.deleteRecursive(tempDir);
      }
      mkdirSync(tempDir, { recursive: true });

      // Extract gzipped backup to temp location
      const restoredDbPath = join(tempDir, basename(this.dbPath));
      
      await pipeline(
        createReadStream(backupPath),
        createGunzip(),
        createWriteStream(restoredDbPath)
      );

      if (!existsSync(restoredDbPath)) {
        throw new Error('Failed to extract database file from backup');
      }


      return restoredDbPath;
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore database from a user-specified backup file
   */
  public async restoreBackupFromFile(backupFilePath: string): Promise<string> {
    try {
      if (!existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFilePath}`);
      }

      // Create temp directory for extracted files
      const tempDir = join(this.backupDir, '.restore-temp');
      if (existsSync(tempDir)) {
        // Clean up old temp dir
        this.deleteRecursive(tempDir);
      }
      mkdirSync(tempDir, { recursive: true });

      // Extract gzipped backup to temp location
      const restoredDbPath = join(tempDir, basename(this.dbPath));
      
      await pipeline(
        createReadStream(backupFilePath),
        createGunzip(),
        createWriteStream(restoredDbPath)
      );

      if (!existsSync(restoredDbPath)) {
        throw new Error('Failed to extract database file from backup');
      }

      return restoredDbPath;
    } catch (error) {
      console.error('❌ Restore from file failed:', error);
      throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Merge restore data from backup into current database
   * This preserves existing data and adds data from backup
   */
  public async mergeRestore(restoredDbPath: string, currentDb: any): Promise<{ merged: number; skipped: number; errors: string[] }> {
    try {
      if (!existsSync(restoredDbPath)) {
        throw new Error('Restored database file not found');
      }

      // Import better-sqlite3 dynamically
      const Database = require('better-sqlite3');
      
      // Open backup database
      const backupDb = new Database(restoredDbPath, { readonly: true });

      // Get all user tables from backup database (dynamically)
      const allTablesInBackup = backupDb.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        AND name != '_metadata'
        ORDER BY name
      `).all().map((row: any) => row.name);

      // Define dependency order for common tables (rest will be added after)
      const orderedTables = [
        'users',
        'settings',
        'accounts',
        'customers',
        'suppliers',
        'units',
        'expense_categories',
        'items',
        'sales',
        'sale_items',
        'purchases',
        'purchase_items',
        'payments',
        'expenses',
        'transactions',
        'riders',
        'goods_tasks',
        'goods_task_items',
        'audit_log',
        'licenses',
        'license'
      ];

      // Add any remaining tables from backup that aren't in ordered list
      const remainingTables = allTablesInBackup.filter((t: string) => !orderedTables.includes(t));
      const tablesToMerge = [...orderedTables.filter((t: string) => allTablesInBackup.includes(t)), ...remainingTables];

      let totalMerged = 0;
      let totalSkipped = 0;
      const errors: string[] = [];
      const tableResults: any[] = [];
      const skippedTables: any[] = [];

      // Create safety backup before merge
      if (existsSync(this.dbPath)) {
        const safetyBackupPath = `${this.dbPath}.pre-merge.bak`;
        copyFileSync(this.dbPath, safetyBackupPath);
      }

      // Temporarily disable foreign key constraints for merge
      currentDb.exec('PRAGMA foreign_keys = OFF');
      
      // Verify PRAGMA was applied
      const fkStatus = currentDb.pragma('foreign_keys', { simple: true });
      console.log(`🔧 Foreign Keys status: ${fkStatus} (0 = disabled for merge)`);

      // Start transaction for atomic merge
      currentDb.exec('BEGIN TRANSACTION');

      try {
        for (const tableName of tablesToMerge) {
          try {
            // Check if table exists in backup
            const tableExists = backupDb.prepare(
              `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
            ).get(tableName);

            if (!tableExists) {
              skippedTables.push({ table: tableName, reason: 'Not found in backup file' });
              continue;
            }

            // Check if table exists in current database
            const currentTableExists = currentDb.prepare(
              `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
            ).get(tableName);

            if (!currentTableExists) {
              skippedTables.push({ table: tableName, reason: 'Not found in current database' });
              continue;
            }

            // Get all rows from backup table
            const rows = backupDb.prepare(`SELECT * FROM ${tableName}`).all();

            if (rows.length === 0) {
              skippedTables.push({ table: tableName, reason: 'Empty in backup (0 rows)' });
              continue;
            }

            // Get column names
            const columns = Object.keys(rows[0]);
            const columnList = columns.join(', ');
            const placeholders = columns.map(() => '?').join(', ');

            // Special handling for accounts table to prevent duplicates
            let insertStmt;
            if (tableName === 'accounts') {
              // For accounts, use UPSERT with conflict resolution on both id AND account_name
              // This prevents duplicate Cash accounts with different IDs
              insertStmt = currentDb.prepare(
                `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})
                 ON CONFLICT(id) DO UPDATE SET
                   current_balance = excluded.current_balance,
                   opening_balance = excluded.opening_balance,
                   account_number = excluded.account_number,
                   bank_name = excluded.bank_name,
                   description = excluded.description,
                   status = excluded.status,
                   updated_at = CURRENT_TIMESTAMP`
              );
            } else {
              // Use INSERT OR REPLACE for other tables
              insertStmt = currentDb.prepare(
                `INSERT OR REPLACE INTO ${tableName} (${columnList}) VALUES (${placeholders})`
              );
            }

            let merged = 0;
            let skipped = 0;
            const rowErrors: string[] = [];
            const duplicateAccounts: string[] = [];

            for (const row of rows) {
              try {
                // For accounts table, check for duplicate account_name before insert
                if (tableName === 'accounts') {
                  const existingAccount = currentDb.prepare(
                    'SELECT id, account_name FROM accounts WHERE account_name = ? AND id != ?'
                  ).get(row.account_name, row.id);
                  
                  if (existingAccount) {
                    // Duplicate account name exists with different ID - skip to avoid conflict
                    skipped++;
                    duplicateAccounts.push(`${row.account_name} (backup ID: ${row.id}, existing ID: ${existingAccount.id})`);
                    continue;
                  }
                }
                
                const values = columns.map(col => row[col]);
                insertStmt.run(...values);
                merged++;
              } catch (rowError: any) {
                skipped++;
                if (rowErrors.length < 3) { // Store first 3 errors only
                  rowErrors.push(rowError.message);
                }
              }
            }

            totalMerged += merged;
            totalSkipped += skipped;

            // Add duplicate info to results for accounts table
            const resultEntry: any = {
              table: tableName, 
              merged, 
              skipped, 
              total: rows.length,
              errors: rowErrors
            };
            
            if (tableName === 'accounts' && duplicateAccounts.length > 0) {
              resultEntry.duplicates = duplicateAccounts;
            }
            
            tableResults.push(resultEntry);
          } catch (tableError: any) {
            errors.push(`${tableName}: ${tableError.message}`);
            skippedTables.push({ table: tableName, reason: `Error: ${tableError.message}` });
          }
        }

        // Commit transaction
        currentDb.exec('COMMIT');
        
        // Re-enable foreign key constraints
        currentDb.exec('PRAGMA foreign_keys = ON');
        
        // Verify PRAGMA was re-enabled
        const fkStatusAfter = currentDb.pragma('foreign_keys', { simple: true });
        console.log(`🔧 Foreign Keys re-enabled: ${fkStatusAfter} (1 = enabled)`);
      } catch (transactionError) {
        // Rollback on error
        currentDb.exec('ROLLBACK');
        
        // Re-enable foreign key constraints even on error
        currentDb.exec('PRAGMA foreign_keys = ON');
        console.log(`🔧 Foreign Keys re-enabled after error`);
        
        throw transactionError;
      }

      // Close backup database
      backupDb.close();

      // Clean up temp files
      await this.cleanupRestoreTemp();

      // SINGLE COMPREHENSIVE DEBUG LOG
      console.log('\n' + '='.repeat(80));
      console.log('📊 BACKUP MERGE RESTORE - DETAILED RESULT');
      console.log('='.repeat(80));
      console.log(`📁 Backup file: ${restoredDbPath}`);
      console.log(`📋 Tables found in backup: ${allTablesInBackup.length}`);
      console.log(`   ${allTablesInBackup.join(', ')}`);
      console.log(`\n✅ Total Records Merged: ${totalMerged}`);
      console.log(`⚠️  Total Records Skipped: ${totalSkipped}`);
      console.log(`❌ Errors: ${errors.length}`);
      
      console.log('\n📋 SUCCESSFULLY MERGED TABLES:');
      if (tableResults.length > 0) {
        tableResults.forEach(r => {
          console.log(`   ✅ ${r.table}: ${r.merged} merged, ${r.skipped} skipped (${r.total} total in backup)`);
          if (r.errors && r.errors.length > 0) {
            console.log(`      ⚠️  Sample errors: ${r.errors.join(', ')}`);
          }
          if (r.duplicates && r.duplicates.length > 0) {
            console.log(`      🔄 Duplicate accounts skipped: ${r.duplicates.join(', ')}`);
          }
        });
      } else {
        console.log('   ⚠️  No tables were successfully merged!');
      }
      
      console.log('\n⏭️  SKIPPED TABLES:');
      if (skippedTables.length > 0) {
        skippedTables.forEach(r => {
          console.log(`   ⏭️  ${r.table}: ${r.reason}`);
        });
      } else {
        console.log('   ✅ No tables were skipped');
      }
      
      if (errors.length > 0) {
        console.log('\n❌ ERROR DETAILS:');
        errors.forEach(e => console.log(`   - ${e}`));
      }
      
      console.log('\n💡 ANALYSIS:');
      console.log(`   - Tables in backup file: ${allTablesInBackup.length}`);
      console.log(`   - Tables in merge list: ${tablesToMerge.length}`);
      console.log(`   - Successfully processed: ${tableResults.length}`);
      console.log(`   - Skipped: ${skippedTables.length}`);
      console.log(`   - Failed with errors: ${errors.length}`);
      
      // Show helpful note if many tables were empty
      const emptyTables = skippedTables.filter(t => t.reason.includes('Empty'));
      if (emptyTables.length > 0) {
        console.log('\n📌 NOTE:');
        console.log(`   ${emptyTables.length} tables were empty in the backup file.`);
        console.log(`   This means the backup was created when these tables had no data.`);
        console.log(`   To restore data for these tables, create a new backup from a database that contains the data.`);
      }
      
      console.log('='.repeat(80) + '\n');

      return {
        merged: totalMerged,
        skipped: totalSkipped,
        errors
      };
    } catch (error) {
      console.error('❌ Merge restore failed:', error);
      throw new Error(`Failed to merge restore: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Complete restore by replacing the current database file
   * WARNING: Database connection must be closed before calling this
   * NOTE: This completely replaces the database. Use mergeRestore() to preserve existing data.
   */
  public async completeRestore(restoredDbPath: string): Promise<void> {
    try {
     

      if (!existsSync(restoredDbPath)) {
        throw new Error('Restored database file not found');
      }

      // Create backup of current database before replacing (safety)
      if (existsSync(this.dbPath)) {
        const safetyBackupPath = `${this.dbPath}.pre-restore.bak`;
        copyFileSync(this.dbPath, safetyBackupPath);
      }

      // Replace database file
      copyFileSync(restoredDbPath, this.dbPath);

      // Clean up temp files
      await this.cleanupRestoreTemp();
    } catch (error) {
      console.error('❌ Complete restore failed:', error);
      throw new Error(`Failed to complete restore: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all available backups
   */
  public async listBackups(): Promise<BackupMetadata[]> {
    try {
      if (!existsSync(this.backupDir)) {
        return [];
      }

      const files = readdirSync(this.backupDir).filter(
        (file) => file.endsWith('.gz') && !file.startsWith('.')
      );

      const backups = files
        .map((filename): BackupMetadata | null => {
          try {
            const filePath = join(this.backupDir, filename);
            const stats = statSync(filePath);
            const backupId = basename(filename, '.gz');

            // Try to read metadata from JSON file (preferred method)
            const metadataPath = join(this.backupDir, `${backupId}.json`);
            
            if (existsSync(metadataPath)) {
              try {
                const metadataContent = readFileSync(metadataPath, 'utf-8');
                const metadata = JSON.parse(metadataContent);
                
                return {
                  id: metadata.id || backupId,
                  filename,
                  timestamp: metadata.timestamp,
                  date: metadata.date,
                  size: stats.size,
                  description: metadata.description,
                };
              } catch (error) {
                console.warn(`Failed to parse metadata for ${backupId}:`, error);
              }
            }

            // Fallback: Try to extract timestamp from old format (backup-TIMESTAMP.gz)
            const oldFormatMatch = filename.match(/backup-(\d+)\.gz/);
            if (oldFormatMatch) {
              const timestamp = parseInt(oldFormatMatch[1], 10);
              const date = new Date(timestamp).toISOString();
              
              return {
                id: backupId,
                filename,
                timestamp,
                date,
                size: stats.size,
                description: undefined,
              };
            }

            // Fallback: Try to extract date from new format (description-YYYY-MM-DD.gz)
            const newFormatMatch = filename.match(/(\d{4}-\d{2}-\d{2})\.gz$/);
            if (newFormatMatch) {
              const dateStr = newFormatMatch[1];
              const timestamp = new Date(dateStr).getTime();
              const date = new Date(timestamp).toISOString();
              
              // Extract description from filename
              const description = filename
                .replace(`-${dateStr}.gz`, '')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words
              
              return {
                id: backupId,
                filename,
                timestamp,
                date,
                size: stats.size,
                description,
              };
            }

            // If no pattern matches, use file modification time as fallback
            const timestamp = stats.mtimeMs;
            const date = new Date(timestamp).toISOString();
            
            return {
              id: backupId,
              filename,
              timestamp,
              date,
              size: stats.size,
              description: undefined,
            };
          } catch (error) {
            console.warn(`Failed to get stats for backup ${filename}:`, error);
            return null;
          }
        })
        .filter((backup): backup is BackupMetadata => backup !== null)
        .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

      return backups;
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      throw new Error(`Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a backup
   */
  public async deleteBackup(backupId: string): Promise<void> {
    try {

      const backupPath = join(this.backupDir, `${backupId}.gz`);
      const metadataPath = join(this.backupDir, `${backupId}.json`);

      if (!existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      // Delete backup file
      unlinkSync(backupPath);
      
      // Delete metadata file if it exists
      if (existsSync(metadataPath)) {
        unlinkSync(metadataPath);
      }
      
    } catch (error) {
      console.error('❌ Delete failed:', error);
      throw new Error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get backup statistics
   */
  public async getStatistics(): Promise<BackupStatistics> {
    try {
      const backups = await this.listBackups();
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

      const stats = {
        totalBackups: backups.length,
        totalSize,
        lastBackup: backups.length > 0 ? { timestamp: backups[0].timestamp, size: backups[0].size } : undefined,
      };

      return stats;
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      throw new Error(`Failed to get backup statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old backups, keeping only the last N
   */
  public async cleanupOldBackups(maxBackups: number = 10): Promise<void> {
    try {

      const backups = await this.listBackups();

      if (backups.length > maxBackups) {
        const backupsToDelete = backups.slice(maxBackups);

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.id);
        }

      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw new Error(`Failed to cleanup old backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the path to restore a database file from a backup
   */
  public getRestoreDbPath(backupId: string): string {
    return join(this.backupDir, '.restore-temp', basename(this.dbPath));
  }

  /**
   * Cleanup restore temporary files
   */
  public async cleanupRestoreTemp(): Promise<void> {
    try {
      const tempDir = join(this.backupDir, '.restore-temp');
      if (existsSync(tempDir)) {
        this.deleteRecursive(tempDir);
      }
    } catch (error) {
      console.error('❌ Cleanup temp failed:', error);
    }
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Recursively delete directory
   */
  private deleteRecursive(dirPath: string): void {
    if (existsSync(dirPath)) {
      readdirSync(dirPath).forEach((file) => {
        const curPath = join(dirPath, file);
        const stat = statSync(curPath);
        if (stat.isDirectory()) {
          this.deleteRecursive(curPath);
        } else {
          unlinkSync(curPath);
        }
      });
      try {
        // Try to use rmSync if available (Node >= 14.14.0)
        if (typeof rmSync === 'function') {
          rmSync(dirPath, { force: true });
        }
      } catch (error) {
        // Fallback - directory should be empty now anyway
      }
    }
  }
}
