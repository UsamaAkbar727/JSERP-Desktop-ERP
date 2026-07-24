/**
 * Database Usage Examples
 * Copy these examples to quickly get started with database operations
 * 
 * NOTE: This file uses an older database API pattern for reference.
 * Current application uses typed APIs (window.api.customers, window.api.expenses, etc.)
 */

import { useDatabaseQuery, useDatabaseMutation, useSettings, useDatabase } from '@/hooks/useDatabase';

// Extend Window interface for legacy examples
declare global {
  interface Window {
    electronAPI: {
      db: {
        query: (sql: string, params?: any[]) => Promise<any>;
        queryOne: (sql: string, params?: any[]) => Promise<any>;
        execute: (sql: string, params?: any[]) => Promise<any>;
        transaction: (operations: any[]) => Promise<any>;
        backup: (type: string) => Promise<any>;
        isReady: () => Promise<any>;
        getVersion: () => Promise<any>;
      };
    };
  }
}

// ============================================================================
// Example 1: Query with Loading State
// ============================================================================
export function CustomersListExample() {
  const { data: customers, isLoading, error, refetch } = useDatabaseQuery<any[]>(
    () => window.electronAPI.db.query('SELECT * FROM customers WHERE status = ?', ['active']),
    [], // dependencies
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      onSuccess: (data: any) => console.log('Customers loaded:', data?.length || 0),
    }
  );
  
  if (isLoading) return <div>Loading customers...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {customers?.map((customer) => (
          <li key={customer.id}>
            {customer.name} - Balance: {customer.current_balance}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Example 2: Create with Mutation
// ============================================================================
export function CreateCustomerExample() {
  const { data: customers, refetch } = useDatabaseQuery<any[]>(
    () => window.electronAPI.db.query('SELECT * FROM customers'),
    []
  );

  const { mutate: createCustomer, isLoading, error } = useDatabaseMutation(
    (input: { id: string; name: string; email?: string }) =>
      window.electronAPI.db.execute(
        'INSERT INTO customers (id, name, email, current_balance, status) VALUES (?, ?, ?, 0, "active")',
        [input.id, input.name, input.email || '']
      ),
    {
      onSuccess: () => {
                refetch(); // Refresh customer list
      },
      onError: (error) => console.error('Failed to create customer:', error),
    }
  );

  const handleCreate = () => {
    createCustomer({
      id: `customer-${Date.now()}`,
      name: 'John Doe',
      email: 'john@example.com',
    });
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Customer'}
      </button>
      {error && <div className="error">{error}</div>}
      <div>Total Customers: {customers?.length || 0}</div>
    </div>
  );
}

// ============================================================================
// Example 3: Update and Delete
// ============================================================================
export function CustomerActionsExample({ customerId }: { customerId: string }) {
  const { mutate: updateCustomer } = useDatabaseMutation(
    (updates: { name?: string; email?: string; status?: string }) =>
      window.electronAPI.db.execute(
        'UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), status = COALESCE(?, status) WHERE id = ?',
        [updates.name, updates.email, updates.status, customerId]
      ),
    {
      onSuccess: () => console.log('Customer updated successfully'),
    }
  );
  
  const { mutate: deleteCustomer } = useDatabaseMutation(
    () => window.electronAPI.db.execute('UPDATE customers SET status = ? WHERE id = ?', ['inactive', customerId]),
    {
      onSuccess: () => console.log('Customer deleted successfully'),
    }
  );
  
  return (
    <div>
      <button onClick={() => updateCustomer({ name: 'New Name' })}>Update Name</button>
      <button onClick={() => deleteCustomer(null)}>Delete</button>
    </div>
  );
}

// ============================================================================
// Example 4: Transaction (Multiple Operations)
// ============================================================================
export async function createSaleTransaction(sale: {
  id: string;
  customerId: string;
  items: Array<{ itemId: string; quantity: number; price: number }>;
  total: number;
}) {
  const operations = [
    // Insert sale
    {
      sql: 'INSERT INTO sales (id, customer_id, sale_date, total_amount, payment_status) VALUES (?, ?, date("now"), ?, "due")',
      params: [sale.id, sale.customerId, sale.total],
    },
    // Insert sale items
    ...sale.items.map((item) => ({
      sql: 'INSERT INTO sale_items (id, sale_id, item_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
      params: [
        `item-${Date.now()}-${item.itemId}`,
        sale.id,
        item.itemId,
        item.quantity,
        item.price,
        item.quantity * item.price,
      ],
    })),
    // Update customer balance
    {
      sql: 'UPDATE customers SET current_balance = current_balance + ? WHERE id = ?',
      params: [sale.total, sale.customerId],
    },
    // Update item stock
    ...sale.items.map((item) => ({
      sql: 'UPDATE items SET stock_quantity = stock_quantity - ? WHERE id = ?',
      params: [item.quantity, item.itemId],
    })),
  ];

  const result = await window.electronAPI.db.transaction(operations);

  if (result.success) {
    console.log('Sale transaction completed successfully');
  } else {
    console.error('Sale creation failed:', result.error);
  }

  return result;
}

// ============================================================================
// Example 5: Settings Management
// ============================================================================
export function SettingsExample() {
  const { getSetting, setSetting, getAllSettings } = useSettings();

  const loadCurrency = async () => {
    const currency = await getSetting('currency');
    console.log('Current currency:', currency);
  };

  const updateCurrency = async () => {
    const success = await setSetting('currency', 'USD');
    if (success) console.log('Currency updated to USD');
  };

  const loadAll = async () => {
    const settings = await getAllSettings();
    console.log('All settings:', settings);
  };

  return (
    <div>
      <button onClick={loadCurrency}>Load Currency</button>
      <button onClick={updateCurrency}>Change to USD</button>
      <button onClick={loadAll}>Load All Settings</button>
    </div>
  );
}

// ============================================================================
// Example 6: Complex Query with Join
// ============================================================================
export function SalesReportExample() {
  const { data: salesReport, isLoading } = useDatabaseQuery<any[]>(
    () =>
      window.electronAPI.db.query(
        `
      SELECT 
        s.id,
        s.invoice_number,
        s.sale_date,
        s.total_amount,
        s.payment_status,
        c.name as customer_name,
        c.phone as customer_phone
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      WHERE s.sale_date >= date('now', '-30 days')
      ORDER BY s.sale_date DESC
      LIMIT 100
    `,
        []
      ),
    []
  );

  if (isLoading) return <div>Loading report...</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {salesReport?.map((sale) => (
          <tr key={sale.id}>
            <td>{sale.invoice_number}</td>
            <td>{sale.sale_date}</td>
            <td>
              {sale.customer_name}
              {sale.customer_phone && ` (${sale.customer_phone})`}
            </td>
            <td>${sale.total_amount}</td>
            <td>{sale.payment_status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================================
// Example 7: Low Stock Items Alert
// ============================================================================
export function LowStockAlertExample() {
  const { data: lowStockItems } = useDatabaseQuery<any[]>(
    () =>
      window.electronAPI.db.query(
        `
      SELECT id, name, stock_quantity, low_stock_threshold, unit
      FROM items 
      WHERE stock_quantity <= low_stock_threshold 
        AND status = 'active'
      ORDER BY stock_quantity ASC
    `,
        []
      ),
    [],
    { refetchInterval: 60000 } // Check every minute
  );

  if (!lowStockItems || lowStockItems.length === 0) {
    return null; // No alerts
  }

  return (
    <div className="alert alert-warning">
      <h3>Low Stock Alert</h3>
      <ul>
        {lowStockItems.map((item) => (
          <li key={item.id}>
            {item.name}: {item.stock_quantity} {item.unit} (Threshold: {item.low_stock_threshold})
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Example 8: Direct Query (without hook)
// ============================================================================
export async function getCustomerBalanceExample(customerId: string) {
  const result = await window.electronAPI.db.queryOne(
    'SELECT name, current_balance FROM customers WHERE id = ?',
    [customerId]
  );

  if (result.success && result.data) {
    return {
      name: result.data.name,
      balance: result.data.current_balance,
    };
  }

  throw new Error(result.error || 'Customer not found');
}

// ============================================================================
// Example 9: Backup Database
// ============================================================================
export async function createBackupExample() {
  const result = await window.electronAPI.db.backup('manual');

  if (result.success) {
    alert(`Backup created successfully at: ${result.data}`);
  } else {
    console.error('Backup failed:', result.error);
    alert(`Backup failed: ${result.error}`);
  }
}

// ============================================================================
// Example 10: Database Status Check
// ============================================================================
export function DatabaseStatusExample() {
  const { isReady, version } = useDatabase();

  return (
    <div className="database-status">
      <span className={`status-indicator ${isReady ? 'ready' : 'not-ready'}`}>
        {isReady ? '● Database Ready' : '● Database Not Ready'}
      </span>
      {version && <span className="version">Version: {version}</span>}
    </div>
  );
}

// ============================================================================
// Example 11: Type-Safe Query
// ============================================================================
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  current_balance: number;
  status: 'active' | 'inactive';
}

export function TypeSafeQueryExample() {
  // TypeScript will enforce Customer type
  const { data, isLoading } = useDatabaseQuery<Customer[]>(
    () => window.electronAPI.db.query('SELECT * FROM customers'),
    []
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {data?.map((customer) => (
        <li key={customer.id}>
          {customer.name} - {customer.current_balance}
          {/* TypeScript knows these properties exist */}
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// Example 12: Error Handling
// ============================================================================
export function ErrorHandlingExample() {
  const { data, error, refetch } = useDatabaseQuery(
    () => window.electronAPI.db.query('SELECT * FROM customers'),
    [],
    {
      onError: (error) => {
        // Log to error tracking service
        console.error('Database error:', error);
        // Show toast notification
        alert(`Error: ${error}`);
      },
    }
  );

  if (error) {
    return (
      <div className="error-container">
        <p>Failed to load data: {error}</p>
        <button onClick={refetch}>Try Again</button>
      </div>
    );
  }

  return <div>{/* Render data */}</div>;
}
