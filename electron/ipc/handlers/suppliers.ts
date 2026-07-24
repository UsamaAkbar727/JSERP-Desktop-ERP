/**
 * Suppliers IPC Handlers
 * Handles IPC communication for supplier operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateSupplierInput, UpdateSupplierInput } from '../../database/repositories';

/**
 * Register all suppliers-related IPC handlers
 */
export function registerSuppliersHandlers(): void {
  // List all suppliers
  registerIPCHandler('suppliers:list', async (event, args, repos) => {
    const { status, sort, pagination } = args || {};
    
    const suppliers = await repos.suppliers.getAll({
      filters: {
        ...(status && { status }),
      },
      sort: sort || { field: 'created_at', order: 'DESC' },
      pagination,
    });
    return suppliers;
  });

  // Get active suppliers
  registerIPCHandler('suppliers:active', async (event, args, repos) => {
    return repos.suppliers.getActiveSuppliers();
  });

  // Get supplier by ID
  registerIPCHandler('suppliers:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Supplier ID');
    
    const supplier = await repos.suppliers.getById(id);
    if (!supplier) {
      throw new Error(`Supplier not found: ${id}`);
    }
    
    return supplier;
  });

  // Get supplier with purchases summary
  registerIPCHandler('suppliers:get-with-summary', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Supplier ID');
    
    const supplier = await repos.suppliers.getWithPurchasesSummary(id);
    if (!supplier) {
      throw new Error(`Supplier not found: ${id}`);
    }
    
    return supplier;
  });

  // Create new supplier
  registerIPCHandler('suppliers:create', async (event, args: CreateSupplierInput, repos) => {
    // Validate required fields
    validators.requiredString(args.id, 'Supplier ID');
    validators.requiredString(args.name, 'Supplier Name');
    
    if (args.email) {
      validators.email(args.email, 'Email');
    }
    
    if (args.opening_balance !== undefined) {
      validators.requiredNumber(args.opening_balance, 'Opening Balance');
    }

    const supplierId = await repos.suppliers.create(args);
    return supplierId;
  });

  // Update supplier
  registerIPCHandler('suppliers:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Supplier ID');
    
    if (data.email) {
      validators.email(data.email, 'Email');
    }

    const success = await repos.suppliers.update(id, data as UpdateSupplierInput);
    if (!success) {
      throw new Error('Failed to update supplier');
    }
    
    return { success: true };
  });

  // Update supplier balance
  registerIPCHandler('suppliers:update-balance', async (event, args, repos) => {
    const { id, amount, operation } = args;
    validators.requiredString(id, 'Supplier ID');
    validators.requiredNumber(amount, 'Amount');
    validators.oneOf(operation, ['add', 'subtract'], 'Operation');

    const success = await repos.suppliers.updateBalance(id, amount, operation);
    if (!success) {
      throw new Error('Failed to update supplier balance');
    }
    
    return { success: true };
  });

  // Delete supplier (soft delete) - also deletes all related purchases
  registerIPCHandler('suppliers:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Supplier ID');

    try {
      
      // Get all purchases for this supplier
      const purchases = await repos.purchases.getBySupplier(id);
      const purchaseCount = purchases.length;
      
      
      // Delete all purchases for this supplier (soft delete)
      for (const purchase of purchases) {
        await repos.purchases.delete(purchase.id, true);
      }


      // Delete the supplier (soft delete)
      const success = await repos.suppliers.delete(id, true);
      if (!success) {
        throw new Error('Failed to delete supplier');
      }
      
      
      return { success: true, deletedPurchases: purchaseCount };
    } catch (error) {
      console.error('❌ Error deleting supplier with cascade:', error);
      throw new Error(`Failed to delete supplier: ${error}`);
    }
  });

  // Search suppliers
  registerIPCHandler('suppliers:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.suppliers.search(term);
  });

  // Get suppliers with payables
  registerIPCHandler('suppliers:with-payables', async (event, args, repos) => {
    const { minPayable } = args || {};
    return repos.suppliers.getWithPayables(minPayable);
  });

  // Get total payables
  registerIPCHandler('suppliers:total-payables', async (event, args, repos) => {
    return repos.suppliers.getTotalPayables();
  });

  // Get supplier statistics
  registerIPCHandler('suppliers:statistics', async (event, args, repos) => {
    return repos.suppliers.getStatistics();
  });

  // Get top suppliers
  registerIPCHandler('suppliers:top', async (event, args, repos) => {
    const { limit } = args || {};
    return repos.suppliers.getTopSuppliers(limit || 10);
  });

  // Get supplier by phone
  registerIPCHandler('suppliers:by-phone', async (event, args, repos) => {
    const { phone } = args;
    validators.requiredString(phone, 'Phone number');
    
    return repos.suppliers.getByPhone(phone);
  });

  // Get supplier by email
  registerIPCHandler('suppliers:by-email', async (event, args, repos) => {
    const { email } = args;
    validators.requiredString(email, 'Email');
    validators.email(email, 'Email');
    
    return repos.suppliers.getByEmail(email);
  });
}
