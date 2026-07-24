-- Migration v18: Add credit payment method support
-- Run this SQL script after closing the application

BEGIN TRANSACTION;

-- 1. Recreate sales table with credit in CHECK constraint
CREATE TABLE sales_new (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    sale_date TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit')),
    account_id TEXT,
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    due_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

INSERT INTO sales_new SELECT * FROM sales;
DROP TABLE sales;
ALTER TABLE sales_new RENAME TO sales;

CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_account ON sales(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status);

-- 2. Recreate purchases table with credit in CHECK constraint
CREATE TABLE purchases_new (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    purchase_date TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit')),
    account_id TEXT,
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    due_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

INSERT INTO purchases_new SELECT * FROM purchases;
DROP TABLE purchases;
ALTER TABLE purchases_new RENAME TO purchases;

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_account ON purchases(account_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status);

-- 3. Recreate payments table with credit in CHECK constraint
CREATE TABLE payments_new (
    id TEXT PRIMARY KEY,
    payment_date TEXT NOT NULL,
    payment_type TEXT NOT NULL CHECK(payment_type IN ('sale', 'purchase', 'expense', 'income')),
    reference_id TEXT,
    reference_number TEXT,
    party_id TEXT NOT NULL,
    party_name TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit')),
    account_id TEXT NOT NULL,
    amount REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

INSERT INTO payments_new SELECT * FROM payments;
DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;

CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_id);

-- Update version
UPDATE _metadata SET value = '18', updated_at = datetime('now') WHERE key = 'version';

COMMIT;
