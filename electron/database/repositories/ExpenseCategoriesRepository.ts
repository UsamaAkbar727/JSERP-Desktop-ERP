/**
 * Expense Categories Repository
 * Manages expense category master data
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface ExpenseCategory {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseCategoryInput {
  id: string;
  name: string;
  status?: 'active' | 'inactive';
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  status?: 'active' | 'inactive';
}

export class ExpenseCategoriesRepository extends BaseRepository<ExpenseCategory> {
  constructor(db: Database) {
    super(db, 'expense_categories');
  }

  /**
   * Get all expense categories with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<ExpenseCategory[]> {
    const defaultOptions: QueryOptions = {
      sort: { field: 'name', order: 'ASC' },
      ...options,
    };
    return super.getAll(defaultOptions);
  }

  /**
   * Get active expense categories only
   */
  async getActiveCategories(): Promise<ExpenseCategory[]> {
    return this.getAll({
      filters: { status: 'active' },
      sort: { field: 'name', order: 'ASC' },
    });
  }

  /**
   * Create a new expense category
   */
  async create(data: CreateExpenseCategoryInput): Promise<string> {
    const categoryData = {
      ...data,
      status: data.status || 'active',
    };

    await super.create(categoryData);
    return data.id;
  }

  /**
   * Update expense category details
   */
  async update(id: string, data: UpdateExpenseCategoryInput): Promise<boolean> {
    return super.update(id, data);
  }

  /**
   * Delete an expense category (soft delete by default - sets status to inactive)
   */
  async delete(id: string, hardDelete: boolean = false): Promise<boolean> {
    if (hardDelete) {
      // Hard delete - completely remove from database
      return super.delete(id, false); // false means no soft delete
    }
    
    // Soft delete - set status to inactive
    return this.update(id, { status: 'inactive' });
  }

  /**
   * Check if category name already exists (case-insensitive)
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE LOWER(name) = LOWER(?)`;
      const params: any[] = [name];

      if (excludeId) {
        sql += ` AND id != ?`;
        params.push(excludeId);
      }

      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as { count: number };
      return result.count > 0;
    } catch (error) {
      throw new Error(`Error checking category name existence: ${error}`);
    }
  }

  /**
   * Search expense categories by name
   */
  async search(searchTerm: string): Promise<ExpenseCategory[]> {
    return super.search(searchTerm, ['name'], {
      filters: { status: 'active' },
      sort: { field: 'name', order: 'ASC' },
    });
  }

  /**
   * Get category by name
   */
  async getByName(name: string): Promise<ExpenseCategory | null> {
    return this.getByField('name', name);
  }
}
