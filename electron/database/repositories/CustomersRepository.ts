/**
 * Customers Repository
 * Manages customer data and balances
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Customer {
  id: string;
  name: string;
  name_urdu?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  opening_balance: number;
  current_balance: number; // Positive = they owe us
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
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

export interface UpdateCustomerInput {
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

export class CustomersRepository extends BaseRepository<Customer> {
  constructor(db: Database) {
    super(db, 'customers');
  }

  /**
   * Get all customers with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Customer[]> {
    const defaultOptions: QueryOptions = {
      sort: { field: 'created_at', order: 'DESC' },
      ...options,
    };
    return super.getAll(defaultOptions);
  }

  /**
   * Get active customers only
   */
  async getActiveCustomers(): Promise<Customer[]> {
    return this.getAll({
      filters: { status: 'active' },
      sort: { field: 'created_at', order: 'DESC' },
    });
  }

  /**
   * Create a new customer
   */
  async create(data: CreateCustomerInput): Promise<string> {
    const customerData = {
      ...data,
      opening_balance: data.opening_balance || 0,
      current_balance: data.opening_balance || 0,
      status: data.status || 'active',
    };

    await super.create(customerData);
    return data.id;
  }

  /**
   * Update customer details (not balance)
   */
  async update(id: string, data: UpdateCustomerInput): Promise<boolean> {
    try {
      if (data.opening_balance === undefined) {
        return super.update(id, data);
      }

      const customer = await this.getById(id);
      if (!customer) {
        throw new Error(`Customer not found: ${id}`);
      }

      const openingBalanceDelta = data.opening_balance - (customer.opening_balance || 0);
      if (openingBalanceDelta === 0) {
        return super.update(id, data);
      }

      return super.update(id, {
        ...data,
        current_balance: (customer.current_balance || 0) + openingBalanceDelta,
      });
    } catch (error) {
      throw new Error(`Error updating customer: ${error}`);
    }
  }

  /**
   * Update customer balance
   */
  async updateBalance(id: string, amount: number, operation: 'add' | 'subtract' = 'add'): Promise<boolean> {
    try {
      const customer = await this.getById(id);
      if (!customer) {
        throw new Error(`Customer not found: ${id}`);
      }

      const newBalance = operation === 'add' 
        ? customer.current_balance + amount 
        : customer.current_balance - amount;

      const sql = `UPDATE customers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(newBalance, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating customer balance: ${error}`);
    }
  }

  /**
   * Set customer balance to a specific value
   */
  async setBalance(id: string, balance: number): Promise<boolean> {
    try {
      const sql = `UPDATE customers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(balance, id);

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error setting customer balance: ${error}`);
    }
  }

  /**
   * Get customers with outstanding dues (positive balance)
   */
  async getWithDues(minDue: number = 0.01): Promise<Customer[]> {
    try {
      const sql = `
        SELECT * FROM customers 
        WHERE status = 'active' AND current_balance >= ?
        ORDER BY current_balance DESC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(minDue) as Customer[];
    } catch (error) {
      throw new Error(`Error fetching customers with dues: ${error}`);
    }
  }

  /**
   * Get customers with credit balance (negative balance - we owe them)
   */
  async getWithCredit(): Promise<Customer[]> {
    try {
      const sql = `
        SELECT * FROM customers 
        WHERE status = 'active' AND current_balance < 0
        ORDER BY current_balance ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all() as Customer[];
    } catch (error) {
      throw new Error(`Error fetching customers with credit: ${error}`);
    }
  }

  /**
   * Search customers by name, phone, or email
   */
  async search(searchTerm: string): Promise<Customer[]> {
    return super.search(searchTerm, ['name', 'name_urdu', 'phone', 'email', 'city'], {
      filters: { status: 'active' },
      sort: { field: 'created_at', order: 'DESC' },
    });
  }

  /**
   * Get customer by phone number
   */
  async getByPhone(phone: string): Promise<Customer | null> {
    return this.getByField('phone', phone);
  }

  /**
   * Get customer by email
   */
  async getByEmail(email: string): Promise<Customer | null> {
    return this.getByField('email', email);
  }

  /**
   * Get total receivables (sum of all positive balances)
   */
  async getTotalReceivables(): Promise<number> {
    try {
      const sql = `
        SELECT SUM(current_balance) as total 
        FROM customers 
        WHERE status = 'active' AND current_balance > 0
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { total: number | null };
      return result.total || 0;
    } catch (error) {
      throw new Error(`Error calculating total receivables: ${error}`);
    }
  }

  /**
   * Get customer statistics
   */
  async getStatistics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    totalReceivables: number;
    customersWithDues: number;
  }> {
    try {
      const totalCustomers = await this.count();
      const activeCustomers = await this.count({ status: 'active' });
      const totalReceivables = await this.getTotalReceivables();
      
      const sql = `SELECT COUNT(*) as count FROM customers WHERE status = 'active' AND current_balance > 0`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { count: number };
      const customersWithDues = result.count;

      return {
        totalCustomers,
        activeCustomers,
        totalReceivables,
        customersWithDues,
      };
    } catch (error) {
      throw new Error(`Error calculating customer statistics: ${error}`);
    }
  }

  /**
   * Get customer with sales summary
   */
  async getWithSalesSummary(id: string): Promise<Customer & {
    totalSales: number;
    totalPaid: number;
    saleCount: number;
  } | null> {
    try {
      const customer = await this.getById(id);
      if (!customer) return null;

      const sql = `
        SELECT 
          COUNT(*) as sale_count,
          COALESCE(SUM(total_amount), 0) as total_sales,
          COALESCE(SUM(paid_amount), 0) as total_paid
        FROM sales
        WHERE customer_id = ?
      `;
      const stmt = this.db.prepare(sql);
      const summary = stmt.get(id) as { sale_count: number; total_sales: number; total_paid: number };

      return {
        ...customer,
        totalSales: summary.total_sales,
        totalPaid: summary.total_paid,
        saleCount: summary.sale_count,
      };
    } catch (error) {
      throw new Error(`Error fetching customer with sales summary: ${error}`);
    }
  }

  /**
   * Check if customer has any sales
   */
  async hasSales(id: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM sales WHERE customer_id = ? LIMIT 1`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get top customers by sales amount
   */
  async getTopCustomers(limit: number = 10): Promise<(Customer & { totalSales: number })[]> {
    try {
      const sql = `
        SELECT 
          c.*,
          COALESCE(SUM(s.total_amount), 0) as totalSales
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        WHERE c.status = 'active'
        GROUP BY c.id
        ORDER BY totalSales DESC
        LIMIT ?
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(limit) as (Customer & { totalSales: number })[];
    } catch (error) {
      throw new Error(`Error fetching top customers: ${error}`);
    }
  }
}
