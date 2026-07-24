/**
 * TypeScript definitions for the window.api object exposed via preload.ts
 * This file provides type safety for all IPC communication between renderer and main process
 */

// ==================== Core Response Type ====================

export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== Entity Types ====================

export interface Account {
  id: string;
  account_name: string;
  account_type: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
  account_number?: string;
  bank_name?: string;
  opening_balance: number;
  current_balance: number;
  status: 'active' | 'inactive';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  opening_balance: number;
  current_balance: number;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithSummary extends Customer {
  total_invoices: number;
  last_sale_date?: string;
}

export interface Supplier {
  id: string;
  name: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  opening_balance: number;
  current_balance: number;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierWithSummary extends Supplier {
  total_bills: number;
  last_purchase_date?: string;
}

export interface Item {
  id: string;
  name: string;
  name_urdu?: string;
  sku?: string;
  description?: string;
  sale_price: number;
  purchase_price: number;
  opening_stock: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit_id: string;
  unit: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  name: string;
  name_urdu?: string;
  symbol: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  sale_date: string;
  customer_id: string;
  customer_name: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom' | 'credit';
  account_id?: string;
  cheque_account_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit: string;
  purchase_price: number;
  profit: number;
  created_at: string;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export interface Purchase {
  id: string;
  bill_number: string;
  purchase_date: string;
  supplier_id?: string;
  supplier_name?: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
  account_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  item_id: string;
  item_name?: string;
  unit_id: string;
  unit_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
}

export interface Payment {
  id: string;
  payment_date: string;
  payment_type: 'receipt' | 'payment';
  amount: number;
  payment_method: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom' | 'credit';
  account_id?: string;
  account_name?: string;
  customer_id?: string;
  customer_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  sale_id?: string;
  purchase_id?: string;
  reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  account_id: string;
  account_name: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  transaction_date: string;
  reference_type: 'sale' | 'purchase' | 'customer_payment' | 'supplier_payment' | 'expense';
  reference_id: string;
  account_id?: string;
  account_name?: string;
  customer_id?: string;
  supplier_id?: string;
  direction: 'in' | 'out';
  amount: number;
  balance_after?: number;
  description: string;
  created_at: string;
}

export interface Setting {
  id: number;
  setting_key: string;
  setting_value: string;
  setting_type?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Rider {
  id: string;
  name: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RiderWithStats extends Rider {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inTransitTasks: number;
}

export interface GoodsTask {
  id: string;
  task_number: string;
  task_date: string;
  rider_id: string;
  rider_name: string;
  customer_id?: string;
  customer_name?: string;
  sale_id?: string;
  invoice_number?: string;
  pickup_address?: string;
  delivery_address: string;
  description?: string;
  amount: number;
  total_boxes: number;
  delivered_boxes: number;
  remaining_boxes: number;
  status: 'pending' | 'in_transit' | 'partially_delivered' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskItem {
  id: string;
  task_id: string;
  item_name: string;
  description?: string;
  is_delivered: number;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface GoodsTaskWithDetails extends GoodsTask {
  sale_details?: Sale;
  customer_details?: Customer;
  rider_details?: Rider;
}

// ==================== Filter and Pagination Types ====================

export interface ListFilters {
  search?: string;
  status?: 'active' | 'inactive';
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

// ==================== Input Types ====================

export interface CreateAccountInput {
  id: string;
  account_name: string;
  account_type: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
  account_number?: string;
  bank_name?: string;
  opening_balance?: number;
  current_balance?: number;
  status?: 'active' | 'inactive';
  description?: string;
}

export interface UpdateAccountInput {
  account_name?: string;
  account_type?: 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
  account_number?: string;
  bank_name?: string;
  opening_balance?: number;
  status?: 'active' | 'inactive';
  description?: string;
}

export interface CreateCustomerInput {
  id: string;
  name: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  opening_balance?: number;
  status?: 'active' | 'inactive';
}

export interface UpdateCustomerInput {
  name?: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  opening_balance?: number;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface CreateSupplierInput {
  id: string;
  name: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  opening_balance?: number;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  opening_balance?: number;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface CreateItemInput {
  id: string;
  name: string;
  name_urdu?: string;
  sku?: string;
  description?: string;
  sale_price: number;
  purchase_price: number;
  opening_stock?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  unit_id: string;
  unit: string;
  status?: 'active' | 'inactive';
}

export interface UpdateItemInput {
  name?: string;
  name_urdu?: string;
  sku?: string;
  description?: string;
  sale_price?: number;
  purchase_price?: number;
  low_stock_threshold?: number;
  unit_id?: string;
  unit?: string;
  status?: 'active' | 'inactive';
}

export interface CreateUnitInput {
  id: string;
  name: string;
  name_urdu?: string;
  symbol: string;
  status?: 'active' | 'inactive';
}

export interface UpdateUnitInput {
  name?: string;
  name_urdu?: string;
  symbol?: string;
  status?: 'active' | 'inactive';
}

export interface CreateSaleInput {
  invoice_no: string;
  sale_date: string;
  customer_id?: number;
  sub_total: number;
  discount?: number;
  tax?: number;
  total_amount: number;
  paid_amount?: number;
  payment_method?: string;
  account_id?: number;
  notes?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    unit_price: number;
  }>;
}

export interface UpdateSaleInput {
  invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  sale_date?: string;
  subtotal?: number;
  discount_amount?: number;
  discount_percent?: number;
  total_amount?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'cheque';
  account_id?: string;
  cheque_account_id?: string;
  notes?: string;
  items?: Array<{
    id?: string;
    item_id: string;
    item_name?: string;
    quantity: number;
    unit_price: number;
    total_price?: number;
    unit?: string;
    purchase_price?: number;
    profit?: number;
  }>;
}

export interface CreatePurchaseInput {
  bill_number: string;
  purchase_date: string;
  supplier_id?: number;
  subtotal: number;
  discount_amount?: number;
  discount_percent?: number;
  total_amount: number;
  paid_amount?: number;
  payment_method?: string;
  account_id?: number;
  notes?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    unit_price: number;
  }>;
}

export interface UpdatePurchaseInput {
  bill_number?: string;
  supplier_id?: string;
  supplier_name?: string;
  purchase_date?: string;
  subtotal?: number;
  discount_amount?: number;
  discount_percent?: number;
  total_amount?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: 'paid' | 'partial' | 'due';
  payment_method?: 'cash' | 'bank' | 'cheque';
  account_id?: string;
  cheque_account_id?: string;
  notes?: string;
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

export interface CreateExpenseInput {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  account_id: string;
  account_name: string;
  notes?: string;
}

export interface UpdateExpenseInput {
  date?: string;
  category?: string;
  description?: string;
  amount?: number;
  account_id?: string;
  account_name?: string;
  notes?: string;
}

export interface CreateExpenseCategoryInput {
  id: string;
  name: string;
  status?: 'active' | 'inactive';
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  status?: 'active' | 'inactive';
}

export interface CreateTransactionInput {
  id: string;
  transaction_date: string;
  reference_type: 'sale' | 'purchase' | 'customer_payment' | 'supplier_payment' | 'expense';
  reference_id: string;
  account_id?: string;
  customer_id?: string;
  supplier_id?: string;
  direction: 'in' | 'out';
  amount: number;
  balance_after?: number;
  description: string;
}

export interface CreateSettingInput {
  setting_key: string;
  setting_value: string;
  setting_type?: string;
  description?: string;
}

export interface UpdateSettingInput {
  setting_value?: string;
  setting_type?: string;
  description?: string;
}

export interface CreateRiderInput {
  id: string;
  name: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface UpdateRiderInput {
  name?: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface CreateGoodsTaskInput {
  id: string;
  task_number: string;
  task_date: string;
  rider_id: string;
  rider_name: string;
  customer_id?: string;
  customer_name?: string;
  sale_id?: string;
  invoice_number?: string;
  pickup_address?: string;
  delivery_address: string;
  description?: string;
  amount?: number;
  total_boxes?: number;
  delivered_boxes?: number;
  remaining_boxes?: number;
  status?: 'pending' | 'in_transit' | 'partially_delivered' | 'delivered' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assigned_at?: string;
  notes?: string;
}

export interface CreateTaskItemInput {
  id: string;
  task_id: string;
  item_name: string;
  description?: string;
  notes?: string;
}

export interface UpdateTaskItemInput {
  item_name?: string;
  description?: string;
  is_delivered?: number;
  delivered_at?: string;
  notes?: string;
}

export interface UpdateGoodsTaskInput {
  task_number?: string;
  task_date?: string;
  rider_id?: string;
  rider_name?: string;
  customer_id?: string;
  customer_name?: string;
  pickup_address?: string;
  delivery_address?: string;
  description?: string;
  amount?: number;
  total_boxes?: number;
  delivered_boxes?: number;
  remaining_boxes?: number;
  status?: 'pending' | 'in_transit' | 'partially_delivered' | 'delivered' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}

// ==================== Summary and Statistics Types ====================

export interface AccountBalanceSummary {
  total_debit: number;
  total_credit: number;
  net_balance: number;
}

export interface CustomerStatistics {
  total_customers: number;
  active_customers: number;
  total_receivables: number;
  customers_with_dues: number;
}

export interface SupplierStatistics {
  total_suppliers: number;
  active_suppliers: number;
  total_payables: number;
  suppliers_with_payables: number;
}

export interface ItemStatistics {
  total_items: number;
  active_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_inventory_value: number;
}

export interface SalesSummary {
  total_sales: number;
  total_amount: number;
  total_paid: number;
  total_due: number;
  average_sale: number;
}

export interface PurchasesSummary {
  total_purchases: number;
  total_amount: number;
  total_paid: number;
  total_due: number;
  average_purchase: number;
}

export interface PaymentsSummary {
  total_receipts: number;
  total_payments: number;
  net_cash_flow: number;
}

export interface InflowOutflowSummary {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  byType: Array<{
    referenceType: string;
    totalIn: number;
    totalOut: number;
    net: number;
  }>;
}

export interface ExpensesSummary {
  total_expenses: number;
  by_category: Array<{
    category: string;
    total: number;
    count: number;
  }>;
}

export interface DashboardSummary {
  sales: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
  purchases: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
  expenses: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
  receivables: number;
  payables: number;
  cash_in_hand: number;
  bank_balance: number;
  inventory_value: number;
  low_stock_items: number;
}

export interface ProfitLossReport {
  period: string;
  revenue: number;
  cost_of_goods: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
}

export interface ProductWiseReport {
  item_id: number;
  item_name: string;
  quantity_sold: number;
  quantity_purchased: number;
  current_stock: number;
  total_revenue: number;
  cost: number;
  profit: number;
  profit_margin: number;
}

export interface CashFlowReport {
  period: string;
  receipts: number;
  payments: number;
  expenses: number;
  net_cash_flow: number;
}

// ==================== Export Types ====================

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  status?: 'active' | 'inactive' | 'all';
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

export interface ExportResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

// ==================== API Definition ====================

export interface AccountsAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Account[]>>;
  active: () => Promise<IPCResponse<Account[]>>;
  get: (args: { id: string }) => Promise<IPCResponse<Account>>;
  create: (data: CreateAccountInput) => Promise<IPCResponse<Account>>;
  update: (args: { id: string; data: UpdateAccountInput }) => Promise<IPCResponse<Account>>;
  updateBalance: (args: { id: string; amount: number; operation: 'add' | 'subtract' }) => Promise<IPCResponse<Account>>;
  delete: (args: { id: string }) => Promise<IPCResponse<void>>;
  byType: (args: { type: string }) => Promise<IPCResponse<Account[]>>;
  balanceSummary: (args: { accountId: string; startDate?: string; endDate?: string }) => Promise<IPCResponse<AccountBalanceSummary>>;
  totalBalance: () => Promise<IPCResponse<number>>;
  search: (args: { term: string }) => Promise<IPCResponse<Account[]>>;
}

export interface CustomersAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Customer[]>>;
  active: () => Promise<IPCResponse<Customer[]>>;
  get: (args: { id: string }) => Promise<IPCResponse<Customer>>;
  getWithSummary: (args: { id: string }) => Promise<IPCResponse<CustomerWithSummary>>;
  create: (data: CreateCustomerInput) => Promise<IPCResponse<Customer>>;
  update: (args: { id: string; data: UpdateCustomerInput }) => Promise<IPCResponse<Customer>>;
  updateBalance: (args: { id: string; amount: number; operation: 'add' | 'subtract' }) => Promise<IPCResponse<Customer>>;
  delete: (args: { id: string }) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<Customer[]>>;
  withDues: () => Promise<IPCResponse<Customer[]>>;
  totalReceivables: () => Promise<IPCResponse<number>>;
  statistics: () => Promise<IPCResponse<CustomerStatistics>>;
  top: (limit?: number) => Promise<IPCResponse<Customer[]>>;
  byPhone: (phone: string) => Promise<IPCResponse<Customer>>;
  byEmail: (email: string) => Promise<IPCResponse<Customer>>;
}

export interface SuppliersAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Supplier[]>>;
  active: () => Promise<IPCResponse<Supplier[]>>;
  get: (args: { id: string }) => Promise<IPCResponse<Supplier>>;
  getWithSummary: (args: { id: string }) => Promise<IPCResponse<SupplierWithSummary>>;
  create: (data: CreateSupplierInput) => Promise<IPCResponse<Supplier>>;
  update: (args: { id: string; data: UpdateSupplierInput }) => Promise<IPCResponse<Supplier>>;
  updateBalance: (args: { id: string; amount: number; operation: 'add' | 'subtract' }) => Promise<IPCResponse<Supplier>>;
  delete: (args: { id: string }) => Promise<IPCResponse<void>>;
  search: (args: { term: string }) => Promise<IPCResponse<Supplier[]>>;
  withPayables: () => Promise<IPCResponse<Supplier[]>>;
  totalPayables: () => Promise<IPCResponse<number>>;
  statistics: () => Promise<IPCResponse<SupplierStatistics>>;
  top: (limit?: number) => Promise<IPCResponse<Supplier[]>>;
  byPhone: (args: { phone: string }) => Promise<IPCResponse<Supplier>>;
  byEmail: (args: { email: string }) => Promise<IPCResponse<Supplier>>;
}

export interface ItemsAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Item[]>>;
  active: () => Promise<IPCResponse<Item[]>>;
  get: (args: { id: string }) => Promise<IPCResponse<Item>>;
  create: (data: CreateItemInput) => Promise<IPCResponse<Item>>;
  update: (args: { id: string; data: UpdateItemInput }) => Promise<IPCResponse<Item>>;
  updateStock: (args: { id: string; quantity: number; type: 'add' | 'subtract' }) => Promise<IPCResponse<Item>>;
  delete: (args: { id: string }) => Promise<IPCResponse<void>>;
  search: (args: { term: string }) => Promise<IPCResponse<Item[]>>;
  lowStock: () => Promise<IPCResponse<Item[]>>;
  outOfStock: () => Promise<IPCResponse<Item[]>>;
  bySku: (args: { sku: string }) => Promise<IPCResponse<Item>>;
  byUnit: (args: { unitId: string }) => Promise<IPCResponse<Item[]>>;
  inventoryValue: () => Promise<IPCResponse<number>>;
  statistics: () => Promise<IPCResponse<ItemStatistics>>;
  topSelling: (limit?: number, startDate?: string, endDate?: string) => Promise<IPCResponse<ProductWiseReport[]>>;
  profitMargins: () => Promise<IPCResponse<Array<{ item_id: number; item_name: string; margin: number }>>>;
  bulkUpdatePrices: (updates: Array<{ id: string; purchase_price?: number; sale_price?: number }>) => Promise<IPCResponse<void>>;
}

export interface UnitsAPI {
  list: () => Promise<IPCResponse<Unit[]>>;
  get: (id: string) => Promise<IPCResponse<Unit>>;
  create: (data: CreateUnitInput) => Promise<IPCResponse<string>>;
  update: (id: string, data: UpdateUnitInput) => Promise<IPCResponse<boolean>>;
  delete: (id: string) => Promise<IPCResponse<boolean>>;
  search: (query: string) => Promise<IPCResponse<Unit[]>>;
  usageCount: (id: string) => Promise<IPCResponse<number>>;
}

export interface SalesAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Sale[]>>;
  get: (args: { id: string }) => Promise<IPCResponse<Sale>>;
  getWithItems: (args: { id: string }) => Promise<IPCResponse<SaleWithItems>>;
  create: (data: CreateSaleInput) => Promise<IPCResponse<Sale>>;
  update: (args: { id: string; data: UpdateSaleInput }) => Promise<IPCResponse<Sale>>;
  updateStatus: (args: { id: string; status: 'paid' | 'partial' | 'unpaid' }) => Promise<IPCResponse<Sale>>;
  delete: (args: { id: string }) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<Sale[]>>;
  byCustomer: (args: { customerId: string }, filters?: ListFilters) => Promise<IPCResponse<Sale[]>>;
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) => Promise<IPCResponse<Sale[]>>;
  byPaymentStatus: (status: string, filters?: ListFilters) => Promise<IPCResponse<Sale[]>>;
  summary: (startDate?: string, endDate?: string) => Promise<IPCResponse<SalesSummary>>;
  topSellingItems: (limit?: number, startDate?: string, endDate?: string) => Promise<IPCResponse<ProductWiseReport[]>>;
  dailyReport: (date: string) => Promise<IPCResponse<any>>;
  nextInvoice: () => Promise<IPCResponse<string>>;
  byInvoice: (invoiceNo: string) => Promise<IPCResponse<Sale>>;
}

export interface PurchasesAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Purchase[]>>;
  get: (args: { id: string }) => Promise<IPCResponse<Purchase>>;
  getWithItems: (args: { id: string }) => Promise<IPCResponse<PurchaseWithItems>>;
  create: (data: CreatePurchaseInput) => Promise<IPCResponse<Purchase>>;
  update: (args: { id: string; data: UpdatePurchaseInput }) => Promise<IPCResponse<Purchase>>;
  updateStatus: (args: { id: string; status: 'paid' | 'partial' | 'unpaid' }) => Promise<IPCResponse<Purchase>>;
  delete: (args: { id: string }) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<Purchase[]>>;
  bySupplier: (args: { supplierId: string }, filters?: ListFilters) => Promise<IPCResponse<Purchase[]>>;
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) => Promise<IPCResponse<Purchase[]>>;
  byPaymentStatus: (status: string, filters?: ListFilters) => Promise<IPCResponse<Purchase[]>>;
  summary: (startDate?: string, endDate?: string) => Promise<IPCResponse<PurchasesSummary>>;
  dailyReport: (date: string) => Promise<IPCResponse<any>>;
  nextBill: () => Promise<IPCResponse<string>>;
  byBill: (billNo: string) => Promise<IPCResponse<Purchase>>;
}

export interface PaymentsAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Payment[]>>;
  get: (id: number) => Promise<IPCResponse<Payment>>;
  create: (data: CreatePaymentInput) => Promise<IPCResponse<Payment>>;
  update: (id: number, data: Partial<CreatePaymentInput>) => Promise<IPCResponse<Payment>>;
  delete: (id: number) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<Payment[]>>;
  receipts: (filters?: ListFilters) => Promise<IPCResponse<Payment[]>>;
  supplierPayments: (filters?: ListFilters) => Promise<IPCResponse<Payment[]>>;
  byCustomer: (args: { customerId: string }, filters?: ListFilters) => Promise<IPCResponse<Payment[]>>;
  bySupplier: (args: { supplierId: string }, filters?: ListFilters) => Promise<IPCResponse<Payment[]>>;
  byAccount: (accountId: number, filters?: ListFilters) => Promise<IPCResponse<Payment[]>>;
  bySale: (args: { saleId: string }) => Promise<IPCResponse<Payment[]>>;
  byPurchase: (args: { purchaseId: string }) => Promise<IPCResponse<Payment[]>>;
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) => Promise<IPCResponse<Payment[]>>;
  totalReceipts: (startDate?: string, endDate?: string) => Promise<IPCResponse<number>>;
  totalPayments: (startDate?: string, endDate?: string) => Promise<IPCResponse<number>>;
  summary: (startDate?: string, endDate?: string) => Promise<IPCResponse<PaymentsSummary>>;
}

export interface ExpensesAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Expense[]>>;
  get: (id: string) => Promise<IPCResponse<Expense>>;
  create: (data: CreateExpenseInput) => Promise<IPCResponse<Expense>>;
  update: (id: string, data: UpdateExpenseInput) => Promise<IPCResponse<Expense>>;
  delete: (id: string) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<Expense[]>>;
  byCategory: (category: string, filters?: ListFilters) => Promise<IPCResponse<Expense[]>>;
  byAccount: (accountId: string, filters?: ListFilters) => Promise<IPCResponse<Expense[]>>;
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) => Promise<IPCResponse<Expense[]>>;
  total: (startDate?: string, endDate?: string) => Promise<IPCResponse<number>>;
  categorySummary: (startDate?: string, endDate?: string) => Promise<IPCResponse<ExpensesSummary>>;
  topCategories: (limit?: number, startDate?: string, endDate?: string) => Promise<IPCResponse<{ category: string; total: number }[]>>;
}

