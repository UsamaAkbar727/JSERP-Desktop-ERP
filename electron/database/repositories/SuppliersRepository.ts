/**
 * Suppliers Repository
 * Manages supplier data and balances
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Supplier {
  id: string;
  name: string;
  name_urdu?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  opening_balance: number;
  current_balance: number; // Positive = we owe them
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInput {
  id: string;
  name: string;
  name_urdu?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  opening_balance?: number;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  name_urdu?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  opening_balance?: number;
  status?: 'active' | 'inactive';
  notes?: string;
}

export class SuppliersRepository extends BaseRepository<Supplier> {
  constructor(db: Database) {
    super(db, 'suppliers');
  }

  /**
   * Get all suppliers with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Supplier[]> {
    const defaultOptions: QueryOptions = {
      sort: { field: 'created_at', order: 'DESC' },
      ...options,
    };
    return super.getAll(defaultOptions);
  }

  /**
   * Get active suppliers only
   */
  async getActiveSuppliers(): Promise<Supplier[]> {
    return this.getAll({
      filters: { status: 'active' },
      sort: { field: 'created_at', order: 'DESC' },
    });
  }

  /**
   * Create a new supplier
   */
  async create(data: CreateSupplierInput): Promise<string> {
    const supplierData = {
      ...data,
      opening_balance: data.opening_balance || 0,
      current_balance: data.opening_balance || 0,
      status: data.status || 'active',
    };

    await super.create(supplierData);
    return data.id;
  }

  /**
   * Update supplier details (not balance)
   */
  async update(id: string, data: UpdateSupplierInput): Promise<boolean> {
    try {
      if (data.opening_balance === undefined) {
        return super.update(id, data);
      }

      const supplier = await this.getById(id);
      if (!supplier) {
        throw new Error(`Supplier not found: ${id}`);
      }

      const openingBalanceDelta = data.opening_balance - (supplier.opening_balance || 0);
      if (openingBalanceDelta === 0) {
        return super.update(id, data);
      }

      return super.update(id, {
        ...data,
        current_balance: (supplier.current_balance || 0) + openingBalanceDelta,
      });
    } catch (error) {
      throw new Error(`Error updating supplier: ${error}`);
    }
  }

  /**
   * Update supplier balance
   */
  async updateBalance(id: string, amount: number, operation: 'add' | 'subtract' = 'add'): Promise<boolean> {
    try {
      const supplier = await this.getById(id);
      if (!supplier) {
        throw new Error(`Supplier not found: ${id}`);
      }

      const newBalance = operation === 'add' 
        ? supplier.current_balance + amount 
        : supplier.current_balance - amount;

      const sql = `UPDATE suppliers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(newBalance, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating supplier balance: ${error}`);
    }
  }

  /**
   * Set supplier balance to a specific value
   */
  async setBalance(id: string, balance: number): Promise<boolean> {
    try {
      const sql = `UPDATE suppliers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(balance, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error setting supplier balance: ${error}`);
    }
  }

  /**
   * Get suppliers with outstanding payables (positive balance - we owe them)
   */
  async getWithPayables(minPayable: number = 0.01): Promise<Supplier[]> {
    try {
      const sql = `
        SELECT * FROM suppliers 
        WHERE status = 'active' AND current_balance >= ?
        ORDER BY current_balance DESC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(minPayable) as Supplier[];
    } catch (error) {
      throw new Error(`Error fetching suppliers with payables: ${error}`);
    }
  }

  /**
   * Get suppliers with advance payments (negative balance - they owe us)
   */
  async getWithAdvances(): Promise<Supplier[]> {
    try {
      const sql = `
        SELECT * FROM suppliers 
        WHERE status = 'active' AND current_balance < 0
        ORDER BY current_balance ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all() as Supplier[];
    } catch (error) {
      throw new Error(`Error fetching suppliers with advances: ${error}`);
    }
  }

  /**
   * Search suppliers by name, phone, or email
   */
  async search(searchTerm: string): Promise<Supplier[]> {
    return super.search(searchTerm, ['name', 'name_urdu', 'phone', 'email', 'city'], {
      filters: { status: 'active' },
      sort: { field: 'created_at', order: 'DESC' },
    });
  }

  /**
   * Get supplier by phone number
   */
  async getByPhone(phone: string): Promise<Supplier | null> {
    return this.getByField('phone', phone);
  }

  /**
   * Get supplier by email
   */
  async getByEmail(email: string): Promise<Supplier | null> {
    return this.getByField('email', email);
  }

  /**
   * Get total payables (sum of all positive balances)
   */
  async getTotalPayables(): Promise<number> {
    try {
      const sql = `
        SELECT SUM(current_balance) as total 
        FROM suppliers 
        WHERE status = 'active' AND current_balance > 0
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { total: number | null };
      return result.total || 0;
    } catch (error) {
      throw new Error(`Error calculating total payables: ${error}`);
    }
  }

  /**
   * Get supplier statistics
   */
  async getStatistics(): Promise<{
    totalSuppliers: number;
    activeSuppliers: number;
    totalPayables: number;
    suppliersWithPayables: number;
  }> {
    try {
      const totalSuppliers = await this.count();
      const activeSuppliers = await this.count({ status: 'active' });
      const totalPayables = await this.getTotalPayables();
      
      const sql = `SELECT COUNT(*) as count FROM suppliers WHERE status = 'active' AND current_balance > 0`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { count: number };
      const suppliersWithPayables = result.count;

      return {
        totalSuppliers,
        activeSuppliers,
        totalPayables,
        suppliersWithPayables,
      };
    } catch (error) {
      throw new Error(`Error calculating supplier statistics: ${error}`);
    }
  }

  /**
   * Get supplier with purchases summary
   */
  async getWithPurchasesSummary(id: string): Promise<Supplier & {
    totalPurchases: number;
    totalPaid: number;
    purchaseCount: number;
  } | null> {
    try {
      const supplier = await this.getById(id);
      if (!supplier) return null;

      const sql = `
        SELECT 
          COUNT(*) as purchase_count,
          COALESCE(SUM(total_amount), 0) as total_purchases,
          COALESCE(SUM(paid_amount), 0) as total_paid
        FROM purchases
        WHERE supplier_id = ?
      `;
      const stmt = this.db.prepare(sql);
      const summary = stmt.get(id) as { purchase_count: number; total_purchases: number; total_paid: number };

      return {
        ...supplier,
        totalPurchases: summary.total_purchases,
        totalPaid: summary.total_paid,
        purchaseCount: summary.purchase_count,
      };
    } catch (error) {
      throw new Error(`Error fetching supplier with purchases summary: ${error}`);
    }
  }

  /**
   * Check if supplier has any purchases
   */
  async hasPurchases(id: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM purchases WHERE supplier_id = ? LIMIT 1`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get top suppliers by purchase amount
   */
  async getTopSuppliers(limit: number = 10): Promise<(Supplier & { totalPurchases: number })[]> {
    try {
      const sql = `
        SELECT 
          s.*,
          COALESCE(SUM(p.total_amount), 0) as totalPurchases
        FROM suppliers s
        LEFT JOIN purchases p ON s.id = p.supplier_id
        WHERE s.status = 'active'
        GROUP BY s.id
        ORDER BY totalPurchases DESC
        LIMIT ?
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(limit) as (Supplier & { totalPurchases: number })[];
    } catch (error) {
      throw new Error(`Error fetching top suppliers: ${error}`);
    }
  }
}
