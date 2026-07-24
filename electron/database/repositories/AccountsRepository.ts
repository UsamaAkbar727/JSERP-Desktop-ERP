/**
 * Accounts Repository
 * Manages financial accounts (cash, bank, mobile wallet, cheque, custom)
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository } from './BaseRepository';

export interface Account {
  id: string;
  account_name: string;
  account_type: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
  account_number?: string;
  bank_name?: string;
  opening_balance: number;
  current_balance: number;
  status: 'active' | 'inactive';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  id: string;
  account_name: string;
  account_type: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
  account_number?: string;
  bank_name?: string;
  opening_balance?: number;
  current_balance?: number;
  status?: 'active' | 'inactive';
  description?: string;
}

export interface UpdateAccountInput {
  account_name?: string;
  account_type?: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
  account_number?: string;
  bank_name?: string;
  opening_balance?: number;
  status?: 'active' | 'inactive';
  description?: string;
}

export class AccountsRepository extends BaseRepository<Account> {
  constructor(db: Database) {
    super(db, 'accounts');
  }

  /**
   * Get all accounts with optional filtering and sorting
   */
  async getAll(options?: {
    type?: string;
    status?: string;
    sort?: { field: string; order?: 'ASC' | 'DESC' };
  }): Promise<Account[]> {
    const filters: any = {};
    
    if (options?.type) {
      filters.account_type = options.type;
    }
    
    if (options?.status) {
      filters.status = options.status;
    }

    return super.getAll({
      filters,
      sort: options?.sort || { field: 'account_name', order: 'ASC' },
    });
  }

  /**
   * Get active accounts only
   */
  async getActiveAccounts(): Promise<Account[]> {
    return this.getAll({ status: 'active' });
  }

  /**
   * Get accounts by type
   */
  async getByType(accountType: string): Promise<Account[]> {
    return this.getAll({ type: accountType, status: 'active' });
  }

  /**
   * Get cash accounts
   */
  async getCashAccounts(): Promise<Account[]> {
    return this.getByType('cash');
  }

  /**
   * Get bank accounts
   */
  async getBankAccounts(): Promise<Account[]> {
    return this.getByType('bank');
  }

  /**
   * Create a new account
   */
  async create(data: CreateAccountInput): Promise<string> {
    const accountData = {
      ...data,
      opening_balance: data.opening_balance || 0,
      current_balance: data.current_balance !== undefined ? data.current_balance : (data.opening_balance || 0),
      status: data.status || 'active',
    };

    await super.create(accountData);
    return data.id;
  }

  /**
   * Update account details
   * If opening_balance is changed, adjusts current_balance by the difference
   */
  async update(id: string, data: UpdateAccountInput): Promise<boolean> {
    try {
      // If opening_balance is being updated, adjust current_balance accordingly
      if (data.opening_balance !== undefined) {
        const account = await this.getById(id);
        if (!account) {
          throw new Error(`Account not found: ${id}`);
        }

        // Calculate the difference in opening balance
        const difference = data.opening_balance - account.opening_balance;
        
        // Adjust current balance by the difference
        const newCurrentBalance = account.current_balance + difference;
        
        console.log(`[AccountsRepository] Updating account ${id}:`, {
          oldOpeningBalance: account.opening_balance,
          newOpeningBalance: data.opening_balance,
          difference: difference,
          oldCurrentBalance: account.current_balance,
          newCurrentBalance: newCurrentBalance
        });
        
        // Build update fields - only update fields that are provided
        const updates: string[] = [];
        const values: any[] = [];
        
        if (data.account_name !== undefined) {
          updates.push('account_name = ?');
          values.push(data.account_name);
        }
        if (data.account_type !== undefined) {
          updates.push('account_type = ?');
          values.push(data.account_type);
        }
        if (data.account_number !== undefined) {
          updates.push('account_number = ?');
          values.push(data.account_number);
        }
        if (data.bank_name !== undefined) {
          updates.push('bank_name = ?');
          values.push(data.bank_name);
        }
        if (data.status !== undefined) {
          updates.push('status = ?');
          values.push(data.status);
        }
        if (data.description !== undefined) {
          updates.push('description = ?');
          values.push(data.description);
        }
        
        // Always update opening_balance and current_balance when opening_balance changes
        updates.push('opening_balance = ?');
        values.push(data.opening_balance);
        
        updates.push('current_balance = ?');
        values.push(newCurrentBalance);
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        
        // Add id at the end for WHERE clause
        values.push(id);
        
        const sql = `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`;
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...values);

        console.log(`[AccountsRepository] Update result:`, { changes: result.changes });
        return result.changes > 0;
      }
      
      // If opening_balance is not being changed, use normal update
      return super.update(id, data);
    } catch (error) {
      console.error('[AccountsRepository] Update error:', error);
      throw new Error(`Error updating account: ${error}`);
    }
  }

  /**
   * Update account balance
   */
  async updateBalance(id: string, amount: number, operation: 'add' | 'subtract' = 'add'): Promise<boolean> {
    try {
      const account = await this.getById(id);
      if (!account) {
        throw new Error(`Account not found: ${id}`);
      }

      const newBalance = operation === 'add' 
        ? account.current_balance + amount 
        : account.current_balance - amount;

      const sql = `UPDATE accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(newBalance, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating account balance: ${error}`);
    }
  }

  /**
   * Set account balance to a specific value
   */
  async setBalance(id: string, balance: number): Promise<boolean> {
    try {
      const sql = `UPDATE accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(balance, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error setting account balance: ${error}`);
    }
  }

  /**
   * Get total balance across all accounts or by type
   */
  async getTotalBalance(accountType?: string): Promise<number> {
    try {
      let sql = `SELECT SUM(current_balance) as total FROM accounts WHERE status = 'active'`;
      const params: any[] = [];

      if (accountType) {
        sql += ` AND account_type = ?`;
        params.push(accountType);
      }

      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as { total: number | null };

      return result.total || 0;
    } catch (error) {
      throw new Error(`Error calculating total balance: ${error}`);
    }
  }

  /**
   * Get account balance summary by type
   */
  async getBalanceSummary(): Promise<{ type: string; total: number; count: number }[]> {
    try {
      const sql = `
        SELECT 
          account_type as type,
          SUM(current_balance) as total,
          COUNT(*) as count
        FROM accounts
        WHERE status = 'active'
        GROUP BY account_type
        ORDER BY account_type
      `;

      const stmt = this.db.prepare(sql);
      return stmt.all() as { type: string; total: number; count: number }[];
    } catch (error) {
      throw new Error(`Error fetching balance summary: ${error}`);
    }
  }

  /**
   * Check if account has transactions
   * Checks payments, expenses, and transactions tables
   */
  async hasTransactions(id: string): Promise<boolean> {
    try {
      // Check payments table (has ON DELETE RESTRICT)
      const paymentsCheck = this.db.prepare(`SELECT 1 FROM payments WHERE account_id = ? OR cheque_account_id = ? LIMIT 1`);
      if (paymentsCheck.get(id, id)) {
        return true;
      }

      // Check expenses table (has ON DELETE RESTRICT)
      const expensesCheck = this.db.prepare(`SELECT 1 FROM expenses WHERE account_id = ? LIMIT 1`);
      if (expensesCheck.get(id)) {
        return true;
      }

      // Check transactions table (optional but good to check)
      const transactionsCheck = this.db.prepare(`SELECT 1 FROM transactions WHERE account_id = ? LIMIT 1`);
      if (transactionsCheck.get(id)) {
        return true;
      }

      // Check sales table (account_id is optional but may be set)
      const salesCheck = this.db.prepare(`SELECT 1 FROM sales WHERE account_id = ? OR cheque_account_id = ? LIMIT 1`);
      if (salesCheck.get(id, id)) {
        return true;
      }

      // Check purchases table (account_id is optional but may be set)
      const purchasesCheck = this.db.prepare(`SELECT 1 FROM purchases WHERE account_id = ? OR cheque_account_id = ? LIMIT 1`);
      if (purchasesCheck.get(id, id)) {
        return true;
      }

      return false;
    } catch (error) {
      // If tables don't exist, return false
      console.error('Error checking account transactions:', error);
      return false;
    }
  }

  /**
   * Get accounts with low or negative balance
   */
  async getLowBalanceAccounts(threshold: number = 0): Promise<Account[]> {
    try {
      const sql = `
        SELECT * FROM accounts 
        WHERE status = 'active' AND current_balance <= ?
        ORDER BY current_balance ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(threshold) as Account[];
    } catch (error) {
      throw new Error(`Error fetching low balance accounts: ${error}`);
    }
  }

  /**
   * Search accounts by name
   */
  async search(searchTerm: string): Promise<Account[]> {
    return super.search(searchTerm, ['account_name', 'account_number', 'bank_name'], {
      filters: { status: 'active' },
      sort: { field: 'account_name', order: 'ASC' },
    });
  }
}