export interface ExpenseCategoriesAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<ExpenseCategory[]>>;
  active: () => Promise<IPCResponse<ExpenseCategory[]>>;
  get: (id: string) => Promise<IPCResponse<ExpenseCategory>>;
  create: (data: CreateExpenseCategoryInput) => Promise<IPCResponse<ExpenseCategory>>;
  update: (id: string, data: UpdateExpenseCategoryInput) => Promise<IPCResponse<ExpenseCategory>>;
  delete: (id: string) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<ExpenseCategory[]>>;
}

export interface TransactionsAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Transaction[]>>;
  get: (id: number) => Promise<IPCResponse<Transaction>>;
  create: (data: CreateTransactionInput) => Promise<IPCResponse<Transaction>>;
  update: (id: number, data: Partial<CreateTransactionInput>) => Promise<IPCResponse<Transaction>>;
  delete: (id: number) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<Transaction[]>>;
  byAccount: (accountId: string, filters?: ListFilters) => Promise<IPCResponse<Transaction[]>>;
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) => Promise<IPCResponse<Transaction[]>>;
  accountLedger: (accountId: string, startDate?: string, endDate?: string) => Promise<IPCResponse<any>>;
  inflowOutflowSummary: (startDate?: string, endDate?: string) => Promise<IPCResponse<InflowOutflowSummary>>;
}

