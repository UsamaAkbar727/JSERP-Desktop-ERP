import { ipcMain } from 'electron';
import { getDatabase } from './manager';
import type { DatabaseResult } from './types';

/**
 * Database IPC Handlers
 * Exposes database operations to the renderer process via IPC
 */

/**
 * Wrap database operations with error handling
 */
function wrapDatabaseOperation<T>(
    operation: () => T
): DatabaseResult<T> {
    try {
        const data = operation();
        return { success: true, data };
    } catch (error) {
        console.error('Database operation error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Wrap async database operations with error handling
 */
async function wrapAsyncDatabaseOperation<T>(
    operation: () => Promise<T>
): Promise<DatabaseResult<T>> {
    try {
        const data = await operation();
        return { success: true, data };
    } catch (error) {
        console.error('Database operation error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Register all database IPC handlers
 */
export function registerDatabaseHandlers(): void {
    const db = getDatabase();

    // Query operations
    ipcMain.handle('db:query', async (_, sql: string, params?: any[]) => {
        return wrapDatabaseOperation(() => db.query(sql, params));
    });

    ipcMain.handle('db:queryOne', async (_, sql: string, params?: any[]) => {
        return wrapDatabaseOperation(() => db.queryOne(sql, params));
    });

    ipcMain.handle('db:execute', async (_, sql: string, params?: any[]) => {
        return wrapDatabaseOperation(() => {
            const result = db.execute(sql, params);
            return {
                changes: result.changes,
                lastInsertRowid: Number(result.lastInsertRowid),
            };
        });
    });

    // Transaction operations
    ipcMain.handle('db:transaction', async (_, operations: Array<{ sql: string; params?: any[] }>) => {
        return wrapDatabaseOperation(() => {
            return db.transaction(() => {
                const results = [];
                for (const op of operations) {
                    const result = db.execute(op.sql, op.params);
                    results.push({
                        changes: result.changes,
                        lastInsertRowid: Number(result.lastInsertRowid),
                    });
                }
                return results;
            });
        });
    });

    // Metadata operations
    ipcMain.handle('db:getVersion', async () => {
        return wrapDatabaseOperation(() => db.getVersion());
    });

    ipcMain.handle('db:getMetadata', async () => {
        return wrapAsyncDatabaseOperation(() => db.getMetadata());
    });

    ipcMain.handle('db:getPath', async () => {
        return wrapDatabaseOperation(() => db.getPath());
    });

    // Backup operations
    ipcMain.handle('db:backup', async (_, suffix?: string) => {
        return wrapAsyncDatabaseOperation(() => db.createBackup(suffix));
    });

    // Health check
    ipcMain.handle('db:isReady', async () => {
        return wrapDatabaseOperation(() => db.isReady());
    });

    // User operations (example CRUD operations)
    ipcMain.handle('db:users:getAll', async () => {
        return wrapDatabaseOperation(() => {
            return db.query('SELECT * FROM users WHERE active = 1 ORDER BY created_at DESC');
        });
    });

    ipcMain.handle('db:users:getById', async (_, id: number) => {
        return wrapDatabaseOperation(() => {
            return db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
        });
    });

    ipcMain.handle('db:users:create', async (_, user: {
        username: string;
        email: string;
        full_name?: string;
        role?: string;
    }) => {
        return wrapDatabaseOperation(() => {
            const result = db.execute(
                `INSERT INTO users (username, email, full_name, role) 
         VALUES (?, ?, ?, ?)`,
                [user.username, user.email, user.full_name || null, user.role || 'user']
            );
            return {
                id: Number(result.lastInsertRowid),
                changes: result.changes,
            };
        });
    });

    ipcMain.handle('db:users:update', async (_, id: number, updates: {
        username?: string;
        email?: string;
        full_name?: string;
        role?: string;
    }) => {
        return wrapDatabaseOperation(() => {
            const fields = [];
            const values = [];

            if (updates.username !== undefined) {
                fields.push('username = ?');
                values.push(updates.username);
            }
            if (updates.email !== undefined) {
                fields.push('email = ?');
                values.push(updates.email);
            }
            if (updates.full_name !== undefined) {
                fields.push('full_name = ?');
                values.push(updates.full_name);
            }
            if (updates.role !== undefined) {
                fields.push('role = ?');
                values.push(updates.role);
            }

            fields.push('updated_at = datetime("now")');
            values.push(id);

            const result = db.execute(
                `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
                values
            );

            return { changes: result.changes };
        });
    });

    ipcMain.handle('db:users:delete', async (_, id: number) => {
        return wrapDatabaseOperation(() => {
            // Soft delete
            const result = db.execute(
                'UPDATE users SET active = 0, updated_at = datetime("now") WHERE id = ?',
                [id]
            );
            return { changes: result.changes };
        });
    });

    // Settings operations
    ipcMain.handle('db:settings:get', async (_, key: string) => {
        return wrapDatabaseOperation(() => {
            const result = db.queryOne<{ value: string }>(
                'SELECT value FROM settings WHERE key = ?',
                [key]
            );
            return result?.value;
        });
    });

    ipcMain.handle('db:settings:set', async (_, key: string, value: string, description?: string) => {
        return wrapDatabaseOperation(() => {
            const result = db.execute(
                `INSERT INTO settings (key, value, description, updated_at) 
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET 
           value = excluded.value,
           description = COALESCE(excluded.description, description),
           updated_at = datetime('now')`,
                [key, value, description || null]
            );
            return { changes: result.changes };
        });
    });

    ipcMain.handle('db:settings:getAll', async () => {
        return wrapDatabaseOperation(() => {
            return db.query('SELECT * FROM settings ORDER BY key');
        });
    });

    // Audit log operations
    ipcMain.handle('db:audit:log', async (_, entry: {
        user_id?: number;
        action: string;
        table_name?: string;
        record_id?: number;
        changes?: any;
    }) => {
        return wrapDatabaseOperation(() => {
            const result = db.execute(
                `INSERT INTO audit_log (user_id, action, table_name, record_id, changes)
         VALUES (?, ?, ?, ?, ?)`,
                [
                    entry.user_id || null,
                    entry.action,
                    entry.table_name || null,
                    entry.record_id || null,
                    entry.changes ? JSON.stringify(entry.changes) : null,
                ]
            );
            return { id: Number(result.lastInsertRowid) };
        });
    });

    ipcMain.handle('db:audit:getRecent', async (_, limit: number = 100) => {
        return wrapDatabaseOperation(() => {
            return db.query(
                `SELECT a.*, u.username 
         FROM audit_log a
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.created_at DESC
         LIMIT ?`,
                [limit]
            );
        });
    });

}

/**
 * Unregister all database IPC handlers
 */
export function unregisterDatabaseHandlers(): void {
    const channels = [
        'db:query',
        'db:queryOne',
        'db:execute',
        'db:transaction',
        'db:getVersion',
        'db:getMetadata',
        'db:getPath',
        'db:backup',
        'db:isReady',
        'db:users:getAll',
        'db:users:getById',
        'db:users:create',
        'db:users:update',
        'db:users:delete',
        'db:settings:get',
        'db:settings:set',
        'db:settings:getAll',
        'db:audit:log',
        'db:audit:getRecent',
    ];

    channels.forEach(channel => {
        ipcMain.removeHandler(channel);
    });

}
