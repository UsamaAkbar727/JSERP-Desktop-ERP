/**
 * Payments Repository
 * Manages customer receipts and supplier payments
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Payment {
  id: string;
  payment_type: 'receipt' | 'payment';
  payment_date: string;
  customer_id?: string;
  supplier_id?: string;
  sale_id?: string;
  purchase_id?: string;
  account_id: string;
  account_name: string;
  payment_method: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom' | 'credit';
  cheque_account_id?: string;
  cheque_number?: string;
  amount: number;
  reference_number?: string;
  notes?: string;
  is_full_payment: number; // SQLite uses 0/1 for boolean
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  id: string;
  payment_type: 'receipt' | 'payment';
  payment_date: string;
  customer_id?: string;
  supplier_id?: string;
  sale_id?: string;
  purchase_id?: string;
  account_id: string;
  account_name: string;
  payment_method: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom' | 'credit';
  cheque_account_id?: string;
  cheque_number?: string;
  amount: number;
  reference_number?: string;
  notes?: string;
  is_full_payment?: boolean;
}

export class PaymentsRepository extends BaseRepository<Payment> {
  constructor(db: Database) {
    super(db, 'payments');
  }

  /**
   * Get all payments with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Payment[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      // Apply filters
      if (options?.filters && Object.keys(options.filters).length > 0) {
        const whereClauses: string[] = [];
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null && key !== 'startDate' && key !== 'endDate') {
            whereClauses.push(`${key} = ?`);
            params.push(value);
          }
        }
        if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
      }

      // Always sort by payment_date DESC, then created_at DESC, then id DESC for consistent chronological order
      sql += ` ORDER BY payment_date DESC, created_at DESC, id DESC`;

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Payment[];
    } catch (error) {
      throw new Error(`Error fetching payments: ${error}`);
    }
  }

  /**
   * Create a new payment
   * Also updates account balance, customer/supplier balance, and creates transaction
   */
  async createPayment(data: CreatePaymentInput): Promise<string> {
    const createPaymentTransaction = this.db.transaction((paymentData: CreatePaymentInput) => {
      console.log('💳 [PaymentsRepository] Creating payment:', {
        id: paymentData.id,
        type: paymentData.payment_type,
        amount: paymentData.amount,
        accountId: paymentData.account_id,
        customerId: paymentData.customer_id
      });

      // Insert payment record
      const paymentRecord = {
        ...paymentData,
        is_full_payment: paymentData.is_full_payment ? 1 : 0,
      };
      
      const keys = Object.keys(paymentRecord);
      const values = Object.values(paymentRecord);
      const placeholders = keys.map(() => '?').join(', ');

      const paymentStmt = this.db.prepare(
        `INSERT INTO payments (${keys.join(', ')}) VALUES (${placeholders})`
      );
      paymentStmt.run(...values);
      console.log('✅ [PaymentsRepository] Payment record inserted');

      // Update account balance (increase for receipt, decrease for payment)
      const accountBalanceChange = paymentData.payment_type === 'receipt' 
        ? paymentData.amount 
        : -paymentData.amount;
      
      // Get current account balance
      const accountBeforeStmt = this.db.prepare(`SELECT id, account_name, current_balance FROM accounts WHERE id = ?`);
      const accountBefore = accountBeforeStmt.get(paymentData.account_id) as any;
      if (!accountBefore) {
        console.error('❌ [PaymentsRepository] Account not found:', paymentData.account_id);
        throw new Error(`Account not found: ${paymentData.account_id}`);
      }
      
      console.log('🏦 [PaymentsRepository] Account before update:', {
        id: accountBefore.id,
        name: accountBefore.account_name,
        currentBalance: accountBefore.current_balance,
        changeAmount: accountBalanceChange
      });
      
      const updateAccountStmt = this.db.prepare(
        `UPDATE accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      );
      const accountUpdateResult = updateAccountStmt.run(accountBalanceChange, paymentData.account_id);
      
      console.log('📊 [PaymentsRepository] Account update result:', {
        changes: accountUpdateResult.changes,
        expectedNewBalance: accountBefore.current_balance + accountBalanceChange
      });
      
      if (accountUpdateResult.changes === 0) {
        console.error('❌ [PaymentsRepository] Failed to update account balance');
        throw new Error(`Failed to update account balance for account: ${paymentData.account_id}`);
      }
      
      // Verify the update
      const accountAfterStmt = this.db.prepare(`SELECT current_balance FROM accounts WHERE id = ?`);
      const accountAfter = accountAfterStmt.get(paymentData.account_id) as any;
      console.log('✅ [PaymentsRepository] Account updated successfully:', {
        newBalance: accountAfter?.current_balance
      });

      // Update customer/supplier balance
      if (paymentData.customer_id) {
        // Receipt from customer - decrease their balance (they owe us less)
        const updateCustomerStmt = this.db.prepare(
          `UPDATE customers SET current_balance = current_balance - ? WHERE id = ?`
        );
        updateCustomerStmt.run(paymentData.amount, paymentData.customer_id);
      } else if (paymentData.supplier_id) {
        // Payment to supplier - decrease their balance (we owe them less)
        const updateSupplierStmt = this.db.prepare(
          `UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?`
        );
        updateSupplierStmt.run(paymentData.amount, paymentData.supplier_id);
      }

      // Create transaction record
      const transactionId = `TXN-PAY-${Date.now()}`;
      const referenceType = paymentData.customer_id ? 'customer_payment' : 'supplier_payment';
      const direction = paymentData.payment_type === 'receipt' ? 'in' : 'out';
      
      const createTransactionStmt = this.db.prepare(`
        INSERT INTO transactions (
          id, transaction_date, reference_type, reference_id, 
          account_id, customer_id, supplier_id, direction, amount, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const description = paymentData.payment_type === 'receipt'
        ? `Payment received via ${paymentData.payment_method}`
        : `Payment made via ${paymentData.payment_method}`;
      
      createTransactionStmt.run(
        transactionId,
        paymentData.payment_date,
        referenceType,
        paymentData.id,
        paymentData.account_id,
        paymentData.customer_id || null,
        paymentData.supplier_id || null,
        direction,
        paymentData.amount,
        paymentData.notes || description
      );

      // Update sale/purchase payment status if payment is linked to specific sale/purchase
      if (paymentData.sale_id) {
        // Get sale details
        const saleStmt = this.db.prepare('SELECT * FROM sales WHERE id = ?');
        const sale = saleStmt.get(paymentData.sale_id) as any;
        
        if (sale) {
          // Calculate total paid amount for this sale
          const paymentsStmt = this.db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE sale_id = ?'
          );
          const result = paymentsStmt.get(paymentData.sale_id) as any;
          const totalPaid = result.total_paid;
          
          // Determine payment status
          let paymentStatus: 'paid' | 'partial' | 'due' = 'due';
          if (totalPaid >= sale.total_amount) {
            paymentStatus = 'paid';
          } else if (totalPaid > 0) {
            paymentStatus = 'partial';
          }
          
          // Update sale payment status
          const updateSaleStmt = this.db.prepare(`
            UPDATE sales 
            SET paid_amount = ?, due_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `);
          const dueAmount = Math.max(0, sale.total_amount - totalPaid);
          updateSaleStmt.run(totalPaid, dueAmount, paymentStatus, paymentData.sale_id);
        }
      }
      
      if (paymentData.purchase_id) {
        // Get purchase details
        const purchaseStmt = this.db.prepare('SELECT * FROM purchases WHERE id = ?');
        const purchase = purchaseStmt.get(paymentData.purchase_id) as any;
        
        if (purchase) {
          // Calculate total paid amount for this purchase
          const paymentsStmt = this.db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE purchase_id = ?'
          );
          const result = paymentsStmt.get(paymentData.purchase_id) as any;
          const totalPaid = result.total_paid;
          
          // Determine payment status
          let paymentStatus: 'paid' | 'partial' | 'due' = 'due';
          if (totalPaid >= purchase.total_amount) {
            paymentStatus = 'paid';
          } else if (totalPaid > 0) {
            paymentStatus = 'partial';
          }
          
          // Update purchase payment status
          const updatePurchaseStmt = this.db.prepare(`
            UPDATE purchases 
            SET paid_amount = ?, due_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `);
          const dueAmount = Math.max(0, purchase.total_amount - totalPaid);
          updatePurchaseStmt.run(totalPaid, dueAmount, paymentStatus, paymentData.purchase_id);
        }
      }
      
      // Auto-allocate payment to purchases/sales if no specific purchase_id/sale_id provided
      if (paymentData.supplier_id && !paymentData.purchase_id) {
        
        // Get all unpaid/partially paid purchases for this supplier, ordered by date (oldest first)
        const unpaidPurchasesStmt = this.db.prepare(`
          SELECT * FROM purchases 
          WHERE supplier_id = ? AND payment_status IN ('due', 'partial')
          ORDER BY purchase_date ASC, created_at ASC, id ASC
        `);
        const unpaidPurchases = unpaidPurchasesStmt.all(paymentData.supplier_id) as any[];
        
        
        if (unpaidPurchases.length > 0) {
          let remainingAmount = paymentData.amount;
          let updatedCount = 0;
          
          for (const purchase of unpaidPurchases) {
            if (remainingAmount <= 0) break;
            
            const amountToAllocate = Math.min(remainingAmount, purchase.due_amount);
            const newPaidAmount = purchase.paid_amount + amountToAllocate;
            const newDueAmount = purchase.total_amount - newPaidAmount;
            
            // Determine new payment status
            let newStatus: 'paid' | 'partial' | 'due' = 'due';
            if (newDueAmount <= 0) {
              newStatus = 'paid';
            } else if (newPaidAmount > 0) {
              newStatus = 'partial';
            }
            
           
            
            // Update purchase
            const updatePurchaseStmt = this.db.prepare(`
              UPDATE purchases 
              SET paid_amount = ?, due_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `);
            const result = updatePurchaseStmt.run(newPaidAmount, newDueAmount, newStatus, purchase.id);
            
            if (result.changes > 0) {
              updatedCount++;
              remainingAmount -= amountToAllocate;
            } else {
              console.error(`  ❌ Failed to update purchase ${purchase.id}`);
            }
          }
          
        } else {
          console.log('⚠️ No unpaid purchases found for this supplier. Payment recorded but not allocated.');
        }
      }
      
      if (paymentData.customer_id && !paymentData.sale_id) {
       
        
        // Get all unpaid/partially paid sales for this customer, ordered by date (oldest first)
        const unpaidSalesStmt = this.db.prepare(`
          SELECT * FROM sales 
          WHERE customer_id = ? AND payment_status IN ('due', 'partial')
          ORDER BY sale_date ASC, created_at ASC, id ASC
        `);
        const unpaidSales = unpaidSalesStmt.all(paymentData.customer_id) as any[];
        
        
        if (unpaidSales.length > 0) {
          let remainingAmount = paymentData.amount;
          let updatedCount = 0;
          
          for (const sale of unpaidSales) {
            if (remainingAmount <= 0) break;
            
            const amountToAllocate = Math.min(remainingAmount, sale.due_amount);
            const newPaidAmount = sale.paid_amount + amountToAllocate;
            const newDueAmount = sale.total_amount - newPaidAmount;
            
            // Determine new payment status
            let newStatus: 'paid' | 'partial' | 'due' = 'due';
            if (newDueAmount <= 0) {
              newStatus = 'paid';
            } else if (newPaidAmount > 0) {
              newStatus = 'partial';
            }
            
           
            
            // Update sale
            const updateSaleStmt = this.db.prepare(`
              UPDATE sales 
              SET paid_amount = ?, due_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `);
            const result = updateSaleStmt.run(newPaidAmount, newDueAmount, newStatus, sale.id);
            
            if (result.changes > 0) {
              updatedCount++;
              remainingAmount -= amountToAllocate;
            } else {
              console.error(`  ❌ Failed to update sale ${sale.id}`);
            }
          }
          
        } else {
          console.log('⚠️ No unpaid sales found for this customer. Payment recorded but not allocated.');
        }
      }

      return paymentData.id;
    });

    return createPaymentTransaction(data);
  }

  /**
   * Get payments by customer (receipts from customer)
   */
  async getByCustomer(customerId: string, options?: QueryOptions): Promise<Payment[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE customer_id = ? AND payment_type = 'receipt'`;
      const params: any[] = [customerId];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND payment_date >= ? AND payment_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY payment_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Payment[];
    } catch (error) {
      throw new Error(`Error fetching customer payments: ${error}`);
    }
  }

  /**
   * Get payments by supplier (payments to supplier)
   */
  async getBySupplier(supplierId: string, options?: QueryOptions): Promise<Payment[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE supplier_id = ? AND payment_type = 'payment'`;
      const params: any[] = [supplierId];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND payment_date >= ? AND payment_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY payment_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Payment[];
    } catch (error) {
      throw new Error(`Error fetching supplier payments: ${error}`);
    }
  }

  /**
   * Get payments for a specific sale
   */
  async getBySale(saleId: string): Promise<Payment[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM ${this.tableName} 
        WHERE sale_id = ? 
        ORDER BY payment_date DESC, created_at DESC, id DESC
      `);
      return stmt.all(saleId) as Payment[];
    } catch (error) {
      throw new Error(`Error fetching payments for sale: ${error}`);
    }
  }

  /**
   * Get payments for a specific purchase
   */
  async getByPurchase(purchaseId: string): Promise<Payment[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM ${this.tableName} 
        WHERE purchase_id = ? 
        ORDER BY payment_date DESC, created_at DESC, id DESC
      `);
      return stmt.all(purchaseId) as Payment[];
    } catch (error) {
      throw new Error(`Error fetching payments for purchase: ${error}`);
    }
  }

  /**
   * Get payments by date range
   */
  async getPaymentsByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<Payment[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE payment_date >= ? AND payment_date <= ?`;
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
      
      sql += ` ORDER BY payment_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Payment[];
    } catch (error) {
      throw new Error(`Error fetching payments by date range: ${error}`);
    }
  }

  /**
   * Get payments by type (receipt or payment)
   */
  async getByType(paymentType: 'receipt' | 'payment', options?: QueryOptions): Promise<Payment[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE payment_type = ?`;
      const params: any[] = [paymentType];
      
      // Apply date range if provided in options
      if (options?.filters) {
        if (options.filters.startDate && options.filters.endDate) {
          sql += ` AND payment_date >= ? AND payment_date <= ?`;
          params.push(options.filters.startDate, options.filters.endDate);
        }
      }
      
      sql += ` ORDER BY payment_date DESC, created_at DESC, id DESC`;
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Payment[];
    } catch (error) {
      throw new Error(`Error fetching payments by type: ${error}`);
    }
  }

  /**
   * Get payments by account
   */
  async getByAccount(accountId: string, options?: QueryOptions): Promise<Payment[]> {
    return this.getAll({
      filters: { account_id: accountId },
      sort: { field: 'payment_date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get payments by payment method
   */
  async getByPaymentMethod(paymentMethod: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom' | 'credit', options?: QueryOptions): Promise<Payment[]> {
    return this.getAll({
      filters: { payment_method: paymentMethod },
      sort: { field: 'payment_date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get total receipts (from customers) for a date range
   */
  async getTotalReceipts(startDate: string, endDate: string): Promise<number> {
    try {
      const sql = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE payment_type = 'receipt' AND payment_date >= ? AND payment_date <= ?
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(startDate, endDate) as { total: number };
      return result.total;
    } catch (error) {
      throw new Error(`Error calculating total receipts: ${error}`);
    }
  }

  /**
   * Get total payments (to suppliers) for a date range
   */
  async getTotalPayments(startDate: string, endDate: string): Promise<number> {
    try {
      const sql = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE payment_type = 'payment' AND payment_date >= ? AND payment_date <= ?
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(startDate, endDate) as { total: number };
      return result.total;
    } catch (error) {
      throw new Error(`Error calculating total payments: ${error}`);
    }
  }

  /**
   * Get payment summary for a date range
   */
  async getPaymentSummary(startDate: string, endDate: string): Promise<{
    totalReceipts: number;
    totalPayments: number;
    receiptCount: number;
    paymentCount: number;
    netCashFlow: number;
  }> {
    try {
      const totalReceipts = await this.getTotalReceipts(startDate, endDate);
      const totalPayments = await this.getTotalPayments(startDate, endDate);

      const countSql = `
        SELECT 
          SUM(CASE WHEN payment_type = 'receipt' THEN 1 ELSE 0 END) as receipt_count,
          SUM(CASE WHEN payment_type = 'payment' THEN 1 ELSE 0 END) as payment_count
        FROM payments
        WHERE payment_date >= ? AND payment_date <= ?
      `;
      const stmt = this.db.prepare(countSql);
      const counts = stmt.get(startDate, endDate) as { receipt_count: number; payment_count: number };

      return {
        totalReceipts,
        totalPayments,
        receiptCount: counts.receipt_count,
        paymentCount: counts.payment_count,
        netCashFlow: totalReceipts - totalPayments,
      };
    } catch (error) {
      throw new Error(`Error calculating payment summary: ${error}`);
    }
  }

  /**
   * Get payments with related entity names (customer/supplier)
   */
  async getWithEntityNames(options?: QueryOptions): Promise<(Payment & { entity_name?: string })[]> {
    try {
      const sql = `
        SELECT 
          p.*,
          COALESCE(c.name, s.name) as entity_name
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.payment_date DESC
      `;
      
      let finalSql = sql;
      const params: any[] = [];

      // Apply filters if provided
      if (options?.filters && Object.keys(options.filters).length > 0) {
        const whereClauses: string[] = [];
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null) {
            whereClauses.push(`p.${key} = ?`);
            params.push(value);
          }
        }
        if (whereClauses.length > 0) {
          finalSql = finalSql.replace('ORDER BY', `WHERE ${whereClauses.join(' AND ')} ORDER BY`);
        }
      }

      // Apply pagination if provided
      if (options?.pagination) {
        const limit = options.pagination.limit || 50;
        const page = options.pagination.page || 1;
        const offset = (page - 1) * limit;
        finalSql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
      }

      const stmt = this.db.prepare(finalSql);
      return stmt.all(...params) as (Payment & { entity_name?: string })[];
    } catch (error) {
      throw new Error(`Error fetching payments with entity names: ${error}`);
    }
  }

  /**
   * Get daily payment report for a date range
   */
  async getDailyPaymentReport(startDate: string, endDate: string): Promise<{
    date: string;
    receiptsAmount: number;
    paymentsAmount: number;
    netAmount: number;
  }[]> {
    try {
      const sql = `
        SELECT 
          payment_date as date,
          SUM(CASE WHEN payment_type = 'receipt' THEN amount ELSE 0 END) as receiptsAmount,
          SUM(CASE WHEN payment_type = 'payment' THEN amount ELSE 0 END) as paymentsAmount,
          SUM(CASE WHEN payment_type = 'receipt' THEN amount ELSE -amount END) as netAmount
        FROM payments
        WHERE payment_date >= ? AND payment_date <= ?
        GROUP BY payment_date
        ORDER BY payment_date ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(startDate, endDate) as {
        date: string;
        receiptsAmount: number;
        paymentsAmount: number;
        netAmount: number;
      }[];
    } catch (error) {
      throw new Error(`Error generating daily payment report: ${error}`);
    }
  }

  /**
   * Search payments by reference number or notes
   */
  async search(searchTerm: string): Promise<Payment[]> {
    return super.search(searchTerm, ['reference_number', 'notes', 'cheque_number'], {
      sort: { field: 'payment_date', order: 'DESC' },
    });
  }
}