export interface SettingsAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Setting[]>>;
  get: (args: { key: string }) => Promise<IPCResponse<Setting>>;
  getValue: (args: { key: string }) => Promise<IPCResponse<string>>;
  set: (args: { key: string; value: string; description?: string }) => Promise<IPCResponse<Setting>>;
  update: (args: { id: number; data: UpdateSettingInput }) => Promise<IPCResponse<Setting>>;
  delete: (args: { id: number }) => Promise<IPCResponse<void>>;
  search: (args: { term: string }) => Promise<IPCResponse<Setting[]>>;
}

export interface RidersAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<Rider[]>>;
  active: () => Promise<IPCResponse<Rider[]>>;
  get: (id: string) => Promise<IPCResponse<Rider>>;
  getWithStats: (id: string) => Promise<IPCResponse<RiderWithStats>>;
  create: (data: CreateRiderInput) => Promise<IPCResponse<Rider>>;
  update: (id: string, data: UpdateRiderInput) => Promise<IPCResponse<Rider>>;
  delete: (id: string) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<Rider[]>>;
  byPhone: (phone: string) => Promise<IPCResponse<Rider>>;
  tasks: (riderId: string, status?: string) => Promise<IPCResponse<GoodsTask[]>>;
}

export interface GoodsTasksAPI {
  list: (filters?: ListFilters) => Promise<IPCResponse<GoodsTask[]>>;
  get: (id: string) => Promise<IPCResponse<GoodsTask>>;
  getWithDetails: (id: string) => Promise<IPCResponse<GoodsTaskWithDetails>>;
  create: (data: CreateGoodsTaskInput) => Promise<IPCResponse<GoodsTask>>;
  update: (id: string, data: UpdateGoodsTaskInput) => Promise<IPCResponse<GoodsTask>>;
  updateStatus: (id: string, status: GoodsTask['status']) => Promise<IPCResponse<GoodsTask>>;
  assign: (id: string, riderId: string) => Promise<IPCResponse<GoodsTask>>;
  delete: (id: string) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<GoodsTask[]>>;
  byRider: (riderId: string, filters?: ListFilters) => Promise<IPCResponse<GoodsTask[]>>;
  byStatus: (status: string, filters?: ListFilters) => Promise<IPCResponse<GoodsTask[]>>;
  bySale: (saleId: string) => Promise<IPCResponse<GoodsTask[]>>;
  pending: () => Promise<IPCResponse<GoodsTask[]>>;
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) => Promise<IPCResponse<GoodsTask[]>>;
}

