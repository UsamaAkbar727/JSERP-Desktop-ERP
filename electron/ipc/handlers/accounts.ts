/**
 * Accounts IPC Handlers
 * Handles IPC communication for account operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateAccountInput, UpdateAccountInput } from '../../database/repositories';

/**
 * Register all accounts-related IPC handlers
 */
export function registerAccountsHandlers(): void {
  // List all accounts
  registerIPCHandler('accounts:list', async (event, args, repos) => {
    const { type, status, sort } = args || {};
    
    const accounts = await repos.accounts.getAll({
      type,
      status,
      sort: sort || { field: 'account_name', order: 'ASC' },
    });
    return accounts;
  });

  // Get active accounts
  registerIPCHandler('accounts:active', async (event, args, repos) => {
    return repos.accounts.getActiveAccounts();
  });

  // Get account by ID
  registerIPCHandler('accounts:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Account ID');
    
    const account = await repos.accounts.getById(id);
    if (!account) {
      throw new Error(`Account not found: ${id}`);
    }
    
    return account;
  });

  // Create new account
  registerIPCHandler('accounts:create', async (event, args: CreateAccountInput, repos) => {
    // Validate required fields
    validators.requiredString(args.id, 'Account ID');
    validators.requiredString(args.account_name, 'Account Name');
    validators.requiredString(args.account_type, 'Account Type');
    validators.oneOf(args.account_type, ['cash', 'bank', 'mobile_wallet', 'cheque', 'custom'], 'Account Type');
    
    if (args.opening_balance !== undefined) {
      validators.requiredNumber(args.opening_balance, 'Opening Balance');
    }

    const accountId = await repos.accounts.create(args);
    return accountId;
  });

  // Update account
  registerIPCHandler('accounts:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Account ID');
    
    if (data.account_type) {
      validators.oneOf(data.account_type, ['cash', 'bank', 'mobile_wallet', 'cheque', 'custom'], 'Account Type');
    }

    console.log('[accounts:update IPC] Received update request:', { id, data });

    const success = await repos.accounts.update(id, data as UpdateAccountInput);
    if (!success) {
      throw new Error('Failed to update account');
    }
    
    console.log('[accounts:update IPC] Update successful');
    return { success: true };
  });

  // Update account balance
  registerIPCHandler('accounts:update-balance', async (event, args, repos) => {
    const { id, amount, operation } = args;
    validators.requiredString(id, 'Account ID');
    validators.requiredNumber(amount, 'Amount');
    validators.oneOf(operation, ['add', 'subtract'], 'Operation');

    const success = await repos.accounts.updateBalance(id, amount, operation);
    if (!success) {
      throw new Error('Failed to update account balance');
    }
    
    return { success: true };
  });

  // Delete account (soft delete)
  registerIPCHandler('accounts:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Account ID');

    // Always use soft delete (set status to inactive)
    // This preserves transaction history while making account unavailable
    const success = await repos.accounts.delete(id, true);
    if (!success) {
      throw new Error('Failed to delete account');
    }
    
    return { success: true };
  });

  // Get accounts by type
  registerIPCHandler('accounts:by-type', async (event, args, repos) => {
    const { type } = args;
    validators.requiredString(type, 'Account Type');
    
    return repos.accounts.getByType(type);
  });

  // Get balance summary
  registerIPCHandler('accounts:balance-summary', async (event, args, repos) => {
    return repos.accounts.getBalanceSummary();
  });

  // Get total balance
  registerIPCHandler('accounts:total-balance', async (event, args, repos) => {
    const { type } = args || {};
    return repos.accounts.getTotalBalance(type);
  });

  // Search accounts
  registerIPCHandler('accounts:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.accounts.search(term);
  });
}
