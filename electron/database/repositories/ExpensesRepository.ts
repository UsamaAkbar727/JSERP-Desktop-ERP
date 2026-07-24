/**
 * Expenses Repository
 * Manages business expense records
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  account_id: string;
  account_name: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  account_id: string;
  account_name: string;
  notes?: string;
}

export interface UpdateExpenseInput {
  date?: string;
  category?: string;
  description?: string;
  amount?: number;
  account_id?: string;
  account_name?: string;
  notes?: string;
}

export class ExpensesRepository extends BaseRepository<Expense> {
  constructor(db: Database) {
    super(db, 'expenses');
  }

  /**
   * Get all expenses with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Expense[]> {
    const defaultOptions: QueryOptions = {
      sort: { field: 'date', order: 'DESC' },
      ...options,
    };
    return super.getAll(defaultOptions);
  }

  /**
   * Create a new expense
   * Also updates account balance (decrease) and creates transaction record
   */
  async create(data: CreateExpenseInput): Promise<string> {
    const createExpenseTransaction = this.db.transaction((expenseData: CreateExpenseInput) => {
      // Insert expense record
      const keys = Object.keys(expenseData);
      const values = Object.values(expenseData);
      const placeholders = keys.map(() => '?').join(', ');

      const expenseStmt = this.db.prepare(
        `INSERT INTO expenses (${keys.join(', ')}) VALUES (${placeholders})`
      );
      expenseStmt.run(...values);

      // Update account balance (decrease for expense)
      const updateAccountStmt = this.db.prepare(
        `UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?`
      );
      updateAccountStmt.run(expenseData.amount, expenseData.account_id);

      // Create transaction record
      const transactionId = `TXN-EXP-${Date.now()}`;
      const createTransactionStmt = this.db.prepare(`
        INSERT INTO transactions (
          id, transaction_date, reference_type, reference_id, 
          account_id, direction, amount, description
        ) VALUES (?, ?, 'expense', ?, ?, 'out', ?, ?)
      `);
      
      const description = `Expense: ${expenseData.description || expenseData.category}`;
      
      createTransactionStmt.run(
        transactionId,
        expenseData.date,
        expenseData.id,
        expenseData.account_id,
        expenseData.amount,
        expenseData.notes || description
      );

      return expenseData.id;
    });

    return createExpenseTransaction(data);
  }

  /**
   * Update expense details
   */
  async update(id: string, data: UpdateExpenseInput): Promise<boolean> {
    return super.update(id, data);
  }

  /**
   * Delete an expense
   * Also reverses account balance (add back the expense amount) and deletes transaction
   */
  async delete(id: string): Promise<boolean> {
    const deleteExpenseTransaction = this.db.transaction((expenseId: string) => {
      // Get expense details first
      const expense = this.getById(expenseId);
      if (!expense) {
        throw new Error(`Expense not found: ${expenseId}`);
      }

      // Delete transaction records
      const deleteTransactionStmt = this.db.prepare(
        `DELETE FROM transactions WHERE reference_type = 'expense' AND reference_id = ?`
      );
      deleteTransactionStmt.run(expenseId);

      // Reverse account balance (add back the expense amount)
      const updateAccountStmt = this.db.prepare(
        `UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?`
      );
      updateAccountStmt.run((expense as any).amount, (expense as any).account_id);

      // Delete expense record
      const deleteExpenseStmt = this.db.prepare(`DELETE FROM expenses WHERE id = ?`);
      const result = deleteExpenseStmt.run(expenseId);

      return result.changes > 0;
    });

    return deleteExpenseTransaction(id);
  }

  /**
   * Get expenses by category
   */
  async getByCategory(category: string, options?: QueryOptions): Promise<Expense[]> {
    return this.getAll({
      filters: { category },
      sort: { field: 'date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get expenses by account
   */
  async getByAccount(accountId: string, options?: QueryOptions): Promise<Expense[]> {
    return this.getAll({
      filters: { account_id: accountId },
      sort: { field: 'date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get expenses by date range
   */
  async getExpensesByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<Expense[]> {
    return super.getByDateRange('date', startDate, endDate, {
      sort: { field: 'date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get total expenses for a date range
   */
  async getTotalExpenses(startDate?: string, endDate?: string): Promise<number> {
    try {
      let sql = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM expenses
      `;
      
      const params: any[] = [];
      if (startDate && endDate) {
        sql += ' WHERE date >= ? AND date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += ' WHERE date >= ?';
        params.push(startDate);
      } else if (endDate) {
        sql += ' WHERE date <= ?';
        params.push(endDate);
      }
      
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as { total: number };
      return result.total;
    } catch (error) {
      throw new Error(`Error calculating total expenses: ${error}`);
    }
  }

  /**
   * Get expense totals by category for a date range
   */
  async getCategoryTotals(startDate?: string, endDate?: string): Promise<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }[]> {
    try {
      let sql = `
        SELECT 
          category,
          SUM(amount) as total,
          COUNT(*) as count
        FROM expenses
      `;

      const params: any[] = [];

      if (startDate && endDate) {
        sql += ` WHERE date >= ? AND date <= ?`;
        params.push(startDate, endDate);
      }

      sql += `
        GROUP BY category
        ORDER BY total DESC
      `;

      const stmt = this.db.prepare(sql);
      const results = stmt.all(...params) as { category: string; total: number; count: number }[];

      // Calculate percentages
      const grandTotal = results.reduce((sum, item) => sum + item.total, 0);
      
      return results.map(item => ({
        ...item,
        percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
      }));
    } catch (error) {
      throw new Error(`Error fetching category totals: ${error}`);
    }
  }

  /**
   * Get all unique expense categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const sql = `SELECT DISTINCT category FROM expenses ORDER BY category ASC`;
      const stmt = this.db.prepare(sql);
      const results = stmt.all() as { category: string }[];
      return results.map(r => r.category);
    } catch (error) {
      throw new Error(`Error fetching expense categories: ${error}`);
    }
  }

  /**
   * Get expense summary for a date range
   */
  async getExpenseSummary(startDate: string, endDate: string): Promise<{
    totalExpenses: number;
    expenseCount: number;
    averageExpense: number;
    categoryCount: number;
  }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as expense_count,
          COALESCE(SUM(amount), 0) as total_expenses,
          COALESCE(AVG(amount), 0) as average_expense,
          COUNT(DISTINCT category) as category_count
        FROM expenses
        WHERE date >= ? AND date <= ?
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(startDate, endDate) as {
        expense_count: number;
        total_expenses: number;
        average_expense: number;
        category_count: number;
      };

      return {
        totalExpenses: result.total_expenses,
        expenseCount: result.expense_count,
        averageExpense: result.average_expense,
        categoryCount: result.category_count,
      };
    } catch (error) {
      throw new Error(`Error calculating expense summary: ${error}`);
    }
  }

  /**
   * Get daily expense report for a date range
   */
  async getDailyExpenseReport(startDate: string, endDate: string): Promise<{
    date: string;
    expenseCount: number;
    totalAmount: number;
  }[]> {
    try {
      const sql = `
        SELECT 
          date,
          COUNT(*) as expenseCount,
          SUM(amount) as totalAmount
        FROM expenses
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(startDate, endDate) as {
        date: string;
        expenseCount: number;
        totalAmount: number;
      }[];
    } catch (error) {
      throw new Error(`Error generating daily expense report: ${error}`);
    }
  }

  /**
   * Get monthly expense totals
   */
  async getMonthlyTotals(year?: number): Promise<{
    month: string;
    total: number;
    count: number;
  }[]> {
    try {
      let sql = `
        SELECT 
          strftime('%Y-%m', date) as month,
          SUM(amount) as total,
          COUNT(*) as count
        FROM expenses
      `;

      const params: any[] = [];

      if (year) {
        sql += ` WHERE strftime('%Y', date) = ?`;
        params.push(year.toString());
      }

      sql += `
        GROUP BY month
        ORDER BY month ASC
      `;

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as {
        month: string;
        total: number;
        count: number;
      }[];
    } catch (error) {
      throw new Error(`Error fetching monthly expense totals: ${error}`);
    }
  }

  /**
   * Search expenses by description or notes
   */
  async search(searchTerm: string): Promise<Expense[]> {
    return super.search(searchTerm, ['description', 'notes', 'category'], {
      sort: { field: 'date', order: 'DESC' },
    });
  }

  /**
   * Get top expense categories
   */
  async getTopCategories(limit: number = 5, startDate?: string, endDate?: string): Promise<{
    category: string;
    total: number;
  }[]> {
    try {
      let sql = `
        SELECT 
          category,
          SUM(amount) as total
        FROM expenses
      `;

      const params: any[] = [];

      if (startDate && endDate) {
        sql += ` WHERE date >= ? AND date <= ?`;
        params.push(startDate, endDate);
      }

      sql += `
        GROUP BY category
        ORDER BY total DESC
        LIMIT ?
      `;
      params.push(limit);

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as {
        category: string;
        total: number;
      }[];
    } catch (error) {
      throw new Error(`Error fetching top expense categories: ${error}`);
    }
  }

  /**
   * Get common expense categories (for initialization/suggestions)
   */
  static getCommonCategories(): string[] {
    return [
      'Rent',
      'Utilities',
      'Salaries',
      'Office Supplies',
      'Marketing',
      'Transportation',
      'Maintenance',
      'Insurance',
      'Taxes',
      'Professional Services',
      'Equipment',
      'Software & Subscriptions',
      'Communication',
      'Miscellaneous',
    ];
  }
}
