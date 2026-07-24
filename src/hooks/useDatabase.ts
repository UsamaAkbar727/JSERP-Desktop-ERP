/**
 * React Hook for Database Operations
 * Provides easy access to database operations in React components
 */

import { useState, useEffect, useCallback } from 'react';

// Type definitions for database results
interface DatabaseResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Hook for database queries
 */
export function useDatabase() {
    const [isReady, setIsReady] = useState(false);
    const [version, setVersion] = useState<number | null>(null);

    useEffect(() => {
        // Check if database is ready
        const checkDatabase = async () => {
            try {
                const result = await window.electronAPI.db.isReady();
                setIsReady(result.success && result.data === true);

                if (result.success && result.data) {
                    const versionResult = await window.electronAPI.db.getVersion();
                    if (versionResult.success && versionResult.data !== undefined) {
                        setVersion(versionResult.data);
                    }
                }
            } catch (error) {
                console.error('Failed to check database status:', error);
                setIsReady(false);
            }
        };

        checkDatabase();
    }, []);

    return {
        isReady,
        version,
        db: window.electronAPI.db,
    };
}

/**
 * Custom hook for database queries with loading state
 */
export function useDatabaseQuery<T>(
    queryFn: () => Promise<DatabaseResult<T>>,
    deps: any[] = [],
    options: {
        enabled?: boolean;
        refetchInterval?: number;
        onSuccess?: (data: T) => void;
        onError?: (error: string) => void;
    } = {}
) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { enabled = true, refetchInterval, onSuccess, onError } = options;

    const fetchData = useCallback(async () => {
        if (!enabled) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await queryFn();

            if (result.success && result.data !== undefined) {
                setData(result.data);
                onSuccess?.(result.data);
            } else {
                const errorMsg = result.error || 'Unknown error';
                setError(errorMsg);
                onError?.(errorMsg);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            onError?.(errorMsg);
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryFn, enabled, onSuccess, onError, ...deps]);

    useEffect(() => {
        fetchData();

        // Set up refetch interval if specified
        if (refetchInterval && refetchInterval > 0) {
            const intervalId = setInterval(fetchData, refetchInterval);
            return () => clearInterval(intervalId);
        }
    }, [fetchData, refetchInterval]);

    const refetch = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Custom hook for database mutations (INSERT, UPDATE, DELETE)
 */
export function useDatabaseMutation<TInput = any, TResult = any>(
    mutationFn: (input: TInput) => Promise<DatabaseResult<TResult>>,
    options: {
        onSuccess?: (data: TResult, input: TInput) => void;
        onError?: (error: string, input: TInput) => void;
    } = {}
) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { onSuccess, onError } = options;

    const mutate = useCallback(
        async (input: TInput) => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await mutationFn(input);

                if (result.success && result.data !== undefined) {
                    onSuccess?.(result.data, input);
                    return result.data;
                } else {
                    const errorMsg = result.error || 'Mutation failed';
                    setError(errorMsg);
                    onError?.(errorMsg, input);
                    throw new Error(errorMsg);
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMsg);
                onError?.(errorMsg, input);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [mutationFn, onSuccess, onError]
    );

    const reset = useCallback(() => {
        setError(null);
    }, []);

    return {
        mutate,
        isLoading,
        error,
        reset,
    };
}

/**
 * Hook to get database metadata
 */
export function useDatabaseMetadata() {
    return useDatabaseQuery(
        () => window.electronAPI.db.getMetadata(),
        [],
        { refetchInterval: 60000 } // Refetch every minute
    );
}

/**
 * Hook for settings operations
 */
export function useSettings() {
    const getSetting = useCallback(async (key: string) => {
        const result = await window.electronAPI.db.settings.get(key);
        if (result.success) {
            return result.data;
        }
        return null;
    }, []);

    const setSetting = useCallback(async (key: string, value: string) => {
        const result = await window.electronAPI.db.settings.set(key, value);
        return result.success;
    }, []);

    const getAllSettings = useCallback(async () => {
        const result = await window.electronAPI.db.settings.getAll();
        if (result.success && result.data) {
            // Convert array of settings to object
            return result.data.reduce((acc: Record<string, string>, setting: any) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {} as Record<string, string>);
        }
        return {};
    }, []);

    return {
        getSetting,
        setSetting,
        getAllSettings,
    };
}

