/**
 * Sales Repository
 * Manages sales transactions and sale items with complex business logic
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'cheque';
  account_id?: string;
  cheque_account_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit: string;
  purchase_price: number;
  profit: number;
  created_at: string;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export interface CreateSaleInput {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'cheque';
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
    purchase_price?: number;  // Optional - will be fetched if not provided
    profit?: number;  // Optional - will be calculated if not provided
  }[];
}

export interface UpdateSaleInput {
  invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  sale_date?: string;
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
  items?: {
    id?: string;
    item_id: string;
    item_name?: string;
    quantity: number;
    unit_price: number;
    total_price?: number;
    unit?: string;
    purchase_price?: number;
    profit?: number;
  }[];
}

export class SalesRepository extends BaseRepository<Sale> {
  constructor(db: Database) {
    super(db, 'sales');
  }

  private toLiveSaleTotals(sale: Sale, liveSubtotal: number): Sale {
    const subtotal = Number.isFinite(liveSubtotal) ? liveSubtotal : Number(sale.subtotal || 0);
    const discount = Number(sale.discount_amount || 0);
    const total = Math.max(0, subtotal - discount);
    const paid = Number(sale.paid_amount || 0);
    const due = Math.max(0, total - paid);
    const status: 'paid' | 'partial' | 'due' = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'due';

    return {
      ...sale,
      subtotal,
      total_amount: total,
      due_amount: due,
      payment_status: status,
    };
  }

  private async applyLiveTotals(sales: Sale[]): Promise<Sale[]> {
    if (!sales.length) return sales;

    const saleIds = sales.map((s) => s.id);
    const placeholders = saleIds.map(() => '?').join(', ');
    const rows = this.db.prepare(
      `SELECT sale_id, COALESCE(SUM(total_price), 0) as items_subtotal
       FROM sale_items
       WHERE sale_id IN (${placeholders})
       GROUP BY sale_id`
    ).all(...saleIds) as Array<{ sale_id: string; items_subtotal: number }>;

    const subtotalMap = new Map(rows.map((r) => [r.sale_id, Number(r.items_subtotal || 0)]));

    return sales.map((sale) => {
      const liveSubtotal = subtotalMap.has(sale.id)
        ? Number(subtotalMap.get(sale.id) || 0)
        : Number(sale.subtotal || 0);
      return this.toLiveSaleTotals(sale, liveSubtotal);
    });
  }

  /**
   * Get all sales with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Sale[]> {
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

      // Always sort by sale_date DESC, then created_at DESC, then id DESC for consistent chronological order
      sql += ` ORDER BY sale_date DESC, created_at DESC, id DESC`;

      // Apply pagination if provided
      if (options?.pagination) {
        const limit = options.pagination.limit || 50;
        const page = options.pagination.page || 1;
        const offset = (page - 1) * limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
      }

      const stmt = this.db.prepare(sql);
      const sales = stmt.all(...params) as Sale[];
      return this.applyLiveTotals(sales);
    } catch (error) {
      throw new Error(`Error fetching sales: ${error}`);
    }
  }

  /**
   * Get sale by ID with items
   */
  async getById(id: string): Promise<SaleWithItems | null> {
    try {
      const sale = await super.getById(id);
      if (!sale) return null;

      const items = await this.getSaleItems(id);
      const liveSubtotal = items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
      return { ...this.toLiveSaleTotals(sale, liveSubtotal), items };
    } catch (error) {
      throw new Error(`Error fetching sale with items: ${error}`);
    }
  }

  /**
   * Get sale items for a specific sale
   */
  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    try {
      const sql = `SELECT * FROM sale_items WHERE sale_id = ? ORDER BY created_at ASC`;
      const stmt = this.db.prepare(sql);
      return stmt.all(saleId) as SaleItem[];
    } catch (error) {
      throw new Error(`Error fetching sale items: ${error}`);
    }
  }

  /**
   * Create a new sale with items in a transaction
   * Also updates customer balance and decreases stock
   */
  async create(data: CreateSaleInput): Promise<string> {
    const createSale = this.db.transaction((saleData: CreateSaleInput) => {
      // Insert sale
      const { items, ...saleRecord } = saleData;
      const saleKeys = Object.keys(saleRecord);
      const saleValues = Object.values(saleRecord);
      const salePlaceholders = saleKeys.map(() => '?').join(', ');

      const saleStmt = this.db.prepare(
        `INSERT INTO sales (${saleKeys.join(', ')}) VALUES (${salePlaceholders})`
      );
      saleStmt.run(...saleValues);

      // Insert sale items
      for (const item of items) {
        // Get purchase price from items table
        const itemInfoStmt = this.db.prepare(
          `SELECT purchase_price FROM items WHERE id = ?`
        );
        const itemInfo = itemInfoStmt.get(item.item_id) as { purchase_price: number } | undefined;
        const purchasePrice = itemInfo?.purchase_price || 0;
        
        // Calculate profit: (sale price - purchase price) * quantity
        const profit = (item.unit_price - purchasePrice) * item.quantity;
        
        const itemData = { 
          ...item, 
          sale_id: saleData.id,
          purchase_price: purchasePrice,
          profit: profit
        };
        const itemKeys = Object.keys(itemData);
        const itemValues = Object.values(itemData);
        const itemPlaceholders = itemKeys.map(() => '?').join(', ');

        const itemStmt = this.db.prepare(
          `INSERT INTO sale_items (${itemKeys.join(', ')}) VALUES (${itemPlaceholders})`
        );
        itemStmt.run(...itemValues);

        // Decrease stock quantity
        const updateStockStmt = this.db.prepare(
          `UPDATE items SET stock_quantity = stock_quantity - ? WHERE id = ?`
        );
        updateStockStmt.run(item.quantity, item.item_id);
      }

      // Update customer balance - add total_amount (what customer owes us)
      // If a payment is made, it will reduce this balance accordingly
      const updateCustomerStmt = this.db.prepare(
        `UPDATE customers SET current_balance = current_balance + ? WHERE id = ?`
      );
      updateCustomerStmt.run(saleData.total_amount, saleData.customer_id);

      // Create transaction record for the sale
      const transactionId = `TXN-SALE-${Date.now()}`;
      const createTransactionStmt = this.db.prepare(`
        INSERT INTO transactions (
          id, transaction_date, reference_type, reference_id, 
          customer_id, direction, amount, description
        ) VALUES (?, ?, 'sale', ?, ?, 'in', ?, ?)
      `);
      createTransactionStmt.run(
        transactionId,
        saleData.sale_date,
        saleData.id,
        saleData.customer_id,
        saleData.total_amount,
        `Sale ${saleData.invoice_number} - ${saleData.customer_name}`
      );

      return saleData.id;
    });

    return createSale(data);
  }

  /**
   * Update sale details with optional item updates in a transaction
   */
  async update(id: string, data: UpdateSaleInput): Promise<boolean> {
    try {
      const updateSaleTx = this.db.transaction((saleId: string, updateData: UpdateSaleInput) => {
        const existingSaleStmt = this.db.prepare(`SELECT * FROM sales WHERE id = ?`);
        const existingSale = existingSaleStmt.get(saleId) as Sale | undefined;
        if (!existingSale) {
          throw new Error(`Sale not found: ${saleId}`);
        }

        const existingItemsStmt = this.db.prepare(`SELECT * FROM sale_items WHERE sale_id = ?`);
        const existingItems = existingItemsStmt.all(saleId) as SaleItem[];

        let nextSubtotal = updateData.subtotal ?? (existingSale.subtotal || 0);

        // If items are provided, replace sale items and compute subtotal from latest items.
        if (Array.isArray(updateData.items)) {
          // Restore stock from previous items before rewriting them.
          const restoreStockStmt = this.db.prepare(
            `UPDATE items SET stock_quantity = stock_quantity + ? WHERE id = ?`
          );
          for (const oldItem of existingItems) {
            restoreStockStmt.run(oldItem.quantity, oldItem.item_id);
          }

          // Replace items
          this.db.prepare(`DELETE FROM sale_items WHERE sale_id = ?`).run(saleId);

          const insertItemStmt = this.db.prepare(
            `INSERT INTO sale_items (
              id, sale_id, item_id, item_name, quantity, unit_price, total_price, unit, purchase_price, profit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          );

          const itemInfoStmt = this.db.prepare(`SELECT name, unit, purchase_price FROM items WHERE id = ?`);
          const decrementStockStmt = this.db.prepare(
            `UPDATE items SET stock_quantity = stock_quantity - ? WHERE id = ?`
          );

          nextSubtotal = 0;
          for (const item of updateData.items) {
            const itemInfo = itemInfoStmt.get(item.item_id) as { name: string; unit: string; purchase_price: number } | undefined;
            if (!itemInfo) {
              throw new Error(`Item not found: ${item.item_id}`);
            }

            const quantity = Number(item.quantity || 0);
            const unitPrice = Number(item.unit_price || 0);
            const totalPrice = Number(item.total_price ?? quantity * unitPrice);
            const purchasePrice = Number(item.purchase_price ?? itemInfo.purchase_price ?? 0);
            const profit = Number(item.profit ?? ((unitPrice - purchasePrice) * quantity));
            const itemId = item.id || `SI-${saleId}-${item.item_id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

            insertItemStmt.run(
              itemId,
              saleId,
              item.item_id,
              item.item_name || itemInfo.name,
              quantity,
              unitPrice,
              totalPrice,
              item.unit || itemInfo.unit || 'pcs',
              purchasePrice,
              profit
            );

            decrementStockStmt.run(quantity, item.item_id);
            nextSubtotal += totalPrice;
          }
        }

        const discountAmount = Number(updateData.discount_amount ?? existingSale.discount_amount ?? 0);
        const nextTotal = Math.max(0, nextSubtotal - discountAmount);
        const nextPaid = Number(updateData.paid_amount ?? existingSale.paid_amount ?? 0);
        const nextDue = Math.max(0, nextTotal - nextPaid);
        const nextStatus: 'paid' | 'partial' | 'due' =
          nextDue <= 0 ? 'paid' : nextPaid > 0 ? 'partial' : 'due';

        const nextCustomerId = updateData.customer_id ?? existingSale.customer_id;
        const oldTotal = Number(existingSale.total_amount || 0);
        const totalDelta = nextTotal - oldTotal;

        // Keep customer balance consistent with invoice total changes.
        if (nextCustomerId !== existingSale.customer_id) {
          this.db.prepare(
            `UPDATE customers SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
          ).run(oldTotal, existingSale.customer_id);
          this.db.prepare(
            `UPDATE customers SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
          ).run(nextTotal, nextCustomerId);
        } else if (totalDelta !== 0) {
          this.db.prepare(
            `UPDATE customers SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
          ).run(totalDelta, nextCustomerId);
        }

        const saleUpdatePayload: UpdateSaleInput = {
          ...updateData,
          subtotal: nextSubtotal,
          total_amount: nextTotal,
          due_amount: nextDue,
          payment_status: nextStatus,
        };
        delete saleUpdatePayload.items;

        const keys = Object.keys(saleUpdatePayload);
        if (keys.length > 0) {
          const values = Object.values(saleUpdatePayload);
          const setClauses = keys.map((key) => `${key} = ?`).join(', ');
          const updateSaleStmt = this.db.prepare(
            `UPDATE sales SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
          );
          const result = updateSaleStmt.run(...values, saleId);
          if (result.changes <= 0) {
            throw new Error('Failed to update sale');
          }
        }

        // Keep the sale transaction amount aligned with current invoice total.
        this.db.prepare(
          `UPDATE transactions
           SET amount = ?, description = ?, transaction_date = COALESCE(?, transaction_date)
           WHERE reference_type = 'sale' AND reference_id = ?`
        ).run(
          nextTotal,
          `Sale ${updateData.invoice_number ?? existingSale.invoice_number} - ${updateData.customer_name ?? existingSale.customer_name}`,
          updateData.sale_date,
          saleId
        );

        return true;
      });

      return updateSaleTx(id, data);
    } catch (error) {
      throw new Error(`Error updating sale: ${error}`);
    }
  }

  /**
   * Update sale payment status
   */
  async updatePaymentStatus(id: string, paidAmount: number, paymentStatus: 'paid' | 'partial' | 'due'): Promise<boolean> {
    try {
      const sale = await super.getById(id);
      if (!sale) {
        throw new Error(`Sale not found: ${id}`);
      }

      const saleItems = await this.getSaleItems(id);
      const liveSubtotal = saleItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
      const liveSale = this.toLiveSaleTotals(sale, liveSubtotal);
      const dueAmount = Math.max(0, liveSale.total_amount - paidAmount);

      const sql = `
        UPDATE sales 
        SET paid_amount = ?, due_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(paidAmount, dueAmount, paymentStatus, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating sale payment status: ${error}`);
    }
  }

  /**
   * Get sales by customer
   */
  async getByCustomer(customerId: string, options?: QueryOptions): Promise<Sale[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE customer_id = ?`;
      const params: any[] = [customerId];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND sale_date >= ? AND sale_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY sale_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      const sales = stmt.all(...params) as Sale[];
      return this.applyLiveTotals(sales);
    } catch (error) {
      throw new Error(`Error fetching sales by customer: ${error}`);
    }
  }

  /**
   * Get sales by date range
   */
  async getSalesByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<Sale[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE sale_date >= ? AND sale_date <= ?`;
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
      
      sql += ` ORDER BY sale_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      const sales = stmt.all(...params) as Sale[];
      return this.applyLiveTotals(sales);
    } catch (error) {
      throw new Error(`Error fetching sales by date range: ${error}`);
    }
  }

  /**
   * Get sales by payment status
   */
  async getByPaymentStatus(status: 'paid' | 'partial' | 'due', options?: QueryOptions): Promise<Sale[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE payment_status = ?`;
      const params: any[] = [status];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND sale_date >= ? AND sale_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY sale_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      const sales = stmt.all(...params) as Sale[];
      return this.applyLiveTotals(sales);
    } catch (error) {
      throw new Error(`Error fetching sales by payment status: ${error}`);
    }
  }

  /**
   * Get next invoice number
   */
  async getNextInvoiceNumber(): Promise<string> {
    try {
      const sql = `
        SELECT invoice_number 
        FROM sales 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { invoice_number: string } | undefined;

      if (!result) {
        return 'INV-0001';
      }

      // Extract number from invoice (assuming format INV-XXXX)
      const match = result.invoice_number.match(/\d+$/);
      if (match) {
        const nextNum = parseInt(match[0]) + 1;
        return `INV-${nextNum.toString().padStart(4, '0')}`;
      }

      return 'INV-0001';
    } catch (error) {
      throw new Error(`Error generating next invoice number: ${error}`);
    }
  }

  /**
   * Get sales summary for a date range
   */
  async getSalesSummary(startDate?: string, endDate?: string): Promise<{
    totalSales: number;
    totalAmount: number;
    totalPaid: number;
    totalDue: number;
    averageSaleAmount: number;
  }> {
    try {
      const liveTotalExpr = `MAX(0, COALESCE(si.items_subtotal, s.subtotal) - COALESCE(s.discount_amount, 0))`;
      let sql = `
        SELECT
          COUNT(*) as total_sales,
          COALESCE(SUM(${liveTotalExpr}), 0) as total_amount,
          COALESCE(SUM(s.paid_amount), 0) as total_paid,
          COALESCE(SUM(MAX(0, ${liveTotalExpr} - COALESCE(s.paid_amount, 0))), 0) as total_due,
          COALESCE(AVG(${liveTotalExpr}), 0) as average_sale_amount
        FROM sales s
        LEFT JOIN (
          SELECT sale_id, COALESCE(SUM(total_price), 0) as items_subtotal
          FROM sale_items
          GROUP BY sale_id
        ) si ON si.sale_id = s.id
      `;
      
      const params: any[] = [];
      if (startDate && endDate) {
        sql += ' WHERE s.sale_date >= ? AND s.sale_date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += ' WHERE s.sale_date >= ?';
        params.push(startDate);
      } else if (endDate) {
        sql += ' WHERE s.sale_date <= ?';
        params.push(endDate);
      }
      
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as {
        total_sales: number;
        total_amount: number;
        total_paid: number;
        total_due: number;
        average_sale_amount: number;
      };

      return {
        totalSales: result.total_sales,
        totalAmount: result.total_amount,
        totalPaid: result.total_paid,
        totalDue: result.total_due,
        averageSaleAmount: result.average_sale_amount,
      };
    } catch (error) {
      throw new Error(`Error calculating sales summary: ${error}`);
    }
  }

  /**
   * Calculate Cost of Goods Sold (COGS) for a date range
   * COGS = Sum of (quantity_sold * purchase_price) for all items sold in the period
   */
  async getCOGS(startDate?: string, endDate?: string): Promise<number> {
    try {
      let sql = `
        SELECT 
          COALESCE(SUM(si.quantity * i.purchase_price), 0) as cogs
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN items i ON si.item_id = i.id
      `;
      
      const params: any[] = [];
      if (startDate && endDate) {
        sql += ' WHERE s.sale_date >= ? AND s.sale_date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += ' WHERE s.sale_date >= ?';
        params.push(startDate);
      } else if (endDate) {
        sql += ' WHERE s.sale_date <= ?';
        params.push(endDate);
      }
      
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as { cogs: number };
      console.log('🔍 COGS Calculation:', { startDate, endDate, cogs: result.cogs });
      return result.cogs;
    } catch (error) {
      console.error('❌ COGS Error:', error);
      throw new Error(`Error calculating COGS: ${error}`);
    }
  }

  /**
   * Get top selling items from sales
   */
  async getTopSellingItems(limit: number = 10, startDate?: string, endDate?: string): Promise<{
    item_id: string;
    item_name: string;
    totalQuantity: number;
    totalAmount: number;
  }[]> {
    try {
      let sql = `
        SELECT 
          si.item_id,
          si.item_name,
          SUM(si.quantity) as totalQuantity,
          SUM(si.total_price) as totalAmount
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
      `;

      const params: any[] = [];

      if (startDate && endDate) {
        sql += ` WHERE s.sale_date >= ? AND s.sale_date <= ?`;
        params.push(startDate, endDate);
      }

      sql += `
        GROUP BY si.item_id, si.item_name
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
      console.error('[SalesRepository.getTopSellingItems] Error:', error);
      throw new Error(`Error fetching top selling items: ${error}`);
    }
  }

  /**
   * Get daily sales report for a date range
   */
  async getDailySalesReport(startDate: string, endDate: string): Promise<{
    date: string;
    salesCount: number;
    totalAmount: number;
  }[]> {
    try {
      const sql = `
        SELECT
          s.sale_date as date,
          COUNT(*) as salesCount,
          COALESCE(SUM(MAX(0, COALESCE(si.items_subtotal, s.subtotal) - COALESCE(s.discount_amount, 0))), 0) as totalAmount
        FROM sales s
        LEFT JOIN (
          SELECT sale_id, COALESCE(SUM(total_price), 0) as items_subtotal
          FROM sale_items
          GROUP BY sale_id
        ) si ON si.sale_id = s.id
        WHERE s.sale_date >= ? AND s.sale_date <= ?
        GROUP BY s.sale_date
        ORDER BY s.sale_date ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(startDate, endDate) as {
        date: string;
        salesCount: number;
        totalAmount: number;
      }[];
    } catch (error) {
      throw new Error(`Error generating daily sales report: ${error}`);
    }
  }

  /**
   * Search sales by invoice number or customer name
   */
  async search(searchTerm: string): Promise<Sale[]> {
    return super.search(searchTerm, ['invoice_number', 'customer_name'], {
      sort: { field: 'sale_date', order: 'DESC' },
    });
  }

  /**
   * Get sale by invoice number
   */
  async getByInvoiceNumber(invoiceNumber: string): Promise<SaleWithItems | null> {
    try {
      const sale = await this.getByField('invoice_number', invoiceNumber);
      if (!sale) return null;

      const items = await this.getSaleItems(sale.id);
      const liveSubtotal = items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
      return { ...this.toLiveSaleTotals(sale, liveSubtotal), items };
    } catch (error) {
      throw new Error(`Error fetching sale by invoice number: ${error}`);
    }
  }
}
