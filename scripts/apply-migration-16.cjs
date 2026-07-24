/**
 * Manually Apply Migration Version 16
 * Adds 'expense' support to transactions table
 */

const Database = require('better-sqlite3');
const { join } = require('path');
const { homedir } = require('os');

// Find database path - Try multiple possible locations
const userDataPath = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
const possiblePaths = [
  join(userDataPath, 'JSERP', 'database', 'erp-pro.db'),
  join(userDataPath, 'ERP Pro', 'database', 'erp-pro.db'),
  join(userDataPath, 'erp-pro-desktop', 'database', 'erp-pro.db'),
];

const { existsSync } = require('fs');
let dbPath = null;

for (const path of possiblePaths) {
  if (existsSync(path)) {
    dbPath = path;
    break;
  }
}

if (!dbPath) {
  console.error('❌ Database file not found in any of these locations:');
  possiblePaths.forEach(p => console.error('   -', p));
  process.exit(1);
}


try {
  const db = new Database(dbPath);
  
  // Check current version
  const versionRow = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
  const currentVersion = versionRow ? parseInt(versionRow.value) : 0;
  
  if (currentVersion >= 16) {
    db.close();
    process.exit(0);
  }
  
  // Start transaction
  const migrate = db.transaction(() => {
    
    // 1. Create new table with updated constraint
    db.exec(`
      CREATE TABLE transactions_new (
        id TEXT PRIMARY KEY,
        transaction_date TEXT NOT NULL,
        reference_type TEXT NOT NULL CHECK(reference_type IN ('sale', 'purchase', 'customer_payment', 'supplier_payment', 'expense')),
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
    `);
    
    // 2. Copy existing data
    db.exec(`
      INSERT INTO transactions_new 
      SELECT * FROM transactions;
    `);
    
    // 3. Drop old table
    db.exec(`DROP TABLE transactions;`);
    
    // 4. Rename new table
    db.exec(`ALTER TABLE transactions_new RENAME TO transactions;`);
    
    // 5. Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_supplier ON transactions(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_reference_type ON transactions(reference_type);
    `);
    
    // 6. Update version
    db.prepare(`
      UPDATE _metadata 
      SET value = '16', updated_at = datetime('now')
      WHERE key = 'version'
    `).run();
  });
  
  // Execute transaction
  migrate();
  
  // Verify
  const newVersion = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
 
  
  // Test the constraint
  const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'`).get();
  if (tableInfo.sql.includes("'expense'")) {
  }
  
  db.close();
  
} catch (error) {
  console.error('\n❌ Error applying migration:', error.message);
  console.error(error.stack);
  process.exit(1);
}
