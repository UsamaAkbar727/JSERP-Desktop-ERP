/**
 * BackupSettings Component
 * Manages database backup and restore functionality
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBackup } from '@/hooks/useBackup';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Database, Download, Upload, Trash2, RotateCcw } from 'lucide-react';
import type { BackupMetadata } from '@/types/backup';
import SchedulerSettings from './SchedulerSettings';

export default function BackupSettings() {
  
  const { t } = useLanguage();
  const { toast } = useToast();
  const {
    backups,
    stats,
    isLoading,
    isFetchingList,
    isFetchingStats,
    createBackup,
    createBackupWithDialog,
    listBackups,
    deleteBackup,
    restoreBackup,
    restoreBackupFromFile,
    getStatistics,
  } = useBackup();


  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [backupDescription, setBackupDescription] = useState('');
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize - load backups on component mount (sequential to avoid state conflicts)
  useEffect(() => {
    const loadData = async () => {

      try {
        // Fetch sequentially to ensure proper state updates
        await listBackups();
        
        await getStatistics();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ [BackupSettings] Failed to load backup data:', error);
        // Set initialized anyway to show the UI with empty state
        setIsInitialized(true);
      }
    };

    loadData();
  }, [listBackups, getStatistics]);

  const handleCreateBackup = async () => {
    try {
      const result = await createBackupWithDialog(backupDescription || undefined);
      
      // Check if user cancelled
      if (!result) {
        setShowCreateDialog(false);
        setBackupDescription('');
        return;
      }
      
      // Explicitly refresh stats to ensure UI updates
      await getStatistics();
      await listBackups();
      
      setShowCreateDialog(false);
      setBackupDescription('');
    } catch (error) {
      console.error('❌ [BackupSettings] Failed to create backup:', error);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      const result = await restoreBackup(selectedBackup.id);
      setShowRestoreDialog(false);
      setSelectedBackup(null);

      // Show success message with merge details
      const description = result.merged 
        ? `${result.merged} records merged successfully${result.skipped ? `, ${result.skipped} skipped` : ''}. Restarting application...`
        : 'The database has been restored. Restarting application...';

      toast({
        title: 'Backup Merged Successfully',
        description,
      });

      // Wait a moment for user to see the message, then restart
      setTimeout(async () => {
        try {
          await (window as any).api.appRestart();
        } catch (error) {
          console.error('Failed to restart app:', error);
          toast({
            title: 'Manual Restart Required',
            description: 'Please close and reopen the application manually.',
            variant: 'destructive',
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Failed to restore backup',
        variant: 'destructive',
      });
    }
  };

  const handleRestoreBackupFromFile = async () => {
    try {
      const result = await restoreBackupFromFile();
      
      // Check if user cancelled
      if (!result) {
        return;
      }
      
      // Show success message with merge details
      const description = result.merged 
        ? `${result.merged} records merged successfully${result.skipped ? `, ${result.skipped} skipped` : ''}. Restarting application...`
        : 'The database has been restored. Restarting application...';
      toast({
        title: 'Backup Merged Successfully',
        description,
      });

      // Wait a moment for user to see the message, then restart
      setTimeout(async () => {
        try {
          await (window as any).api.appRestart();
        } catch (error) {
          console.error('Failed to restart app:', error);
          toast({
            title: 'Manual Restart Required',
            description: 'Please close and reopen the application manually.',
            variant: 'destructive',
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to restore backup from file:', error);
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Failed to restore backup',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;

    try {
      await deleteBackup(selectedBackup.id);
      
      // Explicitly refresh stats to ensure UI updates
      await getStatistics();
      
      setShowDeleteDialog(false);
      setSelectedBackup(null);
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  };

  const formatFileSize = (bytes: number | undefined): string => {
    // Safe default for undefined or invalid values
    if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const result = Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    return result;
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) {
      return 'Invalid date';
    }
    const result = new Date(timestamp).toLocaleString();
    return result;
  };

 

  // Show loading only on initial mount
  if (!isInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Database Backup & Restore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading backup data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Database Backup & Restore
          </CardTitle>
          <CardDescription>
            Manage backups of your database. Create, restore, or delete backups as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6" >
         

          {/* Statistics Section */}
          {/* <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm font-medium text-muted-foreground">Total Backups</p>
              <p className="text-2xl font-semibold mt-1">
                {isFetchingStats ? '...' : (stats?.totalBackups ?? 0)}
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm font-medium text-muted-foreground">Total Size</p>
              <p className="text-2xl font-semibold mt-1">
                {isFetchingStats ? '...' : formatFileSize(stats?.totalSize ?? 0)}
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm font-medium text-muted-foreground">Last Backup</p>
              <p className="text-lg font-semibold mt-1">
                {isFetchingStats ? '...' : (
                  stats?.lastBackup?.timestamp 
                    ? formatDate(stats.lastBackup.timestamp) 
                    : 'Never'
                )}
              </p>
            </div>
          </div> */}

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Create Backup
            </Button>
            <Button
              onClick={handleRestoreBackupFromFile}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Restore Backup
            </Button>
          </div>

          {/* Backups List */}
          {/* <div>
            <h3 className="font-semibold mb-3">Recent Backups</h3>
            {backups.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.slice(0, 5).map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-medium">
                          {formatDate(backup.timestamp)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {backup.description || 'No description'}
                        </TableCell>
                        <TableCell>{formatFileSize(Number(backup.size) || 0)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setShowRestoreDialog(true);
                              }}
                              disabled={isLoading}
                            >
                              <RotateCcw className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setShowDeleteDialog(true);
                              }}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center border border-border rounded-lg border-dashed">
                <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No backups found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first backup to get started
                </p>
              </div>
            )}
          </div> */}

       
        </CardContent>
      </Card>

      {/* Scheduler Settings */}
      {/* <SchedulerSettings /> */}

      {/* Create Backup Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Database Backup</DialogTitle>
            <DialogDescription>
              Add a backup of your current database. This may take a moment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-desc">Backup Description (Optional)</Label>
              <Input
                id="backup-desc"
                placeholder="e.g., Before year-end inventory"
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setBackupDescription('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBackup}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Creating...' : 'Create Backup'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Backup Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Database Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2 mt-4">
                <p>
                  This will merge data from the backup created on{' '}
                  <strong>{selectedBackup && formatDate(selectedBackup.timestamp)}</strong>{' '}
                  into your current database.
                </p>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                  <p className="text-blue-800 dark:text-blue-200 font-medium">
                    ✅ Your existing data will be preserved
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                    • New records from backup will be added<br />
                    • Existing records will be updated if they exist in backup<br />
                    • Your current data will NOT be deleted
                  </p>
                </div>
                <p className="text-yellow-600 dark:text-yellow-500 font-medium text-sm">
                  ⚠️ A safety backup will be created automatically. The application will restart after restore.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreBackup}
              disabled={isLoading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isLoading ? 'Merging...' : 'Merge Backup'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Backup Dialog */}
      {/* <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the backup from{' '}
              <strong>{selectedBackup && formatDate(selectedBackup.timestamp)}</strong>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBackup}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete Backup'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog> */}
    </>
  );
}
