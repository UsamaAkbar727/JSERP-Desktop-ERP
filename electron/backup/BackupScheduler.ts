/**
 * Backup Scheduler
 * Handles automatic database backups on a schedule
 */

import type { BackupScheduleSettings } from './types';
import { BackupService } from './BackupService';

export class BackupScheduler {
  private backupService: BackupService;
  private scheduledTimer: NodeJS.Timeout | null = null;
  private settings: BackupScheduleSettings;
  private isRunning = false;

  constructor(backupService: BackupService, settings?: BackupScheduleSettings) {
    this.backupService = backupService;
    this.settings = settings || {
      enabled: false,
      frequency: 'daily',
      time: '02:00', // 2 AM
      dayOfWeek: 0, // Sunday
      dayOfMonth: 1, // 1st of month
      maxBackups: 10,
    };
  }

  /**
   * Start the scheduler
   */
  public start(): void {
    if (!this.settings.enabled) {
      return;
    }

    if (this.isRunning) {
      return;
    }

    try {
      const delayMs = this.getDelayUntilNextRun();

      // Schedule first run
      this.scheduleNextRun();
      this.isRunning = true;
    } catch (error) {
      console.error('❌ Failed to start backup scheduler:', error);
    }
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer as NodeJS.Timeout);
      this.scheduledTimer = null;
    }
    this.isRunning = false;
  }

  /**
   * Update scheduler settings
   */
  public updateSettings(settings: Partial<BackupScheduleSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Restart scheduler if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }

  }

  /**
   * Schedule next run
   */
  private scheduleNextRun(): void {
    if (!this.isRunning || !this.settings.enabled) {
      return;
    }

    const delayMs = this.getDelayUntilNextRun();

    this.scheduledTimer = setTimeout(async () => {
      await this.executeBackup();

      // Schedule the next run
      this.scheduleNextRun();
    }, delayMs);
  }

  /**
   * Get delay in milliseconds until next run
   */
  private getDelayUntilNextRun(): number {
    const now = new Date();
    const nextRun = this.getNextRunTime();

    const delay = nextRun.getTime() - now.getTime();

    // Minimum 1 minute delay to prevent rapid execution
    return Math.max(delay, 60000);
  }

  /**
   * Get next run time based on settings
   */
  private getNextRunTime(): Date {
    const now = new Date();
    const [hours, minutes] = this.settings.time.split(':').map(Number);

    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // If the scheduled time has already passed today, schedule for next occurrence
    if (nextRun <= now) {
      switch (this.settings.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;

        case 'weekly':
          const dayOfWeek = this.settings.dayOfWeek || 0;
          let daysUntilNextOccurrence = (dayOfWeek - nextRun.getDay() + 7) % 7;
          if (daysUntilNextOccurrence === 0) {
            daysUntilNextOccurrence = 7; // If today is the day but time has passed, schedule for next week
          }
          nextRun.setDate(nextRun.getDate() + daysUntilNextOccurrence);
          break;

        case 'monthly':
          const dayOfMonth = this.settings.dayOfMonth || 1;
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(dayOfMonth);
          break;
      }
    } else {
      // If today is before the scheduled time, check if we need to move to next occurrence
      if (this.settings.frequency === 'weekly') {
        const dayOfWeek = this.settings.dayOfWeek || 0;
        const daysUntilNextOccurrence = (dayOfWeek - nextRun.getDay() + 7) % 7;
        if (daysUntilNextOccurrence !== 0) {
          nextRun.setDate(nextRun.getDate() + daysUntilNextOccurrence);
        }
      } else if (this.settings.frequency === 'monthly') {
        const dayOfMonth = this.settings.dayOfMonth || 1;
        if (nextRun.getDate() !== dayOfMonth) {
          nextRun.setDate(dayOfMonth);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
            nextRun.setDate(dayOfMonth);
          }
        }
      }
    }

    return nextRun;
  }

  /**
   * Execute backup
   */
  private async executeBackup(): Promise<void> {
    try {

      const metadata = await this.backupService.createBackup({
        description: `Automatic ${this.settings.frequency} backup`,
      });


      // Clean up old backups
      await this.backupService.cleanupOldBackups(this.settings.maxBackups);
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error);
    }
  }

  /**
   * Test the scheduler
   */
  public async test(): Promise<void> {
    try {
      const metadata = await this.backupService.createBackup({
        description: 'Backup scheduler test',
      });
    } catch (error) {
      console.error('❌ Test backup failed:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    enabled: boolean;
    running: boolean;
    frequency: string;
    time: string;
    maxBackups: number;
    nextRun: Date;
  } {
    return {
      enabled: this.settings.enabled,
      running: this.isRunning,
      frequency: this.settings.frequency,
      time: this.settings.time,
      maxBackups: this.settings.maxBackups,
      nextRun: this.getNextRunTime(),
    };
  }
}
