/**
 * Apply Migration v23: Create expense categories table
 * This script creates the expense_categories table and adds default categories
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get database path (same as in manager.ts)
function getDatabasePath() {
  // Check if running in development (root folder)
  const devDbPath = path.join(process.cwd(), 'erp.db');
  if (fs.existsSync(devDbPath)) {
    return devDbPath;
  }

  // Check for erp-pro.db in data/database folder
  const dataDbPath = path.join(process.cwd(), 'data', 'database', 'erp-pro.db');
  if (fs.existsSync(dataDbPath)) {
    return dataDbPath;
  }

  // Production path
  const appName = 'OptifyERP';
  const prodDbPath = path.join(os.homedir(), 'AppData', 'Roaming', appName, 'database', 'erp-pro.db');
  if (fs.existsSync(prodDbPath)) {
    return prodDbPath;
  }

  // Try development erp-pro.db
  const devProDbPath = path.join(process.cwd(), 'erp-pro.db');
  if (fs.existsSync(devProDbPath)) {
    return devProDbPath;
  }

  // Return root erp.db as default
  return devDbPath;
}

const dbPath = getDatabasePath();
console.log('📁 Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('\n🔍 Checking current version...');
const currentVersion = db.prepare('PRAGMA user_version').get();
console.log('Current version:', currentVersion.user_version);

if (currentVersion.user_version >= 23) {
  console.log('✅ Database already at version 23 or higher. No migration needed.');
  db.close();
  process.exit(0);
}

console.log('\n🚀 Starting migration to version 23...\n');

try {
  db.exec('BEGIN TRANSACTION');

  // Create expense_categories table
  console.log('📋 Creating expense_categories table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default categories
  console.log('📝 Inserting default expense categories...');
  const defaultCategories = [
    { id: 'utilities', name: 'Utilities' },
    { id: 'rent', name: 'Rent' },
    { id: 'salaries', name: 'Salaries' },
    { id: 'transport', name: 'Transport' },
    { id: 'office_supplies', name: 'Office Supplies' },
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'insurance', name: 'Insurance' },
    { id: 'taxes', name: 'Taxes' },
    { id: 'other', name: 'Other' },
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO expense_categories (id, name, status)
    VALUES (?, ?, 'active')
  `);

  for (const category of defaultCategories) {
    insertStmt.run(category.id, category.name);
    console.log(`  ✓ Added category: ${category.name}`);
  }

  // Update version
  db.pragma('user_version = 23');

  db.exec('COMMIT');

  console.log('\n✅ Migration v23 completed successfully!');
  console.log('✅ Created expense_categories table with 10 default categories');

  // Verify
  const newVersion = db.prepare('PRAGMA user_version').get();
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get();
  console.log('\n📊 Verification:');
  console.log('  Database version:', newVersion.user_version);
  console.log('  Categories count:', categoryCount.count);

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
  console.log('\n✅ Database connection closed.');
}