export interface TaskItemsAPI {
  byTask: (taskId: string) => Promise<IPCResponse<TaskItem[]>>;
  get: (id: string) => Promise<IPCResponse<TaskItem>>;
  create: (data: CreateTaskItemInput) => Promise<IPCResponse<TaskItem>>;
  update: (id: string, data: UpdateTaskItemInput) => Promise<IPCResponse<TaskItem>>;
  toggleDelivery: (id: string) => Promise<IPCResponse<TaskItem>>;
  markDelivered: (id: string) => Promise<IPCResponse<TaskItem>>;
  markNotDelivered: (id: string) => Promise<IPCResponse<TaskItem>>;
  delete: (id: string) => Promise<IPCResponse<void>>;
  stats: (taskId: string) => Promise<IPCResponse<{ total: number; delivered: number; remaining: number }>>;
}

export interface ReportsAPI {
  dashboardSummary: () => Promise<IPCResponse<DashboardSummary>>;
  profitLoss: (params: { startDate?: string; endDate?: string }) => Promise<IPCResponse<ProfitLossReport>>;
  productWise: (params: { startDate?: string; endDate?: string }) => Promise<IPCResponse<ProductWiseReport[]>>;
  customerDues: () => Promise<IPCResponse<Array<{ customer_id: number; customer_name: string; total_due: number }>>>;
  supplierPayables: () => Promise<IPCResponse<Array<{ supplier_id: number; supplier_name: string; total_payable: number }>>>;
  inventoryValuation: () => Promise<IPCResponse<Array<{ item_id: number; item_name: string; stock: number; value: number }>>>;
  dailySales: (date: string) => Promise<IPCResponse<any>>;
  dailyPurchases: (date: string) => Promise<IPCResponse<any>>;
  expensesByCategory: (startDate?: string, endDate?: string) => Promise<IPCResponse<ExpensesSummary>>;
  accountLedger: (accountId: number, startDate?: string, endDate?: string) => Promise<IPCResponse<any>>;
  topCustomers: (limit?: number) => Promise<IPCResponse<Customer[]>>;
  topSuppliers: (limit?: number) => Promise<IPCResponse<Supplier[]>>;
  cashFlow: (startDate: string, endDate: string) => Promise<IPCResponse<CashFlowReport>>;
  salesComparison: (period1Start: string, period1End: string, period2Start: string, period2End: string) => Promise<IPCResponse<any>>;
}

