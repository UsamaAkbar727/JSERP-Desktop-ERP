/**
 * Web Mock API for Vercel / Web Browser Demo
 * Provides a mock implementation of window.api and window.electron when running outside Electron.
 */

const mockUser = {
  id: 1,
  name: 'Super Admin (Demo)',
  email: 'admin@erp-pro.com',
  role: 'super_admin' as const,
};

const mockItems = [
  { id: 1, name: 'Sample Item A', sku: 'ITEM-001', category: 'General', price: 150, cost_price: 100, quantity: 50, unit: 'pcs' },
  { id: 2, name: 'Sample Item B', sku: 'ITEM-002', category: 'Electronics', price: 1200, cost_price: 900, quantity: 20, unit: 'pcs' },
  { id: 3, name: 'Sample Item C', sku: 'ITEM-003', category: 'Hardware', price: 450, cost_price: 300, quantity: 100, unit: 'box' },
];

const mockCustomers = [
  { id: 1, name: 'Ali Khan', phone: '03001234567', email: 'ali@example.com', balance: 5000 },
  { id: 2, name: 'Usman Trader', phone: '03217654321', email: 'usman@example.com', balance: 0 },
];

const mockSuppliers = [
  { id: 1, name: 'ABC Distributors', phone: '03339998877', balance: 12000 },
];

const mockSales = [
  { id: 1, invoice_no: 'INV-1001', customer_name: 'Ali Khan', total_amount: 1500, paid_amount: 1500, status: 'completed', created_at: new Date().toISOString() },
  { id: 2, invoice_no: 'INV-1002', customer_name: 'Usman Trader', total_amount: 3200, paid_amount: 2000, status: 'partial', created_at: new Date().toISOString() },
];

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

        // Proxy for all database entity categories (items, sales, customers, suppliers, etc.)
        return new Proxy({}, {
          get: (_methodTarget, methodName: string) => {
            return async (..._args: any[]) => {
              if (category === 'items') {
                if (methodName === 'list' || methodName === 'active' || methodName === 'search') return { success: true, data: mockItems };
                if (methodName === 'get') return { success: true, data: mockItems[0] };
              }
              if (category === 'customers') {
                if (methodName === 'list' || methodName === 'active' || methodName === 'search') return { success: true, data: mockCustomers };
                if (methodName === 'get') return { success: true, data: mockCustomers[0] };
              }
              if (category === 'suppliers') {
                if (methodName === 'list' || methodName === 'active' || methodName === 'search') return { success: true, data: mockSuppliers };
                if (methodName === 'get') return { success: true, data: mockSuppliers[0] };
              }
              if (category === 'sales') {
                if (methodName === 'list' || methodName === 'search') return { success: true, data: mockSales };
                if (methodName === 'get') return { success: true, data: mockSales[0] };
              }

              // Fallback for any other API calls
              return { success: true, data: [] };
            };
          }
        });
      }
    });
  }
}
