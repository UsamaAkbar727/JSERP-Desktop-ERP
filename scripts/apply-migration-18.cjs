const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path - check both locations
const possiblePaths = [
    path.join(__dirname, '..', 'erp.db'),
    path.join(__dirname, '..', 'data', 'database.db')
];

let dbPath = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        dbPath = p;
        break;
    }
}


if (!dbPath || !fs.existsSync(dbPath)) {
    console.error('❌ Database file not found!');
    process.exit(1);
}

try {
    const db = new Database(dbPath);
    
    // Get current version
    const getCurrentVersion = () => {
        try {
            const result = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
            return result ? parseInt(result.value, 10) : 0;
        } catch (error) {
            return 0;
        }
    };

    const currentVersion = getCurrentVersion();

    if (currentVersion >= 18) {
        db.close();
        process.exit(0);
    }


    // Apply migration v18 manually
    db.transaction(() => {
        // 1. Recreate sales table with credit in CHECK constraint
        db.exec(`
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
        `);

        // Copy data from old sales table
        db.exec(`INSERT INTO sales_new SELECT * FROM sales;`);

        // Drop old table and rename new table
        db.exec(`DROP TABLE sales;`);
        db.exec(`ALTER TABLE sales_new RENAME TO sales;`);

        // Recreate indexes
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
            CREATE INDEX IF NOT EXISTS idx_sales_account ON sales(account_id);
            CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
            CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status);
        `);

        // 2. Recreate purchases table with credit in CHECK constraint
        db.exec(`
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
        `);

        // Copy data from old purchases table
        db.exec(`INSERT INTO purchases_new SELECT * FROM purchases;`);

        // Drop old table and rename new table
        db.exec(`DROP TABLE purchases;`);
        db.exec(`ALTER TABLE purchases_new RENAME TO purchases;`);

        // Recreate indexes
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_purchases_account ON purchases(account_id);
            CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
            CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status);
        `);

        // 3. Recreate payments table with credit in CHECK constraint
        db.exec(`
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
        `);

        // Copy data from old payments table
        db.exec(`INSERT INTO payments_new SELECT * FROM payments;`);

        // Drop old table and rename new table
        db.exec(`DROP TABLE payments;`);
        db.exec(`ALTER TABLE payments_new RENAME TO payments;`);

        // Recreate indexes
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id);
            CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
            CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
            CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
            CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_id);
        `);

        // Update version in metadata
        db.prepare(`
            UPDATE _metadata 
            SET value = ?, updated_at = datetime('now')
            WHERE key = 'version'
        `).run('18');

    })();

    const newVersion = getCurrentVersion();
    
    db.close();
    process.exit(0);

} catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
}
