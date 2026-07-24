-- Migration Version 5: Goods Module Tables
-- Creates riders and goods_tasks tables for delivery tracking feature

-- =============================================================================
-- RIDERS TABLE (Delivery Personnel)
-- =============================================================================
CREATE TABLE IF NOT EXISTS riders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_urdu TEXT,
  phone TEXT,
  email TEXT,
  vehicle_number TEXT,
  vehicle_type TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- GOODS TASKS TABLE (Delivery Tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS goods_tasks (
  id TEXT PRIMARY KEY,
  task_number TEXT UNIQUE NOT NULL,
  task_date TEXT NOT NULL,
  rider_id TEXT NOT NULL,
  rider_name TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  sale_id TEXT,
  invoice_number TEXT,
  pickup_address TEXT,
  delivery_address TEXT NOT NULL,
  description TEXT,
  amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
);
