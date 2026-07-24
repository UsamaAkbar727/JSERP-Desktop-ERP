/**
 * Database Types and Interfaces
 */

export interface DatabaseConfig {
    filename: string;
    version: number;
    verbose?: boolean;
}

export interface Migration {
    version: number;
    name: string;
    up: (db: any) => void;
    down?: (db: any) => void;
}

export interface DatabaseMetadata {
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface DatabaseResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface QueryOptions {
    params?: any[];
    returnFirst?: boolean;
}

// Common database operations
export interface DatabaseOperations {
    // Query operations
    query: <T = any>(sql: string, params?: any[]) => Promise<DatabaseResult<T[]>>;
    queryOne: <T = any>(sql: string, params?: any[]) => Promise<DatabaseResult<T>>;
    execute: (sql: string, params?: any[]) => Promise<DatabaseResult<{ changes: number; lastInsertRowid: number }>>;

    // Transaction operations
    transaction: <T = any>(callback: () => T) => Promise<DatabaseResult<T>>;

    // Utility operations
    getVersion: () => Promise<DatabaseResult<number>>;
    backup: (targetPath: string) => Promise<DatabaseResult<void>>;
    close: () => Promise<DatabaseResult<void>>;
}