/**
 * Hook for querying data with loading and error states
 */
export function useQuery<T = any>(
    sql: string,
    params?: any[],
    options?: { enabled?: boolean; refetchInterval?: number }
) {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await window.electronAPI.db.query<T>(sql, params);

            if (result.success) {
                setData(result.data || null);
            } else {
                setError(result.error || 'Query failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [sql, JSON.stringify(params)]);

    useEffect(() => {
        if (options?.enabled !== false) {
            fetchData();

            // Set up refetch interval if specified
            if (options?.refetchInterval) {
                const interval = setInterval(fetchData, options.refetchInterval);
                return () => clearInterval(interval);
            }
        }
    }, [fetchData, options?.enabled, options?.refetchInterval]);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
    };
}

/**
 * Hook for querying a single row
 */
export function useQueryOne<T = any>(
    sql: string,
    params?: any[],
    options?: { enabled?: boolean }
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await window.electronAPI.db.queryOne<T>(sql, params);

            if (result.success) {
                setData(result.data || null);
            } else {
                setError(result.error || 'Query failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [sql, JSON.stringify(params)]);

    useEffect(() => {
        if (options?.enabled !== false) {
            fetchData();
        }
    }, [fetchData, options?.enabled]);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
    };
}

/**
 * Hook for executing mutations (INSERT, UPDATE, DELETE)
 */
export function useMutation<TVariables = any, TResult = any>() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(
        async (
            sql: string,
            params?: any[]
        ): Promise<DatabaseResult<{ changes: number; lastInsertRowid: number }>> => {
            try {
                setLoading(true);
                setError(null);

                const result = await window.electronAPI.db.execute(sql, params);

                if (!result.success) {
                    setError(result.error || 'Mutation failed');
                }

                return result;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                return { success: false, error: errorMessage };
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return {
        execute,
        loading,
        error,
    };
}

/**
 * Hook for user operations
 */
export function useUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await window.electronAPI.db.users.getAll();

            if (result.success) {
                setUsers(result.data || []);
            } else {
                setError(result.error || 'Failed to fetch users');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    const createUser = useCallback(
        async (user: { username: string; email: string; full_name?: string; role?: string }) => {
            const result = await window.electronAPI.db.users.create(user);
            if (result.success) {
                await fetchUsers(); // Refresh list
            }
            return result;
        },
        [fetchUsers]
    );

    const updateUser = useCallback(
        async (
            id: number,
            updates: { username?: string; email?: string; full_name?: string; role?: string }
        ) => {
            const result = await window.electronAPI.db.users.update(id, updates);
            if (result.success) {
                await fetchUsers(); // Refresh list
            }
            return result;
        },
        [fetchUsers]
    );

    const deleteUser = useCallback(
        async (id: number) => {
            const result = await window.electronAPI.db.users.delete(id);
            if (result.success) {
                await fetchUsers(); // Refresh list
            }
            return result;
        },
        [fetchUsers]
    );

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return {
        users,
        loading,
        error,
        refetch: fetchUsers,
        createUser,
        updateUser,
        deleteUser,
    };
}

/**
 * Hook for audit logging
 */
export function useAuditLog() {
    const logAction = useCallback(
        async (entry: {
            user_id?: number;
            action: string;
            table_name?: string;
            record_id?: number;
            changes?: any;
        }) => {
            return await window.electronAPI.db.audit.log(entry);
        },
        []
    );

    const getRecentLogs = useCallback(async (limit?: number) => {
        return await window.electronAPI.db.audit.getRecent(limit);
    }, []);

    return {
        logAction,
        getRecentLogs,
    };
}
