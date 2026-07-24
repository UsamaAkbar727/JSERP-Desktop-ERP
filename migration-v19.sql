-- Migration v19: Add mobile_wallet and custom to payment_method CHECK constraint
-- Run this SQL script manually or close app and restart

BEGIN TRANSACTION;

-- Create new payments table with updated CHECK constraint
CREATE TABLE payments_new (
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

-- Copy existing data
INSERT INTO payments_new SELECT * FROM payments;

-- Drop old table
DROP TABLE payments;

-- Rename new table
ALTER TABLE payments_new RENAME TO payments;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);

-- Update database version
UPDATE _metadata SET value = '19', updated_at = datetime('now') WHERE key = 'version';

COMMIT;
