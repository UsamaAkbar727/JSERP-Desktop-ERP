/**
 * Transactions IPC Handlers
 * Handles IPC communication for accounting transaction operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateTransactionInput } from '../../database/repositories';

/**
 * Register all transactions-related IPC handlers
 */
export function registerTransactionsHandlers(): void {
  // List all transactions
  registerIPCHandler('transactions:list', async (event, args, repos) => {
    const { accountId, type, startDate, endDate, sort, pagination } = args || {};
    
    const transactions = await repos.transactions.getAll({
      filters: {
        ...(accountId && { account_id: accountId }),
        ...(type && { type }),
      },
      sort: sort || { field: 'transaction_date', order: 'DESC' },
      pagination,
    });
    return transactions;
  });

  // Get transaction by ID
  registerIPCHandler('transactions:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredNumber(id, 'Transaction ID');
    
    const transaction = await repos.transactions.getById(id);
    if (!transaction) {
      throw new Error(`Transaction not found: ${id}`);
    }
    
    return transaction;
  });

  // Create new transaction
  registerIPCHandler('transactions:create', async (event, args: CreateTransactionInput, repos) => {
    // Validate required fields
    validators.requiredString(args.account_id, 'Account ID');
    validators.requiredNumber(args.amount, 'Amount');
    validators.positiveNumber(args.amount, 'Amount');

    const transactionId = await repos.transactions.create(args);
    return transactionId;
  });

  // Update transaction
  registerIPCHandler('transactions:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredNumber(id, 'Transaction ID');
    
    if (data.amount !== undefined) {
      validators.positiveNumber(data.amount, 'Amount');
    }

    const success = await repos.transactions.update(id, data);
    if (!success) {
      throw new Error('Failed to update transaction');
    }
    
    return { success: true };
  });

  // Delete transaction (soft delete)
  registerIPCHandler('transactions:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredNumber(id, 'Transaction ID');

    const success = await repos.transactions.delete(id, true);
    if (!success) {
      throw new Error('Failed to delete transaction');
    }
    
    return { success: true };
  });

  // Search transactions
  registerIPCHandler('transactions:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.transactions.search(term);
  });

  // Get transactions by account
  registerIPCHandler('transactions:by-account', async (event, args, repos) => {
    const { accountId } = args;
    validators.requiredString(accountId, 'Account ID');
    
    return repos.transactions.getByAccount(accountId);
  });

  // Get transactions by date range
  registerIPCHandler('transactions:by-date-range', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    
    return repos.transactions.getTransactionsByDateRange(startDate, endDate);
  });

  // Get account ledger
  registerIPCHandler('transactions:account-ledger', async (event, args, repos) => {
    const { accountId, startDate, endDate } = args || {};
    validators.requiredString(accountId, 'Account ID');
    
    return repos.transactions.getAccountLedger(accountId, startDate, endDate);
  });
  // Get comprehensive inflows/outflows summary
  registerIPCHandler('transactions:inflow-outflow-summary', async (event, args, repos) => {
    const { startDate, endDate } = args || {};
    return repos.transactions.getInflowOutflowSummary(startDate, endDate);
  });
}
