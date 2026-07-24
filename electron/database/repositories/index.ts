/**
 * Repository Index
 * Central export point for all repository classes
 * Provides a unified interface to access all database repositories
 */

import type { Database } from 'better-sqlite3';
import { AccountsRepository } from './AccountsRepository';
import { CustomersRepository } from './CustomersRepository';
import { SuppliersRepository } from './SuppliersRepository';
import { ItemsRepository } from './ItemsRepository';
import { UnitsRepository } from './UnitsRepository';
import { SalesRepository } from './SalesRepository';
import { PurchasesRepository } from './PurchasesRepository';
import { PaymentsRepository } from './PaymentsRepository';
import { ExpensesRepository } from './ExpensesRepository';
import { ExpenseCategoriesRepository } from './ExpenseCategoriesRepository';
import { TransactionsRepository } from './TransactionsRepository';
import { SettingsRepository } from './SettingsRepository';
import { RidersRepository } from './RidersRepository';
import { GoodsTasksRepository } from './GoodsTasksRepository';
import { TaskItemsRepository } from './TaskItemsRepository';
import { LicenseRepository } from './LicenseRepository';
import { UsersRepository } from './UsersRepository';
import { InvoiceFormatRepository } from './InvoiceFormatRepository';

// Base Repository
export { BaseRepository } from './BaseRepository';
export type {
  PaginationOptions,
  SortOptions,
  FilterOptions,
  QueryOptions,
  PaginatedResult,
} from './BaseRepository';

// Accounts Repository
export { AccountsRepository } from './AccountsRepository';
export type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from './AccountsRepository';

// Customers Repository
export { CustomersRepository } from './CustomersRepository';
export type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
} from './CustomersRepository';

// Suppliers Repository
export { SuppliersRepository } from './SuppliersRepository';
export type {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
} from './SuppliersRepository';

// Items Repository
export { ItemsRepository } from './ItemsRepository';
export type {
  Item,
  CreateItemInput,
  UpdateItemInput,
} from './ItemsRepository';

// Units Repository
export { UnitsRepository } from './UnitsRepository';
export type {
  Unit,
  CreateUnitInput,
  UpdateUnitInput,
} from './UnitsRepository';

// Sales Repository
export { SalesRepository } from './SalesRepository';
export type {
  Sale,
  SaleItem,
  SaleWithItems,
  CreateSaleInput,
  UpdateSaleInput,
} from './SalesRepository';

// Purchases Repository
export { PurchasesRepository } from './PurchasesRepository';
export type {
  Purchase,
  PurchaseItem,
  PurchaseWithItems,
  CreatePurchaseInput,
  UpdatePurchaseInput,
} from './PurchasesRepository';

// Payments Repository
export { PaymentsRepository } from './PaymentsRepository';
export type {
  Payment,
  CreatePaymentInput,
} from './PaymentsRepository';

// Expenses Repository
export { ExpensesRepository } from './ExpensesRepository';
export type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
} from './ExpensesRepository';

// Expense Categories Repository
export { ExpenseCategoriesRepository } from './ExpenseCategoriesRepository';
export type {
  ExpenseCategory,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
} from './ExpenseCategoriesRepository';

// Transactions Repository
export { TransactionsRepository } from './TransactionsRepository';
export type {
  Transaction,
  CreateTransactionInput,
} from './TransactionsRepository';

// Settings Repository
export { SettingsRepository } from './SettingsRepository';
export type {
  Setting,
} from './SettingsRepository';

// Riders Repository
export { RidersRepository } from './RidersRepository';
export type {
  Rider,
  CreateRiderInput,
  UpdateRiderInput,
} from './RidersRepository';

// Goods Tasks Repository
export { GoodsTasksRepository } from './GoodsTasksRepository';
export type {
  GoodsTask,
  CreateGoodsTaskInput,
  UpdateGoodsTaskInput,
} from './GoodsTasksRepository';

// Task Items Repository
export { TaskItemsRepository } from './TaskItemsRepository';
export type {
  TaskItem,
  CreateTaskItemInput,
  UpdateTaskItemInput,
} from './TaskItemsRepository';

// License Repository
export { LicenseRepository } from './LicenseRepository';
export type {
  License,
  LicenseFeatures,
} from './LicenseRepository';

// Users Repository
export { UsersRepository } from './UsersRepository';
export type {
  User,
  CreateUserData,
  UpdateUserData,
} from './UsersRepository';

// Invoice Format Repository
export { InvoiceFormatRepository } from './InvoiceFormatRepository';
export type {
  InvoiceFormat,
  InvoiceFormatType,
  ResetType,
  DateFormat,
  UpdateInvoiceFormatInput,
} from './InvoiceFormatRepository';

/**
 * Repository Container
 * Provides centralized access to all repositories
 */
export class RepositoryContainer {
  public db: Database;
  public accounts: AccountsRepository;
  public customers: CustomersRepository;
  public suppliers: SuppliersRepository;
  public items: ItemsRepository;
  public units: UnitsRepository;
  public sales: SalesRepository;
  public purchases: PurchasesRepository;
  public payments: PaymentsRepository;
  public expenses: ExpensesRepository;
  public expenseCategories: ExpenseCategoriesRepository;
  public transactions: TransactionsRepository;
  public settings: SettingsRepository;
  public riders: RidersRepository;
  public goodsTasks: GoodsTasksRepository;
  public taskItems: TaskItemsRepository;
  public license: LicenseRepository;
  public users: UsersRepository;
  public invoiceFormat: InvoiceFormatRepository;

  constructor(db: Database) {
    this.db = db;
    this.accounts = new AccountsRepository(db);
    this.customers = new CustomersRepository(db);
    this.suppliers = new SuppliersRepository(db);
    this.items = new ItemsRepository(db);
    this.units = new UnitsRepository(db);
    this.sales = new SalesRepository(db);
    this.purchases = new PurchasesRepository(db);
    this.payments = new PaymentsRepository(db);
    this.expenses = new ExpensesRepository(db);
    this.expenseCategories = new ExpenseCategoriesRepository(db);
    this.transactions = new TransactionsRepository(db);
    this.settings = new SettingsRepository(db);
    this.riders = new RidersRepository(db);
    this.goodsTasks = new GoodsTasksRepository(db);
    this.taskItems = new TaskItemsRepository(db);
    this.license = new LicenseRepository(db);
    this.users = new UsersRepository(db);
    this.invoiceFormat = new InvoiceFormatRepository(db);
  }

  /**
   * Get all repositories as an object
   */
  getAll() {
    return {
      accounts: this.accounts,
      customers: this.customers,
      suppliers: this.suppliers,
      items: this.items,
      units: this.units,
      sales: this.sales,
      purchases: this.purchases,
      payments: this.payments,
      expenses: this.expenses,
      expenseCategories: this.expenseCategories,
      transactions: this.transactions,
      settings: this.settings,
      riders: this.riders,
      goodsTasks: this.goodsTasks,
      taskItems: this.taskItems,
      license: this.license,
      users: this.users,
      invoiceFormat: this.invoiceFormat,
    };
  }
}

/**
 * Create and initialize all repositories
 */
export function createRepositories(db: Database): RepositoryContainer {
  return new RepositoryContainer(db);
}
