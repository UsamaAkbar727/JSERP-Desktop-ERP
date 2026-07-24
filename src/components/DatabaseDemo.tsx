/**
 * Database Demo Component
 * Demonstrates database operations in the JSERP application
 */

import { useState } from 'react';
import { useDatabase, useUsers, useSettings, useAuditLog } from '@/hooks/useDatabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export function DatabaseDemo() {
    const { isReady, version } = useDatabase();
    const { users, loading: usersLoading, createUser, updateUser, deleteUser } = useUsers();
    const { getSetting, setSetting } = useSettings();
    const { logAction, getRecentLogs } = useAuditLog();

    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        full_name: '',
        role: 'user'
    });

    const [settingKey, setSettingKey] = useState('');
    const [settingValue, setSettingValue] = useState('');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await createUser(newUser);

        if (result.success) {
            toast.success('User created successfully!');

            // Log the action
            await logAction({
                action: 'CREATE_USER',
                table_name: 'users',
                record_id: result.data?.id,
                changes: newUser
            });

            // Reset form
            setNewUser({ username: '', email: '', full_name: '', role: 'user' });
        } else {
            toast.error(`Failed to create user: ${result.error}`);
        }
    };

    const handleDeleteUser = async (id: number, username: string) => {
        const result = await deleteUser(id);

        if (result.success) {
            toast.success(`User ${username} deleted`);

            // Log the action
            await logAction({
                action: 'DELETE_USER',
                table_name: 'users',
                record_id: id,
                changes: { username }
            });
        } else {
            toast.error(`Failed to delete user: ${result.error}`);
        }
    };

    const handleSaveSetting = async () => {
        if (!settingKey || !settingValue) {
            toast.error('Please enter both key and value');
            return;
        }

        const result = await setSetting(settingKey, settingValue);

        if (result.success) {
            toast.success('Setting saved!');
            setSettingKey('');
            setSettingValue('');
        } else {
            toast.error(`Failed to save setting: ${result.error}`);
        }
    };

    const handleLoadSetting = async () => {
        if (!settingKey) {
            toast.error('Please enter a key');
            return;
        }

        const result = await getSetting(settingKey);

        if (result.success && result.data) {
            setSettingValue(result.data);
            toast.success('Setting loaded!');
        } else {
            toast.error('Setting not found');
        }
    };

    const handleLoadAuditLogs = async () => {
        const result = await getRecentLogs(10);

        if (result.success && result.data) {
            setAuditLogs(result.data);
            toast.success('Audit logs loaded!');
        } else {
            toast.error('Failed to load audit logs');
        }
    };

    const handleBackup = async () => {
        const result = await window.api.db.backup('manual');

        if (result.success) {
            toast.success(`Backup created: ${result.data}`);
        } else {
            toast.error(`Backup failed: ${result.error}`);
        }
    };

    if (!isReady) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Initializing Database...</h2>
                    <p className="text-muted-foreground">Please wait</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Database Demo</h1>
                    <p className="text-muted-foreground">
                        Database v{version} • SQLite with better-sqlite3
                    </p>
                </div>
                <Button onClick={handleBackup} variant="outline">
                    Create Backup
                </Button>
            </div>

            <Separator />

            {/* User Management */}
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Create, view, and manage users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Create User Form */}
                    <form onSubmit={handleCreateUser} className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold">Create New User</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    value={newUser.full_name}
                                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="role">Role</Label>
                                <Input
                                    id="role"
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                />
                            </div>
                        </div>
                        <Button type="submit">Create User</Button>
                    </form>

                    {/* User List */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Users ({users.length})</h3>
                        {usersLoading ? (
                            <p className="text-muted-foreground">Loading users...</p>
                        ) : users.length === 0 ? (
                            <p className="text-muted-foreground">No users found. Create one above!</p>
                        ) : (
                            <div className="space-y-2">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{user.full_name || user.username}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{user.role}</Badge>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDeleteUser(user.id, user.username)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Store and retrieve application settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="setting-key">Setting Key</Label>
                            <Input
                                id="setting-key"
                                value={settingKey}
                                onChange={(e) => setSettingKey(e.target.value)}
                                placeholder="e.g., theme"
                            />
                        </div>
                        <div>
                            <Label htmlFor="setting-value">Setting Value</Label>
                            <Input
                                id="setting-value"
                                value={settingValue}
                                onChange={(e) => setSettingValue(e.target.value)}
                                placeholder="e.g., dark"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveSetting}>Save Setting</Button>
                        <Button onClick={handleLoadSetting} variant="outline">
                            Load Setting
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Logs */}
            <Card>
                <CardHeader>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>View recent database operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleLoadAuditLogs}>Load Recent Logs (10)</Button>

                    {auditLogs.length > 0 && (
                        <div className="space-y-2">
                            {auditLogs.map((log) => (
                                <div key={log.id} className="p-3 border rounded-lg text-sm">
                                    <div className="flex items-center justify-between">
                                        <Badge>{log.action}</Badge>
                                        <span className="text-muted-foreground">{log.created_at}</span>
                                    </div>
                                    {log.table_name && (
                                        <p className="mt-1">
                                            Table: <code className="text-xs bg-muted px-1 py-0.5 rounded">{log.table_name}</code>
                                            {log.record_id && ` (ID: ${log.record_id})`}
                                        </p>
                                    )}
                                    {log.changes && (
                                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                            {log.changes}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
