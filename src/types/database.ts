/**
 * Database Types for Renderer Process
 * Type-safe database operations exposed via Electron IPC
 */

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DatabaseMetadata {
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueryResult {
  changes: number;
  lastInsertRowid: number;
}

export interface TransactionOperation {
  sql: string;
  params?: any[];
}

/**
 * Database API exposed to renderer via window.electronAPI.db
 */
export interface DatabaseAPI {
  // Core query operations
  query: <T = any>(sql: string, params?: any[]) => Promise<DatabaseResult<T[]>>;
  queryOne: <T = any>(sql: string, params?: any[]) => Promise<DatabaseResult<T>>;
  execute: (sql: string, params?: any[]) => Promise<DatabaseResult<QueryResult>>;
  transaction: (operations: TransactionOperation[]) => Promise<DatabaseResult<QueryResult[]>>;

  // Metadata operations
  getVersion: () => Promise<DatabaseResult<number>>;
  getMetadata: () => Promise<DatabaseResult<DatabaseMetadata>>;
  getPath: () => Promise<DatabaseResult<string>>;
  backup: (suffix?: string) => Promise<DatabaseResult<string>>;
  isReady: () => Promise<DatabaseResult<boolean>>;

  // Domain-specific operations
  users: UserOperations;
  settings: SettingsOperations;
  audit: AuditOperations;
}

/**
 * User database operations
 */
export interface UserOperations {
  getAll: () => Promise<DatabaseResult<User[]>>;
  getById: (id: string) => Promise<DatabaseResult<User>>;
  create: (user: CreateUserInput) => Promise<DatabaseResult<QueryResult>>;
  update: (id: string, updates: UpdateUserInput) => Promise<DatabaseResult<QueryResult>>;
  delete: (id: string) => Promise<DatabaseResult<QueryResult>>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
  language_preference: 'en' | 'ur';
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'staff';
  status?: 'active' | 'inactive';
  language_preference?: 'en' | 'ur';
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'staff';
  status?: 'active' | 'inactive';
  language_preference?: 'en' | 'ur';
}

/**
 * Settings database operations
 */
export interface SettingsOperations {
  get: (key: string) => Promise<DatabaseResult<string>>;
  set: (key: string, value: string) => Promise<DatabaseResult<QueryResult>>;
  getAll: () => Promise<DatabaseResult<Setting[]>>;
  delete: (key: string) => Promise<DatabaseResult<QueryResult>>;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * Audit log operations
 */
export interface AuditOperations {
  log: (entry: CreateAuditEntry) => Promise<DatabaseResult<QueryResult>>;
  getRecent: (limit?: number) => Promise<DatabaseResult<AuditEntry[]>>;
  getByUser: (userId: string, limit?: number) => Promise<DatabaseResult<AuditEntry[]>>;
  getByTable: (tableName: string, limit?: number) => Promise<DatabaseResult<AuditEntry[]>>;
}

export interface AuditEntry {
  id: number;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  changes?: string; // JSON string
  created_at: string;
}

export interface CreateAuditEntry {
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  changes?: Record<string, any>;
}

/**
 * Type-safe database query builder helpers
 */
export class DatabaseQueryBuilder {
  static select<T = any>(table: string, where?: Record<string, any>): Promise<DatabaseResult<T[]>> {
    const db = window.api.db;
    
    if (!where || Object.keys(where).length === 0) {
      return db.query<T>(`SELECT * FROM ${table}`);
    }

    const whereKeys = Object.keys(where);
    const whereClauses = whereKeys.map(key => `${key} = ?`).join(' AND ');
    const params = whereKeys.map(key => where[key]);

    return db.query<T>(`SELECT * FROM ${table} WHERE ${whereClauses}`, params);
  }

  static selectOne<T = any>(table: string, where: Record<string, any>): Promise<DatabaseResult<T>> {
    const db = window.api.db;
    const whereKeys = Object.keys(where);
    const whereClauses = whereKeys.map(key => `${key} = ?`).join(' AND ');
    const params = whereKeys.map(key => where[key]);

    return db.queryOne<T>(`SELECT * FROM ${table} WHERE ${whereClauses}`, params);
  }

  static insert(table: string, data: Record<string, any>): Promise<DatabaseResult<QueryResult>> {
    const db = window.api.db;
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const params = keys.map(key => data[key]);

    return db.execute(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      params
    );
  }

  static update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<DatabaseResult<QueryResult>> {
    const db = window.api.db;
    const dataKeys = Object.keys(data);
    const whereKeys = Object.keys(where);
    
    const setClauses = dataKeys.map(key => `${key} = ?`).join(', ');
    const whereClauses = whereKeys.map(key => `${key} = ?`).join(' AND ');
    const params = [...dataKeys.map(key => data[key]), ...whereKeys.map(key => where[key])];

    return db.execute(
      `UPDATE ${table} SET ${setClauses} WHERE ${whereClauses}`,
      params
    );
  }

  static delete(table: string, where: Record<string, any>): Promise<DatabaseResult<QueryResult>> {
    const db = window.api.db;
    const whereKeys = Object.keys(where);
    const whereClauses = whereKeys.map(key => `${key} = ?`).join(' AND ');
    const params = whereKeys.map(key => where[key]);

    return db.execute(`DELETE FROM ${table} WHERE ${whereClauses}`, params);
  }
}

/**
 * Database error types
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Database hooks for React components
 */
export interface UseDatabaseQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<DatabaseResult<T>>;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Helper function to handle database results
 */
export function unwrapDatabaseResult<T>(result: DatabaseResult<T>): T {
  if (!result.success) {
    throw new DatabaseError(result.error || 'Database operation failed');
  }
  return result.data as T;
}

/**
 * Type guard for database result
 */
export function isDatabaseSuccess<T>(result: DatabaseResult<T>): result is { success: true; data: T } {
  return result.success === true;
}