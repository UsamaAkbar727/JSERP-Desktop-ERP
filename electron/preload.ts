import { contextBridge, ipcRenderer } from 'electron';

// Helper to create IPC invoke wrapper
const createInvoker = (channel: string) => (...args: any[]) => ipcRenderer.invoke(channel, ...args);

// Define the API that will be exposed to the renderer process
const api = {
  // Accounts API
  accounts: {
    list: createInvoker('accounts:list'),
    active: createInvoker('accounts:active'),
    get: createInvoker('accounts:get'),
    create: createInvoker('accounts:create'),
    update: createInvoker('accounts:update'),
    updateBalance: createInvoker('accounts:update-balance'),
    delete: createInvoker('accounts:delete'),
    byType: createInvoker('accounts:by-type'),
    balanceSummary: createInvoker('accounts:balance-summary'),
    totalBalance: createInvoker('accounts:total-balance'),
    search: createInvoker('accounts:search'),
  },

  // Customers API
  customers: {
    list: createInvoker('customers:list'),
    active: createInvoker('customers:active'),
    get: createInvoker('customers:get'),
    getWithSummary: createInvoker('customers:get-with-summary'),
    create: createInvoker('customers:create'),
    update: createInvoker('customers:update'),
    updateBalance: createInvoker('customers:update-balance'),
    delete: createInvoker('customers:delete'),
    search: createInvoker('customers:search'),
    withDues: createInvoker('customers:with-dues'),
    totalReceivables: createInvoker('customers:total-receivables'),
    statistics: createInvoker('customers:statistics'),
    top: createInvoker('customers:top'),
    byPhone: createInvoker('customers:by-phone'),
    byEmail: createInvoker('customers:by-email'),
  },

  // Suppliers API
  suppliers: {
    list: createInvoker('suppliers:list'),
    active: createInvoker('suppliers:active'),
    get: createInvoker('suppliers:get'),
    getWithSummary: createInvoker('suppliers:get-with-summary'),
    create: createInvoker('suppliers:create'),
    update: createInvoker('suppliers:update'),
    updateBalance: createInvoker('suppliers:update-balance'),
    delete: createInvoker('suppliers:delete'),
    search: createInvoker('suppliers:search'),
    withPayables: createInvoker('suppliers:with-payables'),
    totalPayables: createInvoker('suppliers:total-payables'),
    statistics: createInvoker('suppliers:statistics'),
    top: createInvoker('suppliers:top'),
    byPhone: createInvoker('suppliers:by-phone'),
    byEmail: createInvoker('suppliers:by-email'),
  },

  // Items API
  items: {
    list: createInvoker('items:list'),
    active: createInvoker('items:active'),
    get: createInvoker('items:get'),
    create: createInvoker('items:create'),
    update: createInvoker('items:update'),
    updateStock: createInvoker('items:update-stock'),
    delete: createInvoker('items:delete'),
    search: createInvoker('items:search'),
    lowStock: createInvoker('items:low-stock'),
    outOfStock: createInvoker('items:out-of-stock'),
    bySku: createInvoker('items:by-sku'),
    byUnit: createInvoker('items:by-unit'),
    inventoryValue: createInvoker('items:inventory-value'),
    statistics: createInvoker('items:statistics'),
    topSelling: createInvoker('items:top-selling'),
    profitMargins: createInvoker('items:profit-margins'),
    bulkUpdatePrices: createInvoker('items:bulk-update-prices'),
  },

  // Units API
  units: {
    list: () => ipcRenderer.invoke('units:list'),
    get: (id: string) => ipcRenderer.invoke('units:get', { id }),
    create: (data: any) => ipcRenderer.invoke('units:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('units:update', { id, data }),
    delete: (id: string) => ipcRenderer.invoke('units:delete', { id }),
    search: (query: string) => ipcRenderer.invoke('units:search', { term: query }),
    usageCount: (id: string) => ipcRenderer.invoke('units:usage-count', { unitId: id }),
  },

  // Sales API
  sales: {
    list: createInvoker('sales:list'),
    get: createInvoker('sales:get'),
    getWithItems: createInvoker('sales:get-with-items'),
    create: createInvoker('sales:create'),
    update: createInvoker('sales:update'),
    updateStatus: createInvoker('sales:update-status'),
    delete: createInvoker('sales:delete'),
    search: createInvoker('sales:search'),
    byCustomer: createInvoker('sales:by-customer'),
    byDateRange: createInvoker('sales:by-date-range'),
    byPaymentStatus: createInvoker('sales:by-payment-status'),
    summary: createInvoker('sales:summary'),
    topSellingItems: createInvoker('sales:top-selling-items'),
    dailyReport: createInvoker('sales:daily-report'),
    nextInvoice: createInvoker('sales:next-invoice'),
    byInvoice: createInvoker('sales:by-invoice'),
  },

  // Purchases API
  purchases: {
    list: createInvoker('purchases:list'),
    get: createInvoker('purchases:get'),
    getWithItems: createInvoker('purchases:get-with-items'),
    create: createInvoker('purchases:create'),
    update: createInvoker('purchases:update'),
    updateStatus: createInvoker('purchases:update-status'),
    delete: createInvoker('purchases:delete'),
    search: createInvoker('purchases:search'),
    bySupplier: createInvoker('purchases:by-supplier'),
    byDateRange: createInvoker('purchases:by-date-range'),
    byPaymentStatus: createInvoker('purchases:by-payment-status'),
    summary: createInvoker('purchases:summary'),
    dailyReport: createInvoker('purchases:daily-report'),
    nextBill: createInvoker('purchases:next-bill'),
    byBill: createInvoker('purchases:by-bill'),
  },

  // Payments API
  payments: {
    list: createInvoker('payments:list'),
    get: createInvoker('payments:get'),
    create: createInvoker('payments:create'),
    update: createInvoker('payments:update'),
    delete: createInvoker('payments:delete'),
    search: createInvoker('payments:search'),
    receipts: createInvoker('payments:receipts'),
    supplierPayments: createInvoker('payments:supplier-payments'),
    byCustomer: createInvoker('payments:by-customer'),
    bySupplier: createInvoker('payments:by-supplier'),
    byAccount: (accountId: number, filters?: any) => 
      ipcRenderer.invoke('payments:by-account', { accountId, filters }),
    bySale: createInvoker('payments:by-sale'),
    byPurchase: createInvoker('payments:by-purchase'),
    byDateRange: (startDate: string, endDate: string, filters?: any) => 
      ipcRenderer.invoke('payments:by-date-range', { startDate, endDate, filters }),
    totalReceipts: (startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('payments:total-receipts', { startDate, endDate }),
    totalPayments: (startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('payments:total-payments', { startDate, endDate }),
    summary: (startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('payments:summary', { startDate, endDate }),
  },

  // Expenses API
  expenses: {
    list: createInvoker('expenses:list'),
    get: createInvoker('expenses:get'),
    create: createInvoker('expenses:create'),
    update: (id: string, data: any) => ipcRenderer.invoke('expenses:update', { id, data }),
    delete: (id: string) => ipcRenderer.invoke('expenses:delete', { id }),
    search: createInvoker('expenses:search'),
    byCategory: (category: string, filters?: any) => 
      ipcRenderer.invoke('expenses:by-category', { category, filters }),
    byAccount: (accountId: string, filters?: any) => 
      ipcRenderer.invoke('expenses:by-account', { accountId, filters }),
    byDateRange: (startDate: string, endDate: string, filters?: any) => 
      ipcRenderer.invoke('expenses:by-date-range', { startDate, endDate, filters }),
    total: (startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('expenses:total', { startDate, endDate }),
    categorySummary: (startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('expenses:category-summary', { startDate, endDate }),
    topCategories: (limit?: number, startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('expenses:top-categories', { limit, startDate, endDate }),
  },

  // Expense Categories API
  expenseCategories: {
    list: createInvoker('expense-categories:list'),
    active: createInvoker('expense-categories:active'),
    get: createInvoker('expense-categories:get'),
    create: createInvoker('expense-categories:create'),
    update: (id: string, data: any) => ipcRenderer.invoke('expense-categories:update', { id, data }),
    delete: (id: string) => ipcRenderer.invoke('expense-categories:delete', { id }),
    search: createInvoker('expense-categories:search'),
  },

  // Transactions API
  transactions: {
    list: createInvoker('transactions:list'),
    get: createInvoker('transactions:get'),
    create: createInvoker('transactions:create'),
    update: createInvoker('transactions:update'),
    delete: createInvoker('transactions:delete'),
    search: createInvoker('transactions:search'),
    byAccount: (accountId: string, filters?: any) => 
      ipcRenderer.invoke('transactions:by-account', { accountId, filters }),
    byDateRange: (startDate: string, endDate: string, filters?: any) => 
      ipcRenderer.invoke('transactions:by-date-range', { startDate, endDate, filters }),
    accountLedger: (accountId: string, startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('transactions:account-ledger', { accountId, startDate, endDate }),
    inflowOutflowSummary: (startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('transactions:inflow-outflow-summary', { startDate, endDate }),
  },

  // Settings API
  settings: {
    list: createInvoker('settings:list'),
    get: createInvoker('settings:get'),
    getValue: createInvoker('settings:get-value'),
    set: createInvoker('settings:set'),
    update: createInvoker('settings:update'),
    delete: createInvoker('settings:delete'),
    search: createInvoker('settings:search'),
  },

  // Invoice Format API
  invoiceFormat: {
    get: (type: 'sale' | 'purchase') => ipcRenderer.invoke('invoice-format:get', { type }),
    update: (type: 'sale' | 'purchase', data: any) => ipcRenderer.invoke('invoice-format:update', { type, data }),
    preview: (type: 'sale' | 'purchase') => ipcRenderer.invoke('invoice-format:preview', { type }),
    checkUnique: (type: 'sale' | 'purchase', number: string) => ipcRenderer.invoke('invoice-format:check-unique', { type, number }),
  },

  // Riders API
  riders: {
    list: createInvoker('riders:list'),
    active: createInvoker('riders:active'),
    get: createInvoker('riders:get'),
    getWithStats: createInvoker('riders:get-with-stats'),
    create: createInvoker('riders:create'),
    update: (id: string, data: any) => ipcRenderer.invoke('riders:update', { id, data }),
    delete: (id: string) => ipcRenderer.invoke('riders:delete', { id }),
    search: createInvoker('riders:search'),
    byPhone: createInvoker('riders:by-phone'),
    tasks: createInvoker('riders:tasks'),
  },

  // Goods Tasks API
  goodsTasks: {
    list: createInvoker('goods-tasks:list'),
    get: createInvoker('goods-tasks:get'),
    getWithDetails: createInvoker('goods-tasks:get-with-details'),
    create: createInvoker('goods-tasks:create'),
    update: (id: string, data: any) => ipcRenderer.invoke('goods-tasks:update', { id, data }),
    updateStatus: (id: string, status: string) => ipcRenderer.invoke('goods-tasks:update-status', { id, status }),
    assign: (id: string, riderId: string) => ipcRenderer.invoke('goods-tasks:assign', { id, riderId }),
    delete: (id: string) => ipcRenderer.invoke('goods-tasks:delete', { id }),
    search: createInvoker('goods-tasks:search'),
    byRider: createInvoker('goods-tasks:by-rider'),
    byStatus: createInvoker('goods-tasks:by-status'),
    bySale: createInvoker('goods-tasks:by-sale'),
    pending: createInvoker('goods-tasks:pending'),
    byDateRange: createInvoker('goods-tasks:by-date-range'),
  },

  // Task Items API
  taskItems: {
    byTask: (taskId: string) => ipcRenderer.invoke('task-items:by-task', { taskId }),
    get: (id: string) => ipcRenderer.invoke('task-items:get', { id }),
    create: createInvoker('task-items:create'),
    update: (id: string, data: any) => ipcRenderer.invoke('task-items:update', { id, data }),
    toggleDelivery: (id: string) => ipcRenderer.invoke('task-items:toggle-delivery', { id }),
    markDelivered: (id: string) => ipcRenderer.invoke('task-items:mark-delivered', { id }),
    markNotDelivered: (id: string) => ipcRenderer.invoke('task-items:mark-not-delivered', { id }),
    delete: (id: string) => ipcRenderer.invoke('task-items:delete', { id }),
    stats: (taskId: string) => ipcRenderer.invoke('task-items:stats', { taskId }),
  },

  // Reports API
  reports: {
    dashboardSummary: createInvoker('reports:dashboard-summary'),
    profitLoss: createInvoker('reports:profit-loss'),
    productWise: createInvoker('reports:product-wise'),
    customerDues: createInvoker('reports:customer-dues'),
    supplierPayables: createInvoker('reports:supplier-payables'),
    inventoryValuation: createInvoker('reports:inventory-valuation'),
    dailySales: createInvoker('reports:daily-sales'),
    dailyPurchases: createInvoker('reports:daily-purchases'),
    expensesByCategory: createInvoker('reports:expenses-by-category'),
    accountLedger: createInvoker('reports:account-ledger'),
    topCustomers: createInvoker('reports:top-customers'),
    topSuppliers: createInvoker('reports:top-suppliers'),
    cashFlow: createInvoker('reports:cash-flow'),
    salesComparison: createInvoker('reports:sales-comparison'),
  },

  // License Management API
  licenseCheck: () => ipcRenderer.invoke('license:check'),
  licenseActivate: (licenseKey: string, customerEmail?: string) =>
    ipcRenderer.invoke('license:activate', licenseKey, customerEmail),
  licenseInfo: () => ipcRenderer.invoke('license:info'),
  licenseVerifyOnline: () => ipcRenderer.invoke('license:verify-online'),
  licenseDeactivate: () => ipcRenderer.invoke('license:deactivate'),
  licenseGetHardwareId: () => ipcRenderer.invoke('license:hardware-id'),
  licenseHasFeature: (featureName: string) => ipcRenderer.invoke('license:has-feature', featureName),
  licenseGetFeatures: () => ipcRenderer.invoke('license:get-features'),
  licenseIsExpiring: (days?: number) => ipcRenderer.invoke('license:is-expiring', days),

  // Export API
  export: {
    customers: (options: any) => ipcRenderer.invoke('export:customers', options),
    suppliers: (options: any) => ipcRenderer.invoke('export:suppliers', options),
    items: (options: any) => ipcRenderer.invoke('export:items', options),
    sales: (options: any) => ipcRenderer.invoke('export:sales', options),
    purchases: (options: any) => ipcRenderer.invoke('export:purchases', options),
    ledger: (options: any) => ipcRenderer.invoke('export:ledger', options),
  },

  // Authentication API
  auth: {
    restoreSession: () => ipcRenderer.invoke('auth:restore-session'),
    login: (email: string, password: string) => ipcRenderer.invoke('auth:login', { email, password }),
    verifySession: (sessionToken: string) => ipcRenderer.invoke('auth:verify-session', { sessionToken }),
    logout: (sessionToken: string) => ipcRenderer.invoke('auth:logout', { sessionToken }),
    createUser: (data: any) => ipcRenderer.invoke('auth:create-user', data),
    updateUser: (id: number, data: any) => ipcRenderer.invoke('auth:update-user', { id, ...data }),
    deleteUser: (id: number) => ipcRenderer.invoke('auth:delete-user', { id }),
    getUsers: () => ipcRenderer.invoke('auth:get-users'),
    getUser: (id: number) => ipcRenderer.invoke('auth:get-user', { id }),
    resetDatabase: () => ipcRenderer.invoke('auth:reset-database'),
  },

  // Backup Management API
  backupCreate: (description?: string) => ipcRenderer.invoke('backup:create', { description }),
  backupCreateWithDialog: (description?: string) => ipcRenderer.invoke('backup:create-with-dialog', { description }),
  backupList: () => ipcRenderer.invoke('backup:list'),
  backupStats: () => ipcRenderer.invoke('backup:stats'),
  backupDelete: (backupId: string) => ipcRenderer.invoke('backup:delete', { backupId }),
  backupRestore: (backupId: string) => ipcRenderer.invoke('backup:restore', { backupId }),
  backupRestoreFromFile: () => ipcRenderer.invoke('backup:restore-from-file'),
  backupCleanup: (maxBackups?: number) => ipcRenderer.invoke('backup:cleanup', { maxBackups }),
  backupSchedulerStatus: () => ipcRenderer.invoke('backup:scheduler-status'),
  backupSchedulerUpdate: (settings: any) => ipcRenderer.invoke('backup:scheduler-update', settings),
  backupSchedulerTest: () => ipcRenderer.invoke('backup:scheduler-test'),
  
  // App Management API
  appRestart: () => ipcRenderer.invoke('app:restart'),

  // Legacy Database API (kept for backward compatibility)
  db: {
    query: createInvoker('db:query'),
    queryOne: createInvoker('db:queryOne'),
    execute: createInvoker('db:execute'),
    transaction: createInvoker('db:transaction'),
    getVersion: createInvoker('db:getVersion'),
    getMetadata: createInvoker('db:getMetadata'),
    getPath: createInvoker('db:getPath'),
    backup: createInvoker('db:backup'),
    isReady: createInvoker('db:isReady'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('electron', {
  // License API exposed separately for type-safe access
  licenseCheck: api.licenseCheck,
  licenseActivate: api.licenseActivate,
  licenseInfo: api.licenseInfo,
  licenseVerifyOnline: api.licenseVerifyOnline,
  licenseDeactivate: api.licenseDeactivate,
  licenseGetHardwareId: api.licenseGetHardwareId,
  licenseHasFeature: api.licenseHasFeature,
  licenseGetFeatures: api.licenseGetFeatures,
  licenseIsExpiring: api.licenseIsExpiring,

  // Backup API exposed separately for type-safe access
  backupCreate: api.backupCreate,
  backupList: api.backupList,
  backupStats: api.backupStats,
  backupDelete: api.backupDelete,
  backupRestore: api.backupRestore,
  backupCleanup: api.backupCleanup,
  backupSchedulerStatus: api.backupSchedulerStatus,
  backupSchedulerUpdate: api.backupSchedulerUpdate,
  backupSchedulerTest: api.backupSchedulerTest,
  
  // App API exposed separately for type-safe access
  appRestart: api.appRestart,

  // Direct ipcRenderer access for raw IPC calls
  ipcRenderer: {
    invoke: ipcRenderer.invoke,
  },
});

export { };