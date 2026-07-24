/**
 * Base Repository Class
 * Provides common CRUD operations, query builder helpers, and transaction support
 * for all entity repositories in the ERP system.
 */

import type { Database } from 'better-sqlite3';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface SortOptions {
  field: string;
  order?: 'ASC' | 'DESC';
}

export interface FilterOptions {
  [key: string]: any;
}

export interface QueryOptions {
  pagination?: PaginationOptions;
  sort?: SortOptions;
  filters?: FilterOptions;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * BaseRepository provides common database operations for all entities
 */
export abstract class BaseRepository<T = any> {
  protected db: Database;
  protected tableName: string;

  constructor(db: Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Get all records from the table with optional filtering, sorting, and pagination
   */
  async getAll(options?: QueryOptions): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      // Apply filters
      if (options?.filters && Object.keys(options.filters).length > 0) {
        const whereClauses: string[] = [];
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null) {
            whereClauses.push(`${key} = ?`);
            params.push(value);
          }
        }
        if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
      }

      // Apply sorting
      if (options?.sort) {
        const order = options.sort.order || 'ASC';
        sql += ` ORDER BY ${options.sort.field} ${order}`;
      }

      // Apply pagination
      if (options?.pagination) {
        const limit = options.pagination.limit || 50;
        const page = options.pagination.page || 1;
        const offset = (page - 1) * limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
      }

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      throw new Error(`Error fetching all ${this.tableName}: ${error}`);
    }
  }

  /**
   * Get paginated results with metadata
   */
  async getPaginated(options: QueryOptions): Promise<PaginatedResult<T>> {
    const page = options.pagination?.page || 1;
    const limit = options.pagination?.limit || 50;

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const countParams: any[] = [];

    if (options.filters && Object.keys(options.filters).length > 0) {
      const whereClauses: string[] = [];
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          whereClauses.push(`${key} = ?`);
          countParams.push(value);
        }
      }
      if (whereClauses.length > 0) {
        countSql += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }

    const countResult = this.db.prepare(countSql).get(...countParams) as { count: number };
    const total = countResult.count;

    // Get data
    const data = await this.getAll(options);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single record by ID
   */
  async getById(id: string | number): Promise<T | null> {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
      const result = stmt.get(id) as T | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`Error fetching ${this.tableName} by ID: ${error}`);
    }
  }

  /**
   * Get a single record by custom field
   */
  async getByField(field: string, value: any): Promise<T | null> {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`);
      const result = stmt.get(value) as T | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`Error fetching ${this.tableName} by ${field}: ${error}`);
    }
  }

  /**
   * Get multiple records by custom field
   */
  async getManyByField(field: string, value: any): Promise<T[]> {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`);
      return stmt.all(value) as T[];
    } catch (error) {
      throw new Error(`Error fetching ${this.tableName} by ${field}: ${error}`);
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<string | number> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');

      const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);

      return typeof result.lastInsertRowid === 'bigint' 
        ? Number(result.lastInsertRowid) 
        : result.lastInsertRowid;
    } catch (error) {
      throw new Error(`Error creating ${this.tableName}: ${error}`);
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string | number, data: Partial<T>): Promise<boolean> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClauses = keys.map(key => `${key} = ?`).join(', ');

      const sql = `UPDATE ${this.tableName} SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating ${this.tableName}: ${error}`);
    }
  }

  /**
   * Delete a record by ID (soft delete by setting status to 'inactive' if status field exists)
   */
  async delete(id: string | number, soft = true): Promise<boolean> {
    try {
      if (soft) {
        // Try soft delete first (set status to inactive) - but catch error if status column doesn't exist
        try {
          const sql = `UPDATE ${this.tableName} SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
          const stmt = this.db.prepare(sql);
          const result = stmt.run(id);
          
          if (result.changes > 0) {
            return true;
          }
        } catch (softDeleteError: any) {
          // If status column doesn't exist, fall through to hard delete
          if (!softDeleteError.message?.includes('no such column: status')) {
            throw softDeleteError;
          }
        }
      }

      // Hard delete if soft delete not requested or table doesn't have status field
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting ${this.tableName}: ${error}`);
    }
  }

  /**
   * Count records with optional filters
   */
  async count(filters?: FilterOptions): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params: any[] = [];

      if (filters && Object.keys(filters).length > 0) {
        const whereClauses: string[] = [];
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            whereClauses.push(`${key} = ?`);
            params.push(value);
          }
        }
        if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
      }

      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    } catch (error) {
      throw new Error(`Error counting ${this.tableName}: ${error}`);
    }
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string | number): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ?`);
      const result = stmt.get(id);
      return !!result;
    } catch (error) {
      throw new Error(`Error checking existence in ${this.tableName}: ${error}`);
    }
  }

  /**
   * Execute a custom query
   */
  async query<R = any>(sql: string, params: any[] = []): Promise<R[]> {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as R[];
    } catch (error) {
      throw new Error(`Error executing query on ${this.tableName}: ${error}`);
    }
  }

  /**
   * Execute a custom query and get single result
   */
  async queryOne<R = any>(sql: string, params: any[] = []): Promise<R | null> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as R | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`Error executing query on ${this.tableName}: ${error}`);
    }
  }

  /**
   * Execute a custom statement (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);
      return {
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      };
    } catch (error) {
      throw new Error(`Error executing statement on ${this.tableName}: ${error}`);
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  async transaction<R = any>(callback: (repo: this) => R): Promise<R> {
    const transaction = this.db.transaction(callback);
    return transaction(this);
  }

  /**
   * Bulk insert multiple records
   */
  async bulkCreate(records: Partial<T>[]): Promise<number> {
    if (records.length === 0) return 0;

    const insertMany = this.db.transaction((items: Partial<T>[]) => {
      let count = 0;
      for (const item of items) {
        this.create(item);
        count++;
      }
      return count;
    });

    return insertMany(records);
  }

  /**
   * Search records by LIKE pattern on specified fields
   */
  async search(searchTerm: string, fields: string[], options?: QueryOptions): Promise<T[]> {
    try {
      const likeClauses = fields.map(field => `${field} LIKE ?`).join(' OR ');
      const searchPattern = `%${searchTerm}%`;
      const params = fields.map(() => searchPattern);

      let sql = `SELECT * FROM ${this.tableName} WHERE ${likeClauses}`;

      // Apply additional filters
      if (options?.filters && Object.keys(options.filters).length > 0) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null) {
            sql += ` AND ${key} = ?`;
            params.push(value);
          }
        }
      }

      // Apply sorting
      if (options?.sort) {
        const order = options.sort.order || 'ASC';
        sql += ` ORDER BY ${options.sort.field} ${order}`;
      }

      // Apply pagination
      if (options?.pagination) {
        const limit = options.pagination.limit || 50;
        const page = options.pagination.page || 1;
        const offset = (page - 1) * limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit as any, offset as any);
      }

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      throw new Error(`Error searching ${this.tableName}: ${error}`);
    }
  }

  /**
   * Get records by date range
   */
  async getByDateRange(dateField: string, startDate: string, endDate: string, options?: QueryOptions): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE ${dateField} >= ? AND ${dateField} <= ?`;
      const params: any[] = [startDate, endDate];

      // Apply additional filters
      if (options?.filters && Object.keys(options.filters).length > 0) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null) {
            sql += ` AND ${key} = ?`;
            params.push(value);
          }
        }
      }

      // Apply sorting
      if (options?.sort) {
        const order = options.sort.order || 'ASC';
        sql += ` ORDER BY ${options.sort.field} ${order}`;
      } else {
        // Default sort by date field descending
        sql += ` ORDER BY ${dateField} DESC`;
      }

      // Apply pagination
      if (options?.pagination) {
        const limit = options.pagination.limit || 50;
        const page = options.pagination.page || 1;
        const offset = (page - 1) * limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
      }

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      throw new Error(`Error fetching ${this.tableName} by date range: ${error}`);
    }
  }
}
