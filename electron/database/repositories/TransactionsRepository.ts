/**
 * Transactions Repository
 * Manages ledger transaction entries for comprehensive financial tracking
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Transaction {
  id: string;
  transaction_date: string;
  reference_type: 'sale' | 'purchase' | 'customer_payment' | 'supplier_payment' | 'expense';
  reference_id: string;
  account_id?: string;
  customer_id?: string;
  supplier_id?: string;
  direction: 'in' | 'out';
  amount: number;
  balance_after?: number;
  description: string;
  created_at: string;
}

export interface CreateTransactionInput {
  id: string;
  transaction_date: string;
  reference_type: 'sale' | 'purchase' | 'customer_payment' | 'supplier_payment' | 'expense';
  reference_id: string;
  account_id?: string;
  customer_id?: string;
  supplier_id?: string;
  direction: 'in' | 'out';
  amount: number;
  balance_after?: number;
  description: string;
}

export class TransactionsRepository extends BaseRepository<Transaction> {
  constructor(db: Database) {
    super(db, 'transactions');
  }

  /**
   * Get all transactions with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Transaction[]> {
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

      // Always sort by transaction_date DESC, then created_at DESC, then id DESC for consistent chronological order
      sql += ` ORDER BY transaction_date DESC, created_at DESC, id DESC`;

      // Apply pagination if provided
      if (options?.pagination) {
        const limit = options.pagination.limit || 50;
        const page = options.pagination.page || 1;
        const offset = (page - 1) * limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
      }

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Transaction[];
    } catch (error) {
      throw new Error(`Error fetching transactions: ${error}`);
    }
  }

  /**
   * Create a new transaction
   */
  async create(data: CreateTransactionInput): Promise<string> {
    await super.create(data);
    return data.id;
  }

  /**
   * Get transactions by account
   */
  async getByAccount(accountId: string, options?: QueryOptions): Promise<Transaction[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE account_id = ?`;
      const params: any[] = [accountId];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND transaction_date >= ? AND transaction_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY transaction_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Transaction[];
    } catch (error) {
      throw new Error(`Error fetching transactions by account: ${error}`);
    }
  }

  /**
   * Get transactions by customer
   */
  async getByCustomer(customerId: string, options?: QueryOptions): Promise<Transaction[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE customer_id = ?`;
      const params: any[] = [customerId];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND transaction_date >= ? AND transaction_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY transaction_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Transaction[];
    } catch (error) {
      throw new Error(`Error fetching transactions by customer: ${error}`);
    }
  }

  /**
   * Get transactions by supplier
   */
  async getBySupplier(supplierId: string, options?: QueryOptions): Promise<Transaction[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE supplier_id = ?`;
      const params: any[] = [supplierId];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND transaction_date >= ? AND transaction_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY transaction_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Transaction[];
    } catch (error) {
      throw new Error(`Error fetching transactions by supplier: ${error}`);
    }
  }

  /**
   * Get transactions by reference type
   */
  async getByReferenceType(
    referenceType: 'sale' | 'purchase' | 'customer_payment' | 'supplier_payment',
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.getAll({
      filters: { reference_type: referenceType },
      sort: { field: 'transaction_date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<Transaction[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE transaction_date >= ? AND transaction_date <= ?`;
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
      
      sql += ` ORDER BY transaction_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Transaction[];
    } catch (error) {
      throw new Error(`Error fetching transactions by date range: ${error}`);
    }
  }

  /**
   * Get transactions by direction (in/out)
   */
  async getByDirection(direction: 'in' | 'out', options?: QueryOptions): Promise<Transaction[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE direction = ?`;
      const params: any[] = [direction];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND transaction_date >= ? AND transaction_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY transaction_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Transaction[];
    } catch (error) {
      throw new Error(`Error fetching transactions by direction: ${error}`);
    }
  }

  /**
   * Get ledger for an account with running balance
   */
  async getAccountLedger(accountId: string, startDate?: string, endDate?: string): Promise<(Transaction & {
    account_name?: string;
  })[]> {
    try {
      let sql = `
        SELECT 
          t.*,
          a.account_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.account_id = ?
      `;

      const params: any[] = [accountId];

      if (startDate && endDate) {
        sql += ` AND t.transaction_date >= ? AND t.transaction_date <= ?`;
        params.push(startDate, endDate);
      }

      sql += ` ORDER BY t.transaction_date ASC, t.created_at ASC, t.id ASC`;

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as (Transaction & { account_name?: string })[];
    } catch (error) {
      throw new Error(`Error fetching account ledger: ${error}`);
    }
  }

  /**
   * Get ledger for a customer with running balance
   */
  async getCustomerLedger(customerId: string, startDate?: string, endDate?: string): Promise<(Transaction & {
    customer_name?: string;
  })[]> {
    try {
      let sql = `
        SELECT 
          t.*,
          c.name as customer_name
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.customer_id = ?
      `;

      const params: any[] = [customerId];

      if (startDate && endDate) {
        sql += ` AND t.transaction_date >= ? AND t.transaction_date <= ?`;
        params.push(startDate, endDate);
      }

      sql += ` ORDER BY t.transaction_date ASC, t.created_at ASC, t.id ASC`;

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as (Transaction & { customer_name?: string })[];
    } catch (error) {
      throw new Error(`Error fetching customer ledger: ${error}`);
    }
  }

  /**
   * Get ledger for a supplier with running balance
   */
  async getSupplierLedger(supplierId: string, startDate?: string, endDate?: string): Promise<(Transaction & {
    supplier_name?: string;
  })[]> {
    try {
      let sql = `
        SELECT 
          t.*,
          s.name as supplier_name
        FROM transactions t
        LEFT JOIN suppliers s ON t.supplier_id = s.id
        WHERE t.supplier_id = ?
      `;

      const params: any[] = [supplierId];

      if (startDate && endDate) {
        sql += ` AND t.transaction_date >= ? AND t.transaction_date <= ?`;
        params.push(startDate, endDate);
      }

      sql += ` ORDER BY t.transaction_date ASC, t.created_at ASC, t.id ASC`;

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as (Transaction & { supplier_name?: string })[];
    } catch (error) {
      throw new Error(`Error fetching supplier ledger: ${error}`);
    }
  }

  /**
   * Get transaction summary for a date range
   */
  async getTransactionSummary(startDate: string, endDate: string): Promise<{
    totalTransactions: number;
    totalIn: number;
    totalOut: number;
    netAmount: number;
  }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as total_in,
          SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as total_out
        FROM transactions
        WHERE transaction_date >= ? AND transaction_date <= ?
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(startDate, endDate) as {
        total_transactions: number;
        total_in: number;
        total_out: number;
      };

      return {
        totalTransactions: result.total_transactions,
        totalIn: result.total_in,
        totalOut: result.total_out,
        netAmount: result.total_in - result.total_out,
      };
    } catch (error) {
      throw new Error(`Error calculating transaction summary: ${error}`);
    }
  }

  /**
   * Get daily transaction totals for a date range
   */
  async getDailyTransactionReport(startDate: string, endDate: string): Promise<{
    date: string;
    transactionCount: number;
    totalIn: number;
    totalOut: number;
    netAmount: number;
  }[]> {
    try {
      const sql = `
        SELECT 
          transaction_date as date,
          COUNT(*) as transactionCount,
          SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as totalIn,
          SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as totalOut,
          SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END) as netAmount
        FROM transactions
        WHERE transaction_date >= ? AND transaction_date <= ?
        GROUP BY transaction_date
        ORDER BY transaction_date ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(startDate, endDate) as {
        date: string;
        transactionCount: number;
        totalIn: number;
        totalOut: number;
        netAmount: number;
      }[];
    } catch (error) {
      throw new Error(`Error generating daily transaction report: ${error}`);
    }
  }

  /**
   * Get transactions with full entity details
   */
  async getWithEntityDetails(options?: QueryOptions): Promise<(Transaction & {
    account_name?: string;
    customer_name?: string;
    supplier_name?: string;
  })[]> {
    try {
      let sql = `
        SELECT 
          t.*,
          a.account_name,
          c.name as customer_name,
          s.name as supplier_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN suppliers s ON t.supplier_id = s.id
      `;

      const params: any[] = [];
      const whereClauses: string[] = [];

      // Apply filters
      if (options?.filters && Object.keys(options.filters).length > 0) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null) {
            whereClauses.push(`t.${key} = ?`);
            params.push(value);
          }
        }
      }

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      // Apply sorting
      if (options?.sort) {
        const order = options.sort.order || 'DESC';
        sql += ` ORDER BY t.${options.sort.field} ${order}`;
      } else {
        sql += ` ORDER BY t.transaction_date DESC`;
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
      return stmt.all(...params) as (Transaction & {
        account_name?: string;
        customer_name?: string;
        supplier_name?: string;
      })[];
    } catch (error) {
      throw new Error(`Error fetching transactions with entity details: ${error}`);
    }
  }

  /**
   * Search transactions by description
   */
  async search(searchTerm: string): Promise<Transaction[]> {
    return super.search(searchTerm, ['description', 'reference_id'], {
      sort: { field: 'transaction_date', order: 'DESC' },
    });
  }

  /**
   * Get cash flow report (grouped by type)
   */
  async getCashFlowReport(startDate: string, endDate: string): Promise<{
    referenceType: string;
    totalIn: number;
    totalOut: number;
    net: number;
  }[]> {
    try {
      const sql = `
        SELECT 
          reference_type as referenceType,
          SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as totalIn,
          SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as totalOut,
          SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END) as net
        FROM transactions
        WHERE transaction_date >= ? AND transaction_date <= ?
        GROUP BY reference_type
        ORDER BY net DESC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(startDate, endDate) as {
        referenceType: string;
        totalIn: number;
        totalOut: number;
        net: number;
      }[];
    } catch (error) {
      throw new Error(`Error generating cash flow report: ${error}`);
    }
  }

  /**
   * Get comprehensive inflows/outflows summary
   * Includes all transaction types: sales, purchases, expenses, payments
   */
  async getInflowOutflowSummary(startDate?: string, endDate?: string): Promise<{
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    byType: {
      referenceType: string;
      totalIn: number;
      totalOut: number;
      net: number;
    }[];
  }> {
    try {
      // Build date filter clause - only count actual cash flow transactions (payments & expenses)
      // Exclude 'sale' and 'purchase' to avoid double counting with customer_payment and supplier_payment
      const baseWhereClause = `WHERE reference_type NOT IN ('sale', 'purchase')`;
      const dateFilter = startDate && endDate 
        ? ` AND DATE(transaction_date) >= DATE(?) AND DATE(transaction_date) <= DATE(?)`
        : '';
      const whereClause = baseWhereClause + dateFilter;
      
      // Get total inflows and outflows
      const totalSql = `
        SELECT 
          SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as totalInflows,
          SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as totalOutflows
        FROM transactions
        ${whereClause}
      `;
      const totalStmt = this.db.prepare(totalSql);
      const totals = startDate && endDate 
        ? totalStmt.get(startDate, endDate) as { totalInflows: number; totalOutflows: number }
        : totalStmt.get() as { totalInflows: number; totalOutflows: number };

      // Get breakdown by reference type
      const breakdownSql = `
        SELECT 
          reference_type as referenceType,
          SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as totalIn,
          SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as totalOut,
          SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END) as net
        FROM transactions
        ${whereClause}
        GROUP BY reference_type
        ORDER BY net DESC
      `;
      const breakdownStmt = this.db.prepare(breakdownSql);
      const byType = startDate && endDate 
        ? breakdownStmt.all(startDate, endDate) as {
            referenceType: string;
            totalIn: number;
            totalOut: number;
            net: number;
          }[]
        : breakdownStmt.all() as {
            referenceType: string;
            totalIn: number;
            totalOut: number;
            net: number;
          }[];

      return {
        totalInflows: totals.totalInflows || 0,
        totalOutflows: totals.totalOutflows || 0,
        netCashFlow: (totals.totalInflows || 0) - (totals.totalOutflows || 0),
        byType,
      };
    } catch (error) {
      throw new Error(`Error calculating inflow/outflow summary: ${error}`);
    }
  }
}
