-- Migration Version 2: Core ERP Tables
-- Creates accounts, customers, suppliers, units, and items tables
-- Matches TypeScript types from src/types/erp.ts

-- =============================================================================
-- ACCOUNTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom')),
  account_number TEXT,
  bank_name TEXT,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- CUSTOMERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_urdu TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0, -- Positive = they owe us
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SUPPLIERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_urdu TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0, -- Positive = we owe them
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- UNITS TABLE (Measurement Units)
-- =============================================================================
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_urdu TEXT,
  symbol TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ITEMS TABLE (Products/Inventory)
-- =============================================================================
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_urdu TEXT,
  sku TEXT,
  description TEXT,
  sale_price REAL DEFAULT 0,
  purchase_price REAL DEFAULT 0,
  opening_stock REAL DEFAULT 0,
  stock_quantity REAL DEFAULT 0,
  low_stock_threshold REAL DEFAULT 0,
  unit_id TEXT NOT NULL,
  unit TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
);
