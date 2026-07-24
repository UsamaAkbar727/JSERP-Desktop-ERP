/**
 * Web Mock API for Vercel / Web Browser Demo
 * Provides a robust mock implementation of window.api and window.electron when running outside Electron.
 */

const mockUser = {
  id: 1,
  name: 'Super Admin (Demo)',
  email: 'admin@erp-pro.com',
  role: 'super_admin' as const,
};

const mockItems = [
  { id: '1', name: 'Sample Item A', name_urdu: 'آئٹم A', sku: 'ITEM-001', category: 'General', price: 150, selling_price: 150, cost_price: 100, unit_cost: 100, quantity: 50, stock_quantity: 50, min_stock_alert: 5, unit: 'pcs', created_at: new Date().toISOString() },
  { id: '2', name: 'Sample Item B', name_urdu: 'آئٹم B', sku: 'ITEM-002', category: 'Electronics', price: 1200, selling_price: 1200, cost_price: 900, unit_cost: 900, quantity: 20, stock_quantity: 20, min_stock_alert: 2, unit: 'pcs', created_at: new Date().toISOString() },
  { id: '3', name: 'Sample Item C', name_urdu: 'آئٹم C', sku: 'ITEM-003', category: 'Hardware', price: 450, selling_price: 450, cost_price: 300, unit_cost: 300, quantity: 100, stock_quantity: 100, min_stock_alert: 10, unit: 'box', created_at: new Date().toISOString() },
];

const mockCustomers = [
  { id: '1', name: 'Ali Khan', name_urdu: 'علی خان', phone: '03001234567', email: 'ali@example.com', current_balance: 5000, opening_balance: 0, status: 'active', created_at: new Date().toISOString() },
  { id: '2', name: 'Usman Trader', name_urdu: 'عثمان ٹریڈر', phone: '03217654321', email: 'usman@example.com', current_balance: 0, opening_balance: 0, status: 'active', created_at: new Date().toISOString() },
];

const mockSuppliers = [
  { id: '1', name: 'ABC Distributors', name_urdu: 'اے بی سی ڈسٹری بیوٹرز', phone: '03339998877', current_balance: 12000, opening_balance: 0, status: 'active', created_at: new Date().toISOString() },
];

const mockSales = [
  { id: '1', invoice_number: 'INV-1001', customer_id: '1', customer_name: 'Ali Khan', total_amount: 1500, paid_amount: 1500, due_amount: 0, payment_status: 'paid', sale_date: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: '2', invoice_number: 'INV-1002', customer_id: '2', customer_name: 'Usman Trader', total_amount: 3200, paid_amount: 2000, due_amount: 1200, payment_status: 'partial', sale_date: new Date().toISOString(), created_at: new Date().toISOString() },
];

const mockPurchases = [
  { id: '1', bill_number: 'BILL-5001', supplier_id: '1', supplier_name: 'ABC Distributors', total_amount: 10000, paid_amount: 10000, due_amount: 0, payment_status: 'paid', purchase_date: new Date().toISOString(), created_at: new Date().toISOString() }
];

const mockAccounts = [
  { id: '1', account_name: 'Cash in Hand', account_type: 'cash', current_balance: 45000, opening_balance: 10000, status: 'active' },
  { id: '2', account_name: 'Meezan Bank', account_type: 'bank', account_number: '123456789', bank_name: 'Meezan Bank', current_balance: 125000, opening_balance: 50000, status: 'active' }
];

const mockDashboardSummary = {
  sales: { today: 15000, week: 95000, month: 350000, year: 4200000 },
  purchases: { today: 8000, week: 45000, month: 180000, year: 2100000 },
  expenses: { today: 1200, week: 8500, month: 32000, year: 380000 },
  receivables: 25000,
  payables: 18000,
  cash_in_hand: 45000,
  bank_balance: 125000,
  inventory_value: 580000,
  low_stock_items: 3,
};