export interface DatabaseAPI {
  query: <T = any>(sql: string, params?: any[]) => Promise<IPCResponse<T[]>>;
  queryOne: <T = any>(sql: string, params?: any[]) => Promise<IPCResponse<T>>;
  execute: (sql: string, params?: any[]) => Promise<IPCResponse<{ changes: number; lastInsertRowid: number }>>;
  transaction: (operations: Array<{ sql: string; params?: any[] }>) => Promise<IPCResponse<Array<{ changes: number; lastInsertRowid: number }>>>;
  getVersion: () => Promise<IPCResponse<number>>;
  getMetadata: () => Promise<IPCResponse<{ version: number; createdAt: string; updatedAt: string }>>;
  getPath: () => Promise<IPCResponse<string>>;
  backup: (suffix?: string) => Promise<IPCResponse<string>>;
  isReady: () => Promise<IPCResponse<boolean>>;
}

export interface ExportAPI {
  customers: (options: ExportOptions) => Promise<IPCResponse<{ filePath: string }>>;
  suppliers: (options: ExportOptions) => Promise<IPCResponse<{ filePath: string }>>;
  items: (options: ExportOptions) => Promise<IPCResponse<{ filePath: string }>>;
  sales: (options: ExportOptions) => Promise<IPCResponse<{ filePath: string }>>;
  purchases: (options: ExportOptions) => Promise<IPCResponse<{ filePath: string }>>;
  ledger: (options: ExportOptions) => Promise<IPCResponse<{ filePath: string }>>;
}

