-- Migration v23: Create expense_categories table
-- Apply this migration to add expense categories functionality

BEGIN TRANSACTION;

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default expense categories
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('utilities', 'Utilities', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('rent', 'Rent', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('salaries', 'Salaries', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('transport', 'Transport', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('office_supplies', 'Office Supplies', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('maintenance', 'Maintenance', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('marketing', 'Marketing', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('insurance', 'Insurance', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('taxes', 'Taxes', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('other', 'Other', 'active');

-- Update database version
PRAGMA user_version = 23;

COMMIT;
