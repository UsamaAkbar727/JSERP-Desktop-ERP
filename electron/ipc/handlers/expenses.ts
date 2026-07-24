/**
 * Expenses IPC Handlers
 * Handles IPC communication for expense operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateExpenseInput, UpdateExpenseInput } from '../../database/repositories';

/**
 * Register all expenses-related IPC handlers
 */
export function registerExpensesHandlers(): void {
  // List all expenses
  registerIPCHandler('expenses:list', async (event, args, repos) => {
    const { category, accountId, startDate, endDate, sort, pagination } = args || {};
    
    const expenses = await repos.expenses.getAll({
      filters: {
        ...(category && { category }),
        ...(accountId && { account_id: accountId }),
      },
      sort: sort || { field: 'date', order: 'DESC' },
      pagination,
    });
    return expenses;
  });

  // Get expense by ID
  registerIPCHandler('expenses:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredNumber(id, 'Expense ID');
    
    const expense = await repos.expenses.getById(id);
    if (!expense) {
      throw new Error(`Expense not found: ${id}`);
    }
    
    return expense;
  });

  // Create new expense
  registerIPCHandler('expenses:create', async (event, args: CreateExpenseInput, repos) => {
    // Validate required fields
    validators.requiredString(args.account_id, 'Account ID');
    validators.requiredNumber(args.amount, 'Amount');
    validators.requiredString(args.category, 'Category');
    validators.positiveNumber(args.amount, 'Amount');

    // Get account details and check balance
    const account = await repos.accounts.getById(args.account_id);
    if (!account) {
      throw new Error('Account not found');
    }

    const availableBalance = account.current_balance;
    const requestedAmount = args.amount;
    
    // Determine actual expense amount based on available balance
    const actualExpenseAmount = Math.min(requestedAmount, availableBalance);
    
    if (actualExpenseAmount <= 0) {
      throw new Error('Insufficient account balance for expense');
    }

    // Create expense with actual amount - ExpensesRepository will handle account balance update automatically
    const expenseData = {
      ...args,
      amount: actualExpenseAmount,
    };
    
    const expenseId = await repos.expenses.create(expenseData);
    
    // Verify it was saved by reading it back
    const savedExpense = await repos.expenses.getById(expenseId);
    
    return { id: expenseId, actualAmount: actualExpenseAmount };
  });

  // Update expense
  registerIPCHandler('expenses:update', async (event, args, repos) => {
    const { id, data } = args;
    
    validators.requiredString(id, 'Expense ID');
    
    if (data.amount !== undefined) {
      validators.positiveNumber(data.amount, 'Amount');
    }

    const success = await repos.expenses.update(id, data as UpdateExpenseInput);
    if (!success) {
      throw new Error('Failed to update expense');
    }
    
    return { success: true };
  });

  // Delete expense
  registerIPCHandler('expenses:delete', async (event, args, repos) => {
    const { id } = args;
    
    validators.requiredString(id, 'Expense ID');

    const success = await repos.expenses.delete(id);
    if (!success) {
      throw new Error('Failed to delete expense');
    }
    
    return { success: true };
  });

  // Search expenses
  registerIPCHandler('expenses:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.expenses.search(term);
  });

  // Get expenses by category
  registerIPCHandler('expenses:by-category', async (event, args, repos) => {
    const { category } = args;
    validators.requiredString(category, 'Category');
    
    return repos.expenses.getByCategory(category);
  });

  // Get expenses by account
  registerIPCHandler('expenses:by-account', async (event, args, repos) => {
    const { accountId } = args;
    validators.requiredString(accountId, 'Account ID');
    
    return repos.expenses.getByAccount(accountId);
  });

  // Get expenses by date range
  registerIPCHandler('expenses:by-date-range', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    
    return repos.expenses.getExpensesByDateRange(startDate, endDate);
  });

  // Get total expenses
  registerIPCHandler('expenses:total', async (event, args, repos) => {
    const { startDate, endDate } = args || {};
    return repos.expenses.getTotalExpenses(startDate, endDate);
  });

  // Get expenses by category summary
  registerIPCHandler('expenses:category-summary', async (event, args, repos) => {
    const { startDate, endDate } = args || {};
    const allExpenses = await repos.expenses.getExpensesByDateRange(startDate || '', endDate || '');
    
    // Group by category
    const byCategory = allExpenses.reduce((acc: any, expense: any) => {
      const cat = expense.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = { category: cat, total: 0, count: 0 };
      }
      acc[cat].total += expense.amount || 0;
      acc[cat].count += 1;
      return acc;
    }, {});
    
    return Object.values(byCategory);
  });

  // Get top expense categories
  registerIPCHandler('expenses:top-categories', async (event, args, repos) => {
    const { limit, startDate, endDate } = args || {};
    return repos.expenses.getTopCategories(limit || 10, startDate, endDate);
  });
}