export interface AuthAPI {
  restoreSession: () => Promise<IPCResponse<{ sessionToken: string; user: { id: number; name: string; email: string; role: 'super_admin' | 'admin' | 'staff' } }>>;
  login: (email: string, password: string) => Promise<IPCResponse<{ sessionToken: string; user: { id: number; name: string; email: string; role: 'super_admin' | 'admin' | 'staff' } }>>;
  verifySession: (sessionToken: string) => Promise<IPCResponse<{ user: { id: number; name: string; email: string; role: 'super_admin' | 'admin' | 'staff' } }>>;
  logout: (sessionToken: string) => Promise<IPCResponse<{ success: boolean }>>;
  createUser: (data: { name: string; email: string; password: string; role?: 'super_admin' | 'admin' | 'staff' }) => Promise<IPCResponse<{ user: { id: number; name: string; email: string; role: 'super_admin' | 'admin' | 'staff' } }>>;
  updateUser: (id: number, data: any) => Promise<IPCResponse<{ user: { id: number; name: string; email: string; role: 'super_admin' | 'admin' | 'staff' } }>>;
  deleteUser: (id: number) => Promise<IPCResponse<{ success: boolean }>>;
  getUsers: () => Promise<IPCResponse<{ users: Array<{ id: number; name: string; email: string; role: 'super_admin' | 'admin' | 'staff'; active: boolean }> }>>;
  getUser: (id: number) => Promise<IPCResponse<{ user: { id: number; name: string; email: string; role: 'super_admin' | 'admin' | 'staff'; active: boolean } }>>;
}

