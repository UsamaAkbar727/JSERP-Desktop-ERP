-- Migration Version 7: Seed Default Data
-- Inserts default data required for application to function
-- Includes cash account, walk-in customer, units, and default settings

-- =============================================================================
-- DEFAULT CASH ACCOUNT
-- =============================================================================
INSERT OR IGNORE INTO accounts (id, account_name, account_type, opening_balance, current_balance, status)
VALUES ('1', 'Cash', 'cash', 0, 0, 'active');

-- =============================================================================
-- WALK-IN CUSTOMER (Default Customer)
-- =============================================================================
INSERT OR IGNORE INTO customers (id, name, name_urdu, opening_balance, current_balance, status, notes)
VALUES ('1', 'Walk-in Customer', 'واک اِن کسٹمر', 0, 0, 'active', 'Default customer for walk-in sales');

-- =============================================================================
-- DEFAULT MEASUREMENT UNITS
-- =============================================================================
INSERT OR IGNORE INTO units (id, name, name_urdu, symbol, status) VALUES
  ('1', 'Piece', 'عدد', 'pcs', 'active'),
  ('2', 'Kilogram', 'کلوگرام', 'kg', 'active'),
  ('3', 'Gram', 'گرام', 'g', 'active'),
  ('4', 'Meter', 'میٹر', 'm', 'active'),
  ('5', 'Liter', 'لیٹر', 'L', 'active'),
  ('6', 'Box', 'ڈبہ', 'box', 'active'),
  ('7', 'Dozen', 'درجن', 'dz', 'active'),
  ('8', 'Carton', 'کارٹن', 'ctn', 'active'),
  ('9', 'Packet', 'پیکٹ', 'pkt', 'active'),
  ('10', 'Pair', 'جوڑا', 'pr', 'active');

-- =============================================================================
-- EXPENSE CATEGORIES
-- =============================================================================
INSERT OR REPLACE INTO settings (key, value)
VALUES ('expense_categories', '["Utilities","Rent","Salaries","Transport","Office Supplies","Maintenance","Marketing","Insurance","Taxes","Other"]');

-- =============================================================================
-- DEFAULT APP SETTINGS
-- =============================================================================
INSERT OR REPLACE INTO settings (key, value) VALUES
  ('app_name', 'JSERP'),
  ('currency', 'PKR'),
  ('currency_symbol', 'Rs.'),
  ('language', 'en'),
  ('date_format', 'YYYY-MM-DD'),
  ('invoice_prefix', 'INV-'),
  ('purchase_prefix', 'PUR-'),
  ('task_prefix', 'TSK-');

-- =============================================================================
-- MENU VISIBILITY SETTINGS (All visible by default)
-- =============================================================================
INSERT OR REPLACE INTO settings (key, value)
VALUES ('menu_visibility', '{"dashboard":true,"pos":true,"customers":true,"suppliers":true,"items":true,"sales":true,"purchases":true,"expenses":true,"accounts":true,"reports":true,"goods":true}');

-- =============================================================================
-- CUSTOMER FORM SETTINGS (Fields hidden by default)
-- =============================================================================
INSERT OR REPLACE INTO settings (key, value)
VALUES ('customer_form_settings', '{"showEmail":false,"showPhone":false,"showAddress":false,"showCity":false,"showStatus":false,"showNotes":false}');

-- =============================================================================
-- SUPPLIER FORM SETTINGS (Fields hidden by default)
-- =============================================================================
INSERT OR REPLACE INTO settings (key, value)
VALUES ('supplier_form_settings', '{"showEmail":false,"showPhone":false,"showAddress":false,"showCity":false,"showStatus":false,"showNotes":false}');

-- =============================================================================
-- INVOICE SETTINGS (Default invoice configuration)
-- =============================================================================
INSERT OR REPLACE INTO settings (key, value)
VALUES ('invoice_settings', '{"headerBannerUrl":"","columnLabels":{"serialNo":"S.No","quantity":"Qty","description":"Description","rate":"Rate","total":"Total"}}');
