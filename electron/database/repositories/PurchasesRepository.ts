/**
 * Purchases Repository
 * Manages purchase transactions and purchase items with complex business logic
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Purchase {
  id: string;
  bill_number: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom' | 'credit';
  account_id?: string;
  cheque_account_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit: string;
  created_at: string;
}

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
}

export interface CreatePurchaseInput {
  id: string;
  bill_number: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
  account_id?: string;
  cheque_account_id?: string;
  notes?: string;
  items: {
    id: string;
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    unit: string;
  }[];
}

export interface UpdatePurchaseInput {
  bill_number?: string;
  supplier_id?: string;
  supplier_name?: string;
  purchase_date?: string;
  subtotal?: number;
  discount_amount?: number;
  discount_percent?: number;
  total_amount?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'cheque';
  account_id?: string;
  cheque_account_id?: string;
  notes?: string;
}

export class PurchasesRepository extends BaseRepository<Purchase> {
  constructor(db: Database) {
    super(db, 'purchases');
  }

  /**
   * Get all purchases with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Purchase[]> {
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

      // Always sort by purchase_date DESC, then created_at DESC, then id DESC for consistent chronological order
      sql += ` ORDER BY purchase_date DESC, created_at DESC, id DESC`;

      // Apply pagination if provided
      if (options?.pagination) {
        const limit = options.pagination.limit || 50;
        const page = options.pagination.page || 1;
        const offset = (page - 1) * limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
      }

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Purchase[];
    } catch (error) {
      throw new Error(`Error fetching purchases: ${error}`);
    }
  }

  /**
   * Get purchase by ID with items
   */
  async getById(id: string): Promise<PurchaseWithItems | null> {
    try {
      const purchase = await super.getById(id);
      if (!purchase) return null;

      const items = await this.getPurchaseItems(id);
      return { ...purchase, items };
    } catch (error) {
      throw new Error(`Error fetching purchase with items: ${error}`);
    }
  }

  /**
   * Get purchase items for a specific purchase
   */
  async getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]> {
    try {
      const sql = `SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY created_at ASC`;
      const stmt = this.db.prepare(sql);
      return stmt.all(purchaseId) as PurchaseItem[];
    } catch (error) {
      throw new Error(`Error fetching purchase items: ${error}`);
    }
  }

  /**
   * Create a new purchase with items in a transaction
   */
  async createWithItems(data: CreatePurchaseInput): Promise<string> {
    const createPurchase = this.db.transaction((purchaseData: CreatePurchaseInput) => {
      // Insert purchase
      const { items, ...purchaseRecord } = purchaseData;
      const purchaseKeys = Object.keys(purchaseRecord);
      const purchaseValues = Object.values(purchaseRecord);
      const purchasePlaceholders = purchaseKeys.map(() => '?').join(', ');

      const purchaseStmt = this.db.prepare(
        `INSERT INTO purchases (${purchaseKeys.join(', ')}) VALUES (${purchasePlaceholders})`
      );
      purchaseStmt.run(...purchaseValues);

      // Insert purchase items and update stock
      for (const item of items) {
        const itemData = { ...item, purchase_id: purchaseData.id };
        const itemKeys = Object.keys(itemData);
        const itemValues = Object.values(itemData);
        const itemPlaceholders = itemKeys.map(() => '?').join(', ');

        const itemStmt = this.db.prepare(
          `INSERT INTO purchase_items (${itemKeys.join(', ')}) VALUES (${itemPlaceholders})`
        );
        itemStmt.run(...itemValues);

        // Update stock quantity and purchase price
        // Using latest purchase price (can be changed to weighted average if needed)
        const updateStockStmt = this.db.prepare(
          `UPDATE items SET stock_quantity = stock_quantity + ?, purchase_price = ? WHERE id = ?`
        );
        updateStockStmt.run(item.quantity, item.unit_price, item.item_id);
      }

      // Update supplier balance - add total_amount (what we owe supplier)
      // If a payment is made, it will reduce this balance accordingly
      const updateSupplierStmt = this.db.prepare(
        `UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?`
      );
      updateSupplierStmt.run(purchaseData.total_amount, purchaseData.supplier_id);

      // Create transaction record for the purchase
      const transactionId = `TXN-PURCHASE-${Date.now()}`;
      const createTransactionStmt = this.db.prepare(`
        INSERT INTO transactions (
          id, transaction_date, reference_type, reference_id, 
          supplier_id, direction, amount, description
        ) VALUES (?, ?, 'purchase', ?, ?, 'out', ?, ?)
      `);
      createTransactionStmt.run(
        transactionId,
        purchaseData.purchase_date,
        purchaseData.id,
        purchaseData.supplier_id,
        purchaseData.total_amount,
        `Purchase ${purchaseData.bill_number} - ${purchaseData.supplier_name}`
      );

      return purchaseData.id;
    });

    return createPurchase(data);
  }

  /**
   * Update purchase details (not items)
   */
  async update(id: string, data: UpdatePurchaseInput): Promise<boolean> {
    return super.update(id, data);
  }

  /**
   * Update purchase payment status
   */
  async updatePaymentStatus(id: string, paidAmount: number, paymentStatus: 'paid' | 'partial' | 'due'): Promise<boolean> {
    try {
      const purchase = await super.getById(id);
      if (!purchase) {
        throw new Error(`Purchase not found: ${id}`);
      }

      const dueAmount = purchase.total_amount - paidAmount;

      const sql = `
        UPDATE purchases 
        SET paid_amount = ?, due_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(paidAmount, dueAmount, paymentStatus, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating purchase payment status: ${error}`);
    }
  }

  /**
   * Get purchases by supplier
   */
  async getBySupplier(supplierId: string, options?: QueryOptions): Promise<Purchase[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE supplier_id = ?`;
      const params: any[] = [supplierId];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND purchase_date >= ? AND purchase_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY purchase_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Purchase[];
    } catch (error) {
      throw new Error(`Error fetching purchases by supplier: ${error}`);
    }
  }

  /**
   * Get purchases by date range
   */
  async getPurchasesByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<Purchase[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE purchase_date >= ? AND purchase_date <= ?`;
      const params: any[] = [startDate, endDate];
      
      // Apply additional filters if provided
      if (options?.filters && Object.keys(options.filters).length > 0) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null) {
            sql += ` AND ${key} = ?`;
            params.push(value);
          }
        }
      }
      
      sql += ` ORDER BY purchase_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Purchase[];
    } catch (error) {
      throw new Error(`Error fetching purchases by date range: ${error}`);
    }
  }

  /**
   * Get purchases by payment status
   */
  async getByPaymentStatus(status: 'paid' | 'partial' | 'due', options?: QueryOptions): Promise<Purchase[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE payment_status = ?`;
      const params: any[] = [status];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND purchase_date >= ? AND purchase_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY purchase_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Purchase[];
    } catch (error) {
      throw new Error(`Error fetching purchases by payment status: ${error}`);
    }
  }

  /**
   * Get next bill number
   */
  async getNextBillNumber(): Promise<string> {
    try {
      const sql = `
        SELECT bill_number 
        FROM purchases 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { bill_number: string } | undefined;

      if (!result) {
        return 'BILL-0001';
      }

      // Extract number from bill (assuming format BILL-XXXX)
      const match = result.bill_number.match(/\d+$/);
      if (match) {
        const nextNum = parseInt(match[0]) + 1;
        return `BILL-${nextNum.toString().padStart(4, '0')}`;
      }

      return 'BILL-0001';
    } catch (error) {
      throw new Error(`Error generating next bill number: ${error}`);
    }
  }

  /**
   * Get purchases summary for a date range
   */
  async getPurchasesSummary(startDate?: string, endDate?: string): Promise<{
    totalPurchases: number;
    totalAmount: number;
    totalPaid: number;
    totalDue: number;
    averagePurchaseAmount: number;
  }> {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_purchases,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(due_amount), 0) as total_due,
          COALESCE(AVG(total_amount), 0) as average_purchase_amount
        FROM purchases
      `;
      
      const params: any[] = [];
      if (startDate && endDate) {
        sql += ' WHERE purchase_date >= ? AND purchase_date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += ' WHERE purchase_date >= ?';
        params.push(startDate);
      } else if (endDate) {
        sql += ' WHERE purchase_date <= ?';
        params.push(endDate);
      }
      
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as {
        total_purchases: number;
        total_amount: number;
        total_paid: number;
        total_due: number;
        average_purchase_amount: number;
      };

      return {
        totalPurchases: result.total_purchases,
        totalAmount: result.total_amount,
        totalPaid: result.total_paid,
        totalDue: result.total_due,
        averagePurchaseAmount: result.average_purchase_amount,
      };
    } catch (error) {
      throw new Error(`Error calculating purchases summary: ${error}`);
    }
  }

  /**
   * Get top purchased items from purchases
   */
  async getTopPurchasedItems(limit: number = 10, startDate?: string, endDate?: string): Promise<{
    item_id: string;
    item_name: string;
    totalQuantity: number;
    totalAmount: number;
  }[]> {
    try {
      let sql = `
        SELECT 
          pi.item_id,
          pi.item_name,
          SUM(pi.quantity) as totalQuantity,
          SUM(pi.total_price) as totalAmount
        FROM purchase_items pi
        JOIN purchases p ON pi.purchase_id = p.id
      `;

      const params: any[] = [];

      if (startDate && endDate) {
        sql += ` WHERE p.purchase_date >= ? AND p.purchase_date <= ?`;
        params.push(startDate, endDate);
      }

      sql += `
        GROUP BY pi.item_id, pi.item_name
        ORDER BY totalQuantity DESC
        LIMIT ?
      `;
      params.push(limit);

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as {
        item_id: string;
        item_name: string;
        totalQuantity: number;
        totalAmount: number;
      }[];
    } catch (error) {
      throw new Error(`Error fetching top purchased items: ${error}`);
    }
  }

  /**
   * Get daily purchases report for a date range
   */
  async getDailyPurchasesReport(startDate: string, endDate: string): Promise<{
    date: string;
    purchasesCount: number;
    totalAmount: number;
  }[]> {
    try {
      const sql = `
        SELECT 
          purchase_date as date,
          COUNT(*) as purchasesCount,
          SUM(total_amount) as totalAmount
        FROM purchases
        WHERE purchase_date >= ? AND purchase_date <= ?
        GROUP BY purchase_date
        ORDER BY purchase_date ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(startDate, endDate) as {
        date: string;
        purchasesCount: number;
        totalAmount: number;
      }[];
    } catch (error) {
      throw new Error(`Error generating daily purchases report: ${error}`);
    }
  }

  /**
   * Search purchases by bill number or supplier name
   */
  async search(searchTerm: string): Promise<Purchase[]> {
    return super.search(searchTerm, ['bill_number', 'supplier_name'], {
      sort: { field: 'purchase_date', order: 'DESC' },
    });
  }

  /**
   * Get purchase by bill number
   */
  async getByBillNumber(billNumber: string): Promise<PurchaseWithItems | null> {
    try {
      const purchase = await this.getByField('bill_number', billNumber);
      if (!purchase) return null;

      const items = await this.getPurchaseItems(purchase.id);
      return { ...purchase, items };
    } catch (error) {
      throw new Error(`Error fetching purchase by bill number: ${error}`);
    }
  }
}