// ==================== Invoice Format API ====================

export interface InvoiceFormatAPI {
  get: (type: 'sale' | 'purchase') => Promise<IPCResponse<{ format: any; preview: string }>>;
  update: (type: 'sale' | 'purchase', data: { prefix?: string; date_format?: string; digits?: number; reset_type?: string }) => Promise<IPCResponse<{ format: any; preview: string }>>;
  preview: (type: 'sale' | 'purchase') => Promise<IPCResponse<string>>;
  checkUnique: (type: 'sale' | 'purchase', number: string) => Promise<IPCResponse<{ unique: boolean }>>;
}

// ==================== Window API ====================

export interface WindowAPI {
  accounts: AccountsAPI;
  customers: CustomersAPI;
  suppliers: SuppliersAPI;
  items: ItemsAPI;
  units: UnitsAPI;
  sales: SalesAPI;
  purchases: PurchasesAPI;
  payments: PaymentsAPI;
  expenses: ExpensesAPI;
  expenseCategories: ExpenseCategoriesAPI;
  transactions: TransactionsAPI;
  settings: SettingsAPI;
  riders: RidersAPI;
  goodsTasks: GoodsTasksAPI;
  taskItems: TaskItemsAPI;
  reports: ReportsAPI;
  export: ExportAPI;
  auth: AuthAPI;
  db: DatabaseAPI;
  invoiceFormat: InvoiceFormatAPI;
}

// ==================== Global Type Augmentation ====================

declare global {
  interface Window {
    api: WindowAPI;
  }
}
