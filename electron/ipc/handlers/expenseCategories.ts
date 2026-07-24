/**
 * Expense Categories IPC Handlers
 * Handles communication between renderer process and expense categories repository
 */

import { registerIPCHandler, validators } from '../index';

/**
 * Register all expense categories-related IPC handlers
 */
export function registerExpenseCategoriesHandlers(): void {
  // List all expense categories
  registerIPCHandler('expense-categories:list', async (event, args, repos) => {
    const { status, sort, pagination } = args || {};
    
    const categories = await repos.expenseCategories.getAll({
      filters: {
        ...(status && { status }),
      },
      sort: sort || { field: 'name', order: 'ASC' },
      pagination,
    });
    return categories;
  });

  // Get active expense categories
  registerIPCHandler('expense-categories:active', async (event, args, repos) => {
    return repos.expenseCategories.getActiveCategories();
  });

  // Get expense category by ID
  registerIPCHandler('expense-categories:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Category ID');
    
    const category = await repos.expenseCategories.getById(id);
    if (!category) {
      throw new Error(`Expense category not found: ${id}`);
    }
    return category;
  });

  // Create new expense category
  registerIPCHandler('expense-categories:create', async (event, args, repos) => {
    const { id, name, status } = args;
    
    validators.requiredString(id, 'Category ID');
    validators.requiredString(name, 'Category Name');

    // Check if name already exists
    const nameExists = await repos.expenseCategories.nameExists(name);
    if (nameExists) {
      throw new Error(`Category with name "${name}" already exists`);
    }
    
    const categoryId = await repos.expenseCategories.create({
      id,
      name: name.trim(),
      status: status || 'active',
    });
    
    return repos.expenseCategories.getById(categoryId);
  });

  // Update expense category
  registerIPCHandler('expense-categories:update', async (event, args, repos) => {
    const { id, data } = args;
    
    validators.requiredString(id, 'Category ID');
    
    // Check if category exists
    const category = await repos.expenseCategories.getById(id);
    if (!category) {
      throw new Error(`Expense category not found: ${id}`);
    }

    // If name is being updated, check if it already exists (excluding current category)
    if (data.name) {
      const nameExists = await repos.expenseCategories.nameExists(data.name, id);
      if (nameExists) {
        throw new Error(`Category with name "${data.name}" already exists`);
      }
    }
    
    const success = await repos.expenseCategories.update(id, data);
    if (!success) {
      throw new Error('Failed to update expense category');
    }
    
    return repos.expenseCategories.getById(id);
  });

  // Delete expense category
  registerIPCHandler('expense-categories:delete', async (event, args, repos) => {
    const { id } = args;
    
    validators.requiredString(id, 'Category ID');
    
    // Check if category exists
    const category = await repos.expenseCategories.getById(id);
    if (!category) {
      throw new Error(`Expense category not found: ${id}`);
    }
    
    const success = await repos.expenseCategories.delete(id); // Soft delete (sets status to inactive)
    if (!success) {
      throw new Error('Failed to delete expense category');
    }
    
    return { success: true };
  });

  // Search expense categories
  registerIPCHandler('expense-categories:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.expenseCategories.search(term);
  });
}
