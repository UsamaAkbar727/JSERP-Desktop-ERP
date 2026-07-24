/**
 * Apply Migration v19: Add mobile_wallet and custom to payment methods
 * Run this script to manually apply migration v19 when app is closed
 * 
 * Usage: node scripts/apply-migration-19.cjs
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Get database path (matches Electron userData location)
const userDataDir = process.platform === 'win32'
  ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'JSERP')
  : path.join(os.homedir(), '.config', 'JSERP');
const dbPath = path.join(userDataDir, 'database', 'erp-pro.db');


if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  process.exit(1);
}

try {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);


  // Create _metadata table if it doesn't exist
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS _metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert version if doesn't exist
    db.prepare(`
      INSERT OR IGNORE INTO _metadata (key, value) VALUES ('version', '0')
    `).run();

  } catch (err) {
    console.log('ℹ️  Creating metadata table...');
  }

  // Get current version
  const versionRow = db.prepare('SELECT value FROM _metadata WHERE key = ?').get('version');
  const currentVersion = versionRow ? parseInt(versionRow.value) : 0;

  if (currentVersion >= 19) {
    db.close();
    process.exit(0);
  }


  // Begin transaction
  db.exec('BEGIN TRANSACTION');

  try {
    // Recreate payments table with all payment method types
    db.exec(`
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
    `);

    // Copy existing data
    db.exec('INSERT INTO payments_new SELECT * FROM payments');

    // Drop old table and rename new table
    db.exec('DROP TABLE payments');
    db.exec('ALTER TABLE payments_new RENAME TO payments');

    // Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
      CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
      CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
      CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
    `);

    // Update version
    db.prepare(`
      UPDATE _metadata 
      SET value = '19', updated_at = datetime('now')
      WHERE key = 'version'
    `).run();

    // Commit transaction
    db.exec('COMMIT');

 

  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  db.close();

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
}
