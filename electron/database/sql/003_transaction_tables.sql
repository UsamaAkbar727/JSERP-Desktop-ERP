-- Migration Version 3: Transaction Tables
-- Creates sales, purchases, payments, expenses, and transactions tables
-- Includes proper foreign key relationships and referential integrity

-- =============================================================================
-- SALES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  sale_date TEXT NOT NULL,
  subtotal REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  due_amount REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
  payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
  account_id TEXT,
  cheque_account_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- =============================================================================
-- SALE ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  unit TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT
);

-- =============================================================================
-- PURCHASES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  bill_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  subtotal REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  due_amount REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
  payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
  account_id TEXT,
  cheque_account_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- =============================================================================
-- PURCHASE ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  unit TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT
);

-- =============================================================================
-- PAYMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_type TEXT NOT NULL CHECK(payment_type IN ('receipt', 'payment')),
  payment_date TEXT NOT NULL,
  customer_id TEXT,
  supplier_id TEXT,
  sale_id TEXT,
  purchase_id TEXT,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
  cheque_account_id TEXT,
  cheque_number TEXT,
  amount REAL NOT NULL,
  reference_number TEXT,
  notes TEXT,
  is_full_payment INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- =============================================================================
-- EXPENSES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

-- =============================================================================
-- TRANSACTIONS TABLE (Ledger Entries)
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  transaction_date TEXT NOT NULL,
  reference_type TEXT NOT NULL CHECK(reference_type IN ('sale', 'purchase', 'customer_payment', 'supplier_payment')),
  reference_id TEXT NOT NULL,
  account_id TEXT,
  customer_id TEXT,
  supplier_id TEXT,
  direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
  amount REAL NOT NULL,
  balance_after REAL,
  description TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);