export function initWebMockApi(): void {
  if (typeof window === 'undefined') return;

  // Initialize window.electron if missing
  if (!window.electron) {
    (window as any).electron = {
      licenseCheck: async () => ({ success: true, data: { isActivated: true, isValid: true, isVerified: true } }),
      licenseActivate: async () => ({ success: true }),
      licenseDeactivate: async () => ({ success: true }),
      licenseVerifyOnline: async () => ({ success: true }),
      licenseGetHardwareId: async () => ({ success: true, data: { machineId: 'DEMO-MACHINE-ID' } }),
      licenseHasFeature: async () => ({ success: true, data: true }),
      licenseGetFeatures: async () => ({ success: true, data: {} }),
      licenseIsExpiring: async () => ({ success: true, data: { isExpiring: false, daysRemaining: 365 } }),
    };
  }

  // Initialize window.api if missing (Web Mode / Vercel)
  if (!window.api) {
    console.log('🌐 [Web Mode] Initializing Mock API for Vercel Web Demo');

    (window as any).api = new Proxy({} as any, {
      get: (_target, category: string) => {
        if (category === 'auth') {
          return {
            login: async (email: string) => {
              const session = { sessionToken: 'demo-token-123', user: { ...mockUser, email: email || mockUser.email } };
              localStorage.setItem('jserp_demo_session', JSON.stringify(session));
              return { success: true, data: session };
            },
            logout: async () => {
              localStorage.removeItem('jserp_demo_session');
              return { success: true };
            },
            restoreSession: async () => {
              const saved = localStorage.getItem('jserp_demo_session');
              if (saved) {
                try {
                  return { success: true, data: JSON.parse(saved) };
                } catch (e) {}
              }
              const defaultSession = { sessionToken: 'demo-token-123', user: mockUser };
              localStorage.setItem('jserp_demo_session', JSON.stringify(defaultSession));
              return { success: true, data: defaultSession };
            },
            verifySession: async () => ({ success: true }),
          };
        }

        if (category === 'reports') {
          return {
            dashboardSummary: async () => ({ success: true, data: mockDashboardSummary }),
            profitLoss: async () => ({ success: true, data: { revenue: 350000, cost_of_goods: 210000, gross_profit: 140000, expenses: 32000, net_profit: 108000 } }),
            expensesByCategory: async () => ({ success: true, data: [{ category: 'Rent', total: 15000, count: 1 }, { category: 'Utilities', total: 5000, count: 2 }] }),
            customerDues: async () => ({ success: true, data: mockCustomers }),
            supplierPayables: async () => ({ success: true, data: mockSuppliers }),
            topCustomers: async () => ({ success: true, data: mockCustomers }),
            topSuppliers: async () => ({ success: true, data: mockSuppliers }),
            inventoryValuation: async () => ({ success: true, data: { total_items: 3, total_quantity: 170, total_value: 580000 } }),
          };
        }

        // Proxy for all database entity categories (items, sales, customers, suppliers, accounts, etc.)
        return new Proxy({}, {
          get: (_methodTarget, methodName: string) => {
            return async (..._args: any[]) => {
              if (category === 'items') {
                if (methodName === 'list' || methodName === 'active' || methodName === 'search') return { success: true, data: mockItems };
                if (methodName === 'get') return { success: true, data: mockItems[0] };
              }
              if (category === 'customers') {
                if (methodName === 'list' || methodName === 'active' || methodName === 'search' || methodName === 'withDues') return { success: true, data: mockCustomers };
                if (methodName === 'get') return { success: true, data: mockCustomers[0] };
              }
              if (category === 'suppliers') {
                if (methodName === 'list' || methodName === 'active' || methodName === 'search' || methodName === 'withPayables') return { success: true, data: mockSuppliers };
                if (methodName === 'get') return { success: true, data: mockSuppliers[0] };
              }
              if (category === 'sales') {
                if (methodName === 'list' || methodName === 'search') return { success: true, data: mockSales };
                if (methodName === 'get') return { success: true, data: mockSales[0] };
              }
              if (category === 'purchases') {
                if (methodName === 'list' || methodName === 'search') return { success: true, data: mockPurchases };
                if (methodName === 'get') return { success: true, data: mockPurchases[0] };
              }
              if (category === 'accounts') {
                if (methodName === 'list' || methodName === 'active' || methodName === 'search') return { success: true, data: mockAccounts };
                if (methodName === 'get') return { success: true, data: mockAccounts[0] };
              }
              if (category === 'settings') {
                return { success: true, data: { company_name: 'JuttSoft ERP', company_name_urdu: 'جٹ سافٹ ای آر پی' } };
              }

              // Default array response for other list calls
              return { success: true, data: [] };
            };
          }
        });
      }
    });
  }
}
