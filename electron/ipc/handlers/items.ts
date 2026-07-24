/**
 * Items IPC Handlers
 * Handles IPC communication for item/inventory operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateItemInput, UpdateItemInput } from '../../database/repositories';

/**
 * Register all items-related IPC handlers
 */
export function registerItemsHandlers(): void {
  // List all items
  registerIPCHandler('items:list', async (event, args, repos) => {
    const { status, sort, pagination } = args || {};
    
    const items = await repos.items.getAll({
      filters: {
        ...(status && { status }),
      },
      sort: sort || { field: 'created_at', order: 'DESC' },
      pagination,
    });
    return items;
  });

  // Get active items
  registerIPCHandler('items:active', async (event, args, repos) => {
    return repos.items.getActiveItems();
  });

  // Get item by ID
  registerIPCHandler('items:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Item ID');
    
    const item = await repos.items.getById(id);
    if (!item) {
      throw new Error(`Item not found: ${id}`);
    }
    
    return item;
  });

  // Create new item
  registerIPCHandler('items:create', async (event, args: CreateItemInput, repos) => {
    // Validate required fields
    validators.requiredString(args.id, 'Item ID');
    validators.requiredString(args.name, 'Item Name');
    validators.requiredNumber(args.sale_price, 'Sale Price');
    validators.requiredNumber(args.purchase_price, 'Purchase Price');
    validators.requiredString(args.unit_id, 'Unit ID');
    validators.requiredString(args.unit, 'Unit');
    
    validators.positiveNumber(args.sale_price, 'Sale Price');
    validators.positiveNumber(args.purchase_price, 'Purchase Price');

    const itemId = await repos.items.create(args);
    return itemId;
  });

  // Update item
  registerIPCHandler('items:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Item ID');
    
    if (data.sale_price !== undefined) {
      validators.positiveNumber(data.sale_price, 'Sale Price');
    }
    if (data.purchase_price !== undefined) {
      validators.positiveNumber(data.purchase_price, 'Purchase Price');
    }

    const success = await repos.items.update(id, data as UpdateItemInput);
    if (!success) {
      throw new Error('Failed to update item');
    }
    
    return { success: true };
  });

  // Update item stock
  registerIPCHandler('items:update-stock', async (event, args, repos) => {
    const { id, quantity, operation } = args;
    validators.requiredString(id, 'Item ID');
    validators.requiredNumber(quantity, 'Quantity');
    validators.oneOf(operation, ['add', 'subtract', 'set'], 'Operation');

    const success = await repos.items.updateStock(id, quantity, operation);
    if (!success) {
      throw new Error('Failed to update item stock');
    }
    
    return { success: true };
  });

  // Delete item (soft delete)
  registerIPCHandler('items:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Item ID');

    const success = await repos.items.delete(id, true);
    if (!success) {
      throw new Error('Failed to delete item');
    }
    
    return { success: true };
  });

  // Search items
  registerIPCHandler('items:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.items.search(term);
  });

  // Get low stock items
  registerIPCHandler('items:low-stock', async (event, args, repos) => {
    return repos.items.getLowStock();
  });

  // Get out of stock items
  registerIPCHandler('items:out-of-stock', async (event, args, repos) => {
    return repos.items.getOutOfStock();
  });

  // Get item by SKU
  registerIPCHandler('items:by-sku', async (event, args, repos) => {
    const { sku } = args;
    validators.requiredString(sku, 'SKU');
    
    return repos.items.getBySku(sku);
  });

  // Get items by unit
  registerIPCHandler('items:by-unit', async (event, args, repos) => {
    const { unitId } = args;
    validators.requiredString(unitId, 'Unit ID');
    
    return repos.items.getByUnit(unitId);
  });

  // Get total inventory value
  registerIPCHandler('items:inventory-value', async (event, args, repos) => {
    return repos.items.getTotalInventoryValue();
  });

  // Get inventory statistics
  registerIPCHandler('items:statistics', async (event, args, repos) => {
    return repos.items.getStatistics();
  });

  // Get top selling items
  registerIPCHandler('items:top-selling', async (event, args, repos) => {
    const { limit } = args || {};
    return repos.items.getTopSellingItems(limit || 10);
  });

  // Get items with profit margins
  registerIPCHandler('items:profit-margins', async (event, args, repos) => {
    return repos.items.getWithProfitMargins();
  });

  // Bulk update prices
  registerIPCHandler('items:bulk-update-prices', async (event, args, repos) => {
    const { updates } = args;
    
    if (!Array.isArray(updates)) {
      throw new Error('Updates must be an array');
    }

    return repos.items.bulkUpdatePrices(updates);
  });
}
