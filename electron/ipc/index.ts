/**
 * IPC Handler Registration System
 * Central module for registering all IPC handlers with error handling and validation
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import type { Database } from 'better-sqlite3';
import { RepositoryContainer } from '../database/repositories';

/**
 * Standard IPC response format
 */
export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * IPC Handler function type
 */
export type IPCHandler<TArgs = any, TResult = any> = (
  event: IpcMainInvokeEvent,
  args: TArgs,
  repos: RepositoryContainer
) => Promise<TResult>;

/**
 * Error handling wrapper for IPC handlers
 */
export function wrapIPCHandler<TArgs = any, TResult = any>(
  handler: IPCHandler<TArgs, TResult>
): (event: IpcMainInvokeEvent, args: TArgs) => Promise<IPCResponse<TResult>> {
  return async (event: IpcMainInvokeEvent, args: TArgs) => {
    try {
      const repos = (global as any).repositories as RepositoryContainer;

      if (!repos) {
        throw new Error('Database repositories not initialized');
      }

      const data = await handler(event, args, repos);

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error(`IPC Handler Error:`, error);

      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
        code: error.code,
      };
    }
  };
}

/**
 * Register an IPC handler with automatic error handling
 */
export function registerIPCHandler<TArgs = any, TResult = any>(
  channel: string,
  handler: IPCHandler<TArgs, TResult>
): void {
  ipcMain.handle(channel, wrapIPCHandler(handler));
}

/**
 * Validation helper functions
 */
export const validators = {
  required: (value: any, fieldName: string): void => {
    if (value === undefined || value === null || value === '') {
      throw new Error(`${fieldName} is required`);
    }
  },

  requiredString: (value: any, fieldName: string): void => {
    validators.required(value, fieldName);
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }
  },

  requiredNumber: (value: any, fieldName: string): void => {
    validators.required(value, fieldName);
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${fieldName} must be a valid number`);
    }
  },

  positiveNumber: (value: number, fieldName: string): void => {
    validators.requiredNumber(value, fieldName);
    if (value < 0) {
      throw new Error(`${fieldName} must be a positive number`);
    }
  },

  nonNegativeNumber: (value: number, fieldName: string): void => {
    validators.requiredNumber(value, fieldName);
    if (value < 0) {
      throw new Error(`${fieldName} cannot be negative`);
    }
  },

  email: (value: string | undefined, fieldName: string): void => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error(`${fieldName} must be a valid email address`);
    }
  },

  oneOf: (value: any, allowedValues: any[], fieldName: string): void => {
    if (!allowedValues.includes(value)) {
      throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }
  },
};

/**
 * Initialize all IPC handlers
 */
export async function initializeIPCHandlers(db: Database, dbPath: string): Promise<void> {

  // Store repositories globally for handler access
  const repos = new RepositoryContainer(db);
  (global as any).repositories = repos;

  // Import and register all handlers
  const accountsModule = await import('./handlers/accounts.js');
  const customersModule = await import('./handlers/customers.js');
  const suppliersModule = await import('./handlers/suppliers.js');
  const itemsModule = await import('./handlers/items.js');
  const unitsModule = await import('./handlers/units.js');
  const salesModule = await import('./handlers/sales.js');
  const purchasesModule = await import('./handlers/purchases.js');
  const paymentsModule = await import('./handlers/payments.js');
  const expensesModule = await import('./handlers/expenses.js');
  const expenseCategoriesModule = await import('./handlers/expenseCategories.js');
  const transactionsModule = await import('./handlers/transactions.js');
  const settingsModule = await import('./handlers/settings.js');
  const ridersModule = await import('./handlers/riders.js');
  const goodsTasksModule = await import('./handlers/goodsTasks.js');
  const taskItemsModule = await import('./handlers/taskItems.js');
  const reportsModule = await import('./handlers/reports.js');
  const licenseModule = await import('./handlers/license.js');
  const backupModule = await import('./handlers/backup.js');
  const exportModule = await import('./handlers/export.js');
  const authModule = await import('./handlers/auth.js');
  const invoiceFormatModule = await import('./handlers/invoiceFormat.js');

  // Register all handlers
  accountsModule.registerAccountsHandlers();
  customersModule.registerCustomersHandlers();
  suppliersModule.registerSuppliersHandlers();
  itemsModule.registerItemsHandlers();
  unitsModule.registerUnitsHandlers();
  salesModule.registerSalesHandlers();
  purchasesModule.registerPurchasesHandlers();
  paymentsModule.registerPaymentsHandlers();
  expensesModule.registerExpensesHandlers();
  expenseCategoriesModule.registerExpenseCategoriesHandlers();
  transactionsModule.registerTransactionsHandlers();
  settingsModule.registerSettingsHandlers();
  ridersModule.registerRidersHandlers();
  goodsTasksModule.registerGoodsTasksHandlers();
  taskItemsModule.registerTaskItemsHandlers();
  reportsModule.registerReportsHandlers();
  exportModule.registerExportHandlers();
  authModule.registerAuthHandlers();
  invoiceFormatModule.registerInvoiceFormatHandlers();
  // License handlers are auto-registered on import

  // Initialize and register backup handlers
  backupModule.initializeBackupService(dbPath);
  backupModule.registerBackupHandlers();

}

/**
 * Clean up IPC handlers
 */
export function cleanupIPCHandlers(): void {
  // Remove all IPC handlers
  ipcMain.removeAllListeners();

  // Clean up global repositories
  delete (global as any).repositories;

}
