/**
 * Customers IPC Handlers
 * Handles IPC communication for customer operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateCustomerInput, UpdateCustomerInput } from '../../database/repositories';

/**
 * Register all customers-related IPC handlers
 */
export function registerCustomersHandlers(): void {
  // List all customers
  registerIPCHandler('customers:list', async (event, args, repos) => {
    const { status, sort, pagination } = args || {};
    
    const customers = await repos.customers.getAll({
      filters: {
        ...(status && { status }),
      },
      sort: sort || { field: 'created_at', order: 'DESC' },
      pagination,
    });
    return customers;
  });

  // Get active customers
  registerIPCHandler('customers:active', async (event, args, repos) => {
    return repos.customers.getActiveCustomers();
  });

  // Get customer by ID
  registerIPCHandler('customers:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Customer ID');
    
    const customer = await repos.customers.getById(id);
    if (!customer) {
      throw new Error(`Customer not found: ${id}`);
    }
    return customer;
  });

  // Get customer with sales summary
  registerIPCHandler('customers:get-with-summary', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Customer ID');
    
    const customer = await repos.customers.getWithSalesSummary(id);
    if (!customer) {
      throw new Error(`Customer not found: ${id}`);
    }
    
    return customer;
  });

  // Create new customer
  registerIPCHandler('customers:create', async (event, args: CreateCustomerInput, repos) => {
    // Validate required fields
    validators.requiredString(args.id, 'Customer ID');
    validators.requiredString(args.name, 'Customer Name');
    
    if (args.email) {
      validators.email(args.email, 'Email');
    }
    
    if (args.opening_balance !== undefined) {
      validators.requiredNumber(args.opening_balance, 'Opening Balance');
    }

    const customerId = await repos.customers.create(args);
    return customerId;
  });

  // Update customer
  registerIPCHandler('customers:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Customer ID');
    
    if (data.email) {
      validators.email(data.email, 'Email');
    }

    const success = await repos.customers.update(id, data as UpdateCustomerInput);
    if (!success) {
      throw new Error('Failed to update customer');
    }
    return { success: true };
  });

  // Update customer balance
  registerIPCHandler('customers:update-balance', async (event, args, repos) => {
    const { id, amount, operation } = args;
    validators.requiredString(id, 'Customer ID');
    validators.requiredNumber(amount, 'Amount');
    validators.oneOf(operation, ['add', 'subtract'], 'Operation');

    const success = await repos.customers.updateBalance(id, amount, operation);
    if (!success) {
      throw new Error('Failed to update customer balance');
    }
    return { success: true };
  });

  // Delete customer (with cascade - deletes related sales)
  registerIPCHandler('customers:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Customer ID');

    try {
      // Get count of sales before deletion for logging
      const countSQL = `SELECT COUNT(*) as count FROM sales WHERE customer_id = ?`;
      const countStmt = repos.db.prepare(countSQL);
      const countResult = countStmt.get(id) as { count: number };
      const salesCount = countResult.count;

      // Delete all sales associated with this customer
      // This will cascade delete sale_items automatically due to ON DELETE CASCADE
      // Payments and transactions will have their references set to NULL due to ON DELETE SET NULL
      const deleteSalesSQL = `DELETE FROM sales WHERE customer_id = ?`;
      const deleteSalesStmt = repos.db.prepare(deleteSalesSQL);
      deleteSalesStmt.run(id);
      

      // Now delete the customer (hard delete)
      const deleteCustomerSQL = `DELETE FROM customers WHERE id = ?`;
      const deleteCustomerStmt = repos.db.prepare(deleteCustomerSQL);
      const deleteResult = deleteCustomerStmt.run(id);
      
      if (deleteResult.changes === 0) {
        throw new Error('Failed to delete customer');
      }
      
      return { success: true, deletedSales: salesCount };
    } catch (error) {
      console.error('Error deleting customer with cascade:', error);
      throw new Error(`Failed to delete customer: ${error}`);
    }
  });

  // Search customers
  registerIPCHandler('customers:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.customers.search(term);
  });

  // Get customers with dues
  registerIPCHandler('customers:with-dues', async (event, args, repos) => {
    const { minDue } = args || {};
    return repos.customers.getWithDues(minDue);
  });

  // Get total receivables
  registerIPCHandler('customers:total-receivables', async (event, args, repos) => {
    return repos.customers.getTotalReceivables();
  });

  // Get customer statistics
  registerIPCHandler('customers:statistics', async (event, args, repos) => {
    return repos.customers.getStatistics();
  });

  // Get top customers
  registerIPCHandler('customers:top', async (event, args, repos) => {
    const { limit } = args || {};
    return repos.customers.getTopCustomers(limit || 10);
  });

  // Get customer by phone
  registerIPCHandler('customers:by-phone', async (event, args, repos) => {
    const { phone } = args;
    validators.requiredString(phone, 'Phone number');
    
    return repos.customers.getByPhone(phone);
  });

  // Get customer by email
  registerIPCHandler('customers:by-email', async (event, args, repos) => {
    const { email } = args;
    validators.requiredString(email, 'Email');
    validators.email(email, 'Email');
    
    return repos.customers.getByEmail(email);
  });
}
