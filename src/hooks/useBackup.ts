/**
 * useBackup Hook
 * Provides backup and restore functionality for the database
 */

import { useState, useCallback } from 'react';
import { toast } from './use-toast';
import type { BackupMetadata, BackupStatistics } from '@/types/backup';

/**
 * Hook for managing database backups
 */
export function useBackup() {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [stats, setStats] = useState<BackupStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For actions: create, delete, restore, cleanup
  const [isFetchingList, setIsFetchingList] = useState(false); // For fetching backup list
  const [isFetchingStats, setIsFetchingStats] = useState(false); // For fetching statistics
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new backup
   */
  const createBackup = useCallback(
    async (description?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const metadata = await (window as any).api.backupCreate(description);

        // Refresh backups list and statistics sequentially to avoid state conflicts
        // Use internal API calls here to avoid loading state conflicts
        const backupList = await (window as any).api.backupList();
        setBackups(backupList.data);
        
        const statistics = await (window as any).api.backupStats();
        setStats(statistics.data);
        

        toast({
          title: 'Backup Created',
          description: `Backup created successfully`,
        });

        return metadata;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create backup';
        setError(errorMsg);
        console.error('❌ [useBackup] Failed to create backup:', err);
        toast({
          title: 'Backup Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new backup with file dialog
   */
  const createBackupWithDialog = useCallback(
    async (description?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await (window as any).api.backupCreateWithDialog(description);

        // Check if user cancelled
        if (result.cancelled) {
          setIsLoading(false);
          return null;
        }

        toast({
          title: 'Backup Created',
          description: `Backup created successfully`,
        });

        return result.metadata;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create backup';
        setError(errorMsg);
        console.error('❌ [useBackup] Failed to create backup:', err);
        toast({
          title: 'Backup Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * List all backups
   */
  const listBackups = useCallback(async () => {
    try {
      setIsFetchingList(true);
      setError(null);

      const backupList = await (window as any).api.backupList();
      
      setBackups(backupList.data);

      return backupList.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to list backups';
      setError(errorMsg);
      console.error('❌ [useBackup] listBackups error:', err);
      throw err;
    } finally {
      setIsFetchingList(false);
    }
  }, []);

  /**
   * Restore from a backup
   */
  const restoreBackup = useCallback(
    async (backupId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await (window as any).api.backupRestore(backupId);

        toast({
          title: 'Backup Restored',
          description: result.message || 'Database has been restored successfully.',
        });

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to restore backup';
        setError(errorMsg);
        toast({
          title: 'Restore Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Restore from a backup file (with dialog)
   */
  const restoreBackupFromFile = useCallback(
    async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await (window as any).api.backupRestoreFromFile();

        // Check if user cancelled
        if (result.cancelled) {
          setIsLoading(false);
          return null;
        }

        toast({
          title: 'Backup Restored',
          description: result.message || 'Database has been restored successfully.',
        });

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to restore backup';
        setError(errorMsg);
        toast({
          title: 'Restore Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete a backup
   */
  const deleteBackup = useCallback(
    async (backupId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await (window as any).api.backupDelete(backupId);

        // Refresh backups list and statistics sequentially to avoid state conflicts
        const backupList = await (window as any).api.backupList();
        setBackups(backupList.data);
        
        const statistics = await (window as any).api.backupStats();
        setStats(statistics.data);

        toast({
          title: 'Backup Deleted',
          description: 'Backup deleted successfully',
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete backup';
        setError(errorMsg);
        toast({
          title: 'Delete Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get backup statistics
   */
  const getStatistics = useCallback(async () => {
    try {
      setIsFetchingStats(true);
      setError(null);

      const statistics = await (window as any).api.backupStats();
    
      
      setStats(statistics.data);

      return statistics;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get statistics';
      setError(errorMsg);
      console.error('❌ [useBackup] Failed to get statistics:', err);
      throw err;
    } finally {
      setIsFetchingStats(false);
    }
  }, []);

  /**
   * Cleanup old backups
   */
  const cleanupOldBackups = useCallback(
    async (maxBackups: number = 10) => {
      try {
        setIsLoading(true);
        setError(null);

        await (window as any).api.backupCleanup(maxBackups);

        // Refresh backups list and statistics sequentially to avoid state conflicts
        const backupList = await (window as any).api.backupList();
        setBackups(backupList.data);
        
        const statistics = await (window as any).api.backupStats();
        setStats(statistics.data);

        toast({
          title: 'Cleanup Completed',
          description: 'Old backups cleaned up successfully',
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to cleanup backups';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    backups,
    stats,
    isLoading, // For actions: create, delete, restore, cleanup
    isFetchingList, // For fetching backup list
    isFetchingStats, // For fetching statistics
    error,
    createBackup,
    createBackupWithDialog,
    listBackups,
    restoreBackup,
    restoreBackupFromFile,
    deleteBackup,
    getStatistics,
    cleanupOldBackups,
  };
}
