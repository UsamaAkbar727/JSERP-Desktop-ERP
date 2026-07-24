/**
 * Items Repository
 * Manages inventory items and stock levels
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Item {
  id: string;
  name: string;
  name_urdu?: string;
  sku?: string;
  description?: string;
  sale_price: number;
  purchase_price: number;
  opening_stock: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit_id: string;
  unit: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateItemInput {
  id: string;
  name: string;
  name_urdu?: string;
  sku?: string;
  description?: string;
  sale_price: number;
  purchase_price: number;
  opening_stock?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  unit_id: string;
  unit: string;
  status?: 'active' | 'inactive';
}

export interface UpdateItemInput {
  name?: string;
  name_urdu?: string;
  sku?: string;
  description?: string;
  sale_price?: number;
  purchase_price?: number;
  low_stock_threshold?: number;
  unit_id?: string;
  unit?: string;
  status?: 'active' | 'inactive';
}

export class ItemsRepository extends BaseRepository<Item> {
  constructor(db: Database) {
    super(db, 'items');
  }

  /**
   * Get all items with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Item[]> {
    const defaultOptions: QueryOptions = {
      sort: { field: 'created_at', order: 'DESC' },
      ...options,
    };
    return super.getAll(defaultOptions);
  }

  /**
   * Get active items only
   */
  async getActiveItems(): Promise<Item[]> {
    return this.getAll({
      filters: { status: 'active' },
      sort: { field: 'created_at', order: 'DESC' },
    });
  }

  /**
   * Create a new item
   */
  async create(data: CreateItemInput): Promise<string> {
    const itemData = {
      ...data,
      opening_stock: data.opening_stock || 0,
      stock_quantity: data.stock_quantity !== undefined ? data.stock_quantity : (data.opening_stock || 0),
      low_stock_threshold: data.low_stock_threshold || 0,
      status: data.status || 'active',
    };

    await super.create(itemData);
    return data.id;
  }

  /**
   * Update item details (not stock)
   */
  async update(id: string, data: UpdateItemInput): Promise<boolean> {
    return super.update(id, data);
  }

  /**
   * Update item stock quantity
   */
  async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set' = 'set'): Promise<boolean> {
    try {
      const item = await this.getById(id);
      if (!item) {
        throw new Error(`Item not found: ${id}`);
      }

      let newStock: number;
      switch (operation) {
        case 'add':
          newStock = item.stock_quantity + quantity;
          break;
        case 'subtract':
          newStock = item.stock_quantity - quantity;
          break;
        case 'set':
          newStock = quantity;
          break;
      }

      // Prevent negative stock
      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current: ${item.stock_quantity}, Requested: ${quantity}`);
      }

      const sql = `UPDATE items SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(newStock, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating item stock: ${error}`);
    }
  }

  /**
   * Adjust stock for sale (subtract)
   */
  async adjustStockForSale(itemId: string, quantity: number): Promise<boolean> {
    return this.updateStock(itemId, quantity, 'subtract');
  }

  /**
   * Adjust stock for purchase (add)
   */
  async adjustStockForPurchase(itemId: string, quantity: number): Promise<boolean> {
    return this.updateStock(itemId, quantity, 'add');
  }

  /**
   * Get items with low stock (below threshold)
   */
  async getLowStock(): Promise<Item[]> {
    try {
      const sql = `
        SELECT * FROM items 
        WHERE status = 'active' AND stock_quantity <= low_stock_threshold
        ORDER BY stock_quantity ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all() as Item[];
    } catch (error) {
      throw new Error(`Error fetching low stock items: ${error}`);
    }
  }

  /**
   * Get items with out of stock
   */
  async getOutOfStock(): Promise<Item[]> {
    try {
      const sql = `
        SELECT * FROM items 
        WHERE status = 'active' AND stock_quantity = 0
        ORDER BY name ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all() as Item[];
    } catch (error) {
      throw new Error(`Error fetching out of stock items: ${error}`);
    }
  }

  /**
   * Search items by name or SKU
   */
  async search(searchTerm: string): Promise<Item[]> {
    return super.search(searchTerm, ['name', 'name_urdu', 'sku', 'description'], {
      filters: { status: 'active' },
      sort: { field: 'created_at', order: 'DESC' },
    });
  }

  /**
   * Get item by SKU
   */
  async getBySku(sku: string): Promise<Item | null> {
    return this.getByField('sku', sku);
  }

  /**
   * Get items by unit
   */
  async getByUnit(unitId: string): Promise<Item[]> {
    return this.getManyByField('unit_id', unitId);
  }

  /**
   * Get total inventory value (at purchase price)
   */
  async getTotalInventoryValue(): Promise<number> {
    try {
      const sql = `
        SELECT SUM(stock_quantity * purchase_price) as total 
        FROM items 
        WHERE status = 'active'
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { total: number | null };
      return result.total || 0;
    } catch (error) {
      throw new Error(`Error calculating total inventory value: ${error}`);
    }
  }

  /**
   * Get total inventory value at sale price
   */
  async getTotalInventoryValueAtSalePrice(): Promise<number> {
    try {
      const sql = `
        SELECT SUM(stock_quantity * sale_price) as total 
        FROM items 
        WHERE status = 'active'
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { total: number | null };
      return result.total || 0;
    } catch (error) {
      throw new Error(`Error calculating total inventory value at sale price: ${error}`);
    }
  }

  /**
   * Get inventory statistics
   */
  async getStatistics(): Promise<{
    totalItems: number;
    activeItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalInventoryValue: number;
  }> {
    try {
      const totalItems = await this.count();
      const activeItems = await this.count({ status: 'active' });
      const lowStockItems = (await this.getLowStock()).length;
      const outOfStockItems = (await this.getOutOfStock()).length;
      const totalInventoryValue = await this.getTotalInventoryValue();

      return {
        totalItems,
        activeItems,
        lowStockItems,
        outOfStockItems,
        totalInventoryValue,
      };
    } catch (error) {
      throw new Error(`Error calculating inventory statistics: ${error}`);
    }
  }

  /**
   * Get top selling items
   */
  async getTopSellingItems(limit: number = 10): Promise<(Item & { totalSold: number })[]> {
    try {
      const sql = `
        SELECT 
          i.*,
          COALESCE(SUM(si.quantity), 0) as totalSold
        FROM items i
        LEFT JOIN sale_items si ON i.id = si.item_id
        WHERE i.status = 'active'
        GROUP BY i.id
        ORDER BY totalSold DESC
        LIMIT ?
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(limit) as (Item & { totalSold: number })[];
    } catch (error) {
      throw new Error(`Error fetching top selling items: ${error}`);
    }
  }

  /**
   * Get items with profit margin analysis
   */
  async getWithProfitMargins(): Promise<(Item & { 
    profitMargin: number; 
    profitPercentage: number 
  })[]> {
    try {
      const sql = `
        SELECT 
          *,
          (sale_price - purchase_price) as profitMargin,
          CASE 
            WHEN purchase_price > 0 
            THEN ((sale_price - purchase_price) / purchase_price * 100)
            ELSE 0 
          END as profitPercentage
        FROM items
        WHERE status = 'active'
        ORDER BY profitPercentage DESC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all() as (Item & { profitMargin: number; profitPercentage: number })[];
    } catch (error) {
      throw new Error(`Error fetching items with profit margins: ${error}`);
    }
  }

  /**
   * Bulk update prices (e.g., for price adjustments)
   */
  async bulkUpdatePrices(updates: { id: string; sale_price?: number; purchase_price?: number }[]): Promise<number> {
    const updatePrices = this.db.transaction((items: { id: string; sale_price?: number; purchase_price?: number }[]) => {
      let count = 0;
      for (const item of items) {
        const updateData: any = {};
        if (item.sale_price !== undefined) updateData.sale_price = item.sale_price;
        if (item.purchase_price !== undefined) updateData.purchase_price = item.purchase_price;
        
        if (Object.keys(updateData).length > 0) {
          this.update(item.id, updateData);
          count++;
        }
      }
      return count;
    });

    return updatePrices(updates);
  }
}
