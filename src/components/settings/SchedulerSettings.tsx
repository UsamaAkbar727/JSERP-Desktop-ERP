/**
 * SchedulerSettings Component
 * Manages automatic backup scheduler configuration
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SchedulerSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const [time, setTime] = useState('02:00');
  const [dayOfWeek, setDayOfWeek] = useState('0');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [maxBackups, setMaxBackups] = useState('10');

  // Load scheduler status on mount
  useEffect(() => {
    loadSchedulerStatus();
  }, []);

  const loadSchedulerStatus = async () => {
    try {
      const response = await (window as any).api.backupSchedulerStatus();
      if (response) {
        const s = response;
        setStatus(s);
        setEnabled(s.enabled);
        setFrequency(s.frequency);
        setTime(s.time);
        setMaxBackups(String(s.maxBackups));
      }
    } catch (error) {
      console.error('Failed to load scheduler status:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);

      const response = await (window as any).api.backupSchedulerUpdate({
        enabled,
        frequency,
        time,
        dayOfWeek: parseInt(dayOfWeek),
        dayOfMonth: parseInt(dayOfMonth),
        maxBackups: parseInt(maxBackups),
      });

      if (response) {
        setStatus(response);
        toast({
          title: 'Settings Saved',
          description: 'Backup scheduler settings have been updated',
        });
      }
    } catch (error) {
      console.error('Failed to save scheduler settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save scheduler settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBackup = async () => {
    try {
      setIsLoading(true);

      const response = await (window as any).api.backupSchedulerTest();
      if (response) {
        toast({
          title: 'Test Successful',
          description: 'Test backup created successfully',
        });
        // Reload status to show the new backup
        await loadSchedulerStatus();
      }
    } catch (error) {
      console.error('Failed to test scheduler:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to create test backup',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextRunDate = status?.nextRun ? new Date(status.nextRun).toLocaleString() : 'Not scheduled';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Automatic Backup Scheduler
        </CardTitle>
        <CardDescription>Automatically backup your database on a schedule</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Scheduler */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Automatic Backups</p>
            <p className="text-sm text-muted-foreground">
              Automatically backup your database on a schedule
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={isLoading} />
        </div>

        {enabled && (
          <>
            {/* Frequency Settings */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="frequency">Backup Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency} disabled={isLoading}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <Label htmlFor="time">Backup Time (HH:mm)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Weekly Settings */}
              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek} disabled={isLoading}>
                    <SelectTrigger id="dayOfWeek">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Monthly Settings */}
              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfMonth">Day of Month</Label>
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth} disabled={isLoading}>
                    <SelectTrigger id="dayOfMonth">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (i + 1).toString()).map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Max Backups */}
              <div className="space-y-2">
                <Label htmlFor="maxBackups">Keep Last N Backups</Label>
                <Input
                  id="maxBackups"
                  type="number"
                  value={maxBackups}
                  onChange={(e) => setMaxBackups(e.target.value)}
                  min="1"
                  max="100"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Status Info */}
            {status && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-blue-900 dark:text-blue-200">
                      Status: {status.running ? '🟢 Running' : '🔴 Stopped'}
                    </p>
                    <p className="text-blue-800 dark:text-blue-300">
                      Next backup: {nextRunDate}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleSaveSettings} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant="outline" onClick={handleTestBackup} disabled={isLoading}>
                {isLoading ? 'Testing...' : 'Test Backup'}
              </Button>
            </div>
          </>
        )}

        {!enabled && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Automatic backups are currently disabled. Enable the toggle above to activate scheduled backups.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
