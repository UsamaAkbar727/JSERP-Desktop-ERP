/**
 * Units Repository
 * Manages measurement units for items
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Unit {
  id: string;
  name: string;
  name_urdu?: string;
  symbol: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateUnitInput {
  id: string;
  name: string;
  name_urdu?: string;
  symbol: string;
  status?: 'active' | 'inactive';
}

export interface UpdateUnitInput {
  name?: string;
  name_urdu?: string;
  symbol?: string;
  status?: 'active' | 'inactive';
}

export class UnitsRepository extends BaseRepository<Unit> {
  constructor(db: Database) {
    super(db, 'units');
  }

  /**
   * Get all units with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Unit[]> {
    const defaultOptions: QueryOptions = {
      filters: { status: 'active' },
      sort: { field: 'name', order: 'ASC' },
      ...options,
    };
    return super.getAll(defaultOptions);
  }

  /**
   * Get active units only
   */
  async getActiveUnits(): Promise<Unit[]> {
    return this.getAll({
      filters: { status: 'active' },
      sort: { field: 'name', order: 'ASC' },
    });
  }

  /**
   * Create a new unit
   */
  async create(data: CreateUnitInput): Promise<string> {
    const unitData = {
      ...data,
      status: data.status || 'active',
    };

    await super.create(unitData);
    return data.id;
  }

  /**
   * Update unit details
   */
  async update(id: string, data: UpdateUnitInput): Promise<boolean> {
    return super.update(id, data);
  }

  /**
   * Get unit by symbol
   */
  async getBySymbol(symbol: string): Promise<Unit | null> {
    return this.getByField('symbol', symbol);
  }

  /**
   * Search units by name or symbol
   */
  async search(searchTerm: string): Promise<Unit[]> {
    return super.search(searchTerm, ['name', 'name_urdu', 'symbol'], {
      filters: { status: 'active' },
      sort: { field: 'name', order: 'ASC' },
    });
  }

  /**
   * Check if unit is used by any items
   */
  async isUsedByItems(id: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM items WHERE unit_id = ? LIMIT 1`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get unit usage count (number of items using this unit)
   */
  async getUsageCount(id: string): Promise<number> {
    try {
      const sql = `SELECT COUNT(*) as count FROM items WHERE unit_id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(id) as { count: number };
      return result.count;
    } catch (error) {
      throw new Error(`Error fetching unit usage count: ${error}`);
    }
  }

  /**
   * Get units with their item counts
   */
  async getWithItemCounts(): Promise<(Unit & { itemCount: number })[]> {
    try {
      const sql = `
        SELECT 
          u.*,
          COUNT(i.id) as itemCount
        FROM units u
        LEFT JOIN items i ON u.id = i.unit_id
        GROUP BY u.id
        ORDER BY u.name ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all() as (Unit & { itemCount: number })[];
    } catch (error) {
      throw new Error(`Error fetching units with item counts: ${error}`);
    }
  }

  /**
   * Override delete to prevent deletion of units in use
   */
  async delete(id: string, soft = true): Promise<boolean> {
    const isUsed = await this.isUsedByItems(id);
    
    if (isUsed && !soft) {
      throw new Error('Cannot delete unit that is in use by items. Use soft delete instead.');
    }

    return super.delete(id, soft);
  }

  /**
   * Get common measurement units (for initialization)
   */
  static getCommonUnits(): CreateUnitInput[] {
    return [
      { id: 'pcs', name: 'Pieces', name_urdu: 'عدد', symbol: 'pcs' },
      { id: 'kg', name: 'Kilogram', name_urdu: 'کلوگرام', symbol: 'kg' },
      { id: 'g', name: 'Gram', name_urdu: 'گرام', symbol: 'g' },
      { id: 'l', name: 'Liter', name_urdu: 'لیٹر', symbol: 'L' },
      { id: 'ml', name: 'Milliliter', name_urdu: 'ملی لیٹر', symbol: 'mL' },
      { id: 'm', name: 'Meter', name_urdu: 'میٹر', symbol: 'm' },
      { id: 'cm', name: 'Centimeter', name_urdu: 'سینٹی میٹر', symbol: 'cm' },
      { id: 'box', name: 'Box', name_urdu: 'ڈبہ', symbol: 'box' },
      { id: 'dozen', name: 'Dozen', name_urdu: 'درجن', symbol: 'doz' },
      { id: 'pack', name: 'Pack', name_urdu: 'پیک', symbol: 'pack' },
    ];
  }
}
