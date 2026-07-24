/**
 * One-time script: Insert Walk-in Customer (id='1') into existing database
 * Run: node scripts/insert-walkin-customer.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Resolve database path — tries multiple known locations
const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const candidates = [
  path.join(appData, 'JSERP', 'database', 'erp-pro.db'),
  path.join(appData, 'erp-pro', 'erp-pro.db'),
  path.join(appData, 'erp-pro', 'database', 'erp-pro.db'),
];
const dbPath = candidates.find(p => fs.existsSync(p)) || candidates[0];

console.log('📁 Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

// ── Check current state ───────────────────────────────────────────────────────
const existing = db.prepare("SELECT * FROM customers WHERE id = '1'").get();

if (existing) {
  console.log('ℹ️  Walk-in Customer already exists:', existing);
} else {
  // ── Insert Walk-in Customer ─────────────────────────────────────────────────
  db.prepare(`
    INSERT OR IGNORE INTO customers
      (id, name, name_urdu, opening_balance, current_balance, status, notes)
    VALUES
      ('1', 'Walk-in Customer', 'واک اِن کسٹمر', 0, 0, 'active',
       'Default customer for walk-in sales')
  `).run();

  const inserted = db.prepare("SELECT * FROM customers WHERE id = '1'").get();
  console.log('✅ Walk-in Customer created:', inserted);
}

// ── Also ensure Cash account exists ──────────────────────────────────────────
const existingCash = db.prepare("SELECT * FROM accounts WHERE id = '1'").get();
if (!existingCash) {
  db.prepare(`
    INSERT OR IGNORE INTO accounts
      (id, account_name, account_type, opening_balance, current_balance, status)
    VALUES
      ('1', 'Cash', 'cash', 0, 0, 'active')
  `).run();
  console.log('✅ Cash account created');
} else {
  console.log('ℹ️  Cash account already exists:', existingCash.account_name);
}

// ── Final verify ──────────────────────────────────────────────────────────────
const allCustomers = db.prepare('SELECT id, name, status FROM customers ORDER BY created_at DESC').all();
console.log('\n📋 All customers in database:');
allCustomers.forEach(c => console.log(`   [${c.id}] ${c.name} (${c.status})`));

db.close();
console.log('\n✅ Done! Please refresh the Customers page in the app.');
