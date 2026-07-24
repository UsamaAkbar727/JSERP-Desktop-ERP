/**
 * Script to apply migration v25 - Adds invoice number format configuration
 * 
 * This migration:
 * - Creates invoice_number_formats table for configurable invoice/bill numbering
 * - Adds default formats for sales and purchases
 * - Enables prefix, date format, counter digits, and reset type configuration
 * 
 * Usage:
 *   node scripts/apply-migration-25.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

const APP_NAME = 'erp-pro';
const DB_NAME = 'erp.db';

function getDataPath() {
  const platform = os.platform();
  let dataPath;

  if (platform === 'win32') {
    dataPath = path.join(process.env.APPDATA || '', APP_NAME);
  } else if (platform === 'darwin') {
    dataPath = path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
  } else {
    dataPath = path.join(os.homedir(), '.config', APP_NAME);
  }

  return dataPath;
}

function main() {
  console.log('\n📦 Migration v25: Add invoice number format configuration\n');

  // Check for local database first (for development)
  const localDbPath = path.join(__dirname, '..', DB_NAME);
  const dataPath = getDataPath();
  const appDataDbPath = path.join(dataPath, DB_NAME);

  let dbPath;
  if (fs.existsSync(localDbPath)) {
    dbPath = localDbPath;
    console.log(`📂 Using local database (development mode)`);
    console.log(`🗄️  Database path: ${dbPath}`);
  } else if (fs.existsSync(appDataDbPath)) {
    dbPath = appDataDbPath;
    console.log(`📂 Data directory: ${dataPath}`);
    console.log(`🗄️  Database path: ${dbPath}`);
  } else {
    console.error(`\n❌ Database not found at:`);
    console.error(`   Local: ${localDbPath}`);
    console.error(`   AppData: ${appDataDbPath}`);
    console.error('   Please ensure the application has been run at least once.\n');
    process.exit(1);
  }

  // Open database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Check current version from user_version pragma
  let currentVersion;
  try {
    currentVersion = db.pragma('user_version', { simple: true });
  } catch (error) {
    console.error(`\n❌ Error reading database version: ${error.message}\n`);
    db.close();
    process.exit(1);
  }

  console.log(`\n📌 Current database version: ${currentVersion}`);

  if (currentVersion >= 25) {
    console.log('✅ Database is already at version 25 or higher. No migration needed.\n');
    db.close();
    process.exit(0);
  }

  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').split('Z')[0];
  const backupDir = path.dirname(dbPath);
  const backupPath = path.join(backupDir, `erp_backup_v${currentVersion}_${timestamp}.db`);
  
  console.log(`\n💾 Creating backup...`);
  console.log(`   Backup path: ${backupPath}`);
  
  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ Backup created successfully');
  } catch (error) {
    console.error(`\n❌ Failed to create backup: ${error.message}\n`);
    db.close();
    process.exit(1);
  }

  // Apply migration
  console.log('\n⚙️  Applying migration...');
  
  try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');

    // Create invoice_number_formats table
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_number_formats (
        id TEXT PRIMARY KEY,
        type TEXT UNIQUE NOT NULL,
        prefix TEXT NOT NULL DEFAULT 'INV',
        date_format TEXT NOT NULL DEFAULT 'YYYY-MM',
        digits INTEGER NOT NULL DEFAULT 4,
        reset_type TEXT NOT NULL DEFAULT 'monthly' CHECK(reset_type IN ('monthly', 'yearly', 'never')),
        last_counter INTEGER NOT NULL DEFAULT 0,
        last_reset_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default format for sales
    db.prepare(`
      INSERT OR IGNORE INTO invoice_number_formats
        (id, type, prefix, date_format, digits, reset_type, last_counter, last_reset_date)
      VALUES ('SALE-FORMAT', 'sale', 'SAL', 'YYYY-MM', 4, 'monthly', 0, NULL)
    `).run();

    // Insert default format for purchases
    db.prepare(`
      INSERT OR IGNORE INTO invoice_number_formats
        (id, type, prefix, date_format, digits, reset_type, last_counter, last_reset_date)
      VALUES ('PUR-FORMAT', 'purchase', 'PUR', 'YYYY-MM', 4, 'monthly', 0, NULL)
    `).run();

    // Update version using pragma
    db.pragma(`user_version = 25`);

    // Commit transaction
    db.exec('COMMIT');

    // Verify version
    const newVersion = db.pragma('user_version', { simple: true });
    
    if (newVersion === 25) {
      console.log('✅ Migration completed successfully!');
      console.log(`📌 New database version: ${newVersion}`);
      
      // Show configuration
      const formats = db.prepare('SELECT * FROM invoice_number_formats').all();
      
      console.log('\n📊 Invoice Number Formats:');
      formats.forEach(format => {
        console.log(`   ${format.type.toUpperCase()}:`);
        console.log(`     Format: ${format.prefix}-${format.date_format}-${'#'.repeat(format.digits)}`);
        console.log(`     Reset: ${format.reset_type}`);
        console.log(`     Current Counter: ${format.last_counter}`);
      });
      
    } else {
      console.error(`\n❌ Migration may have failed. Current version: ${newVersion}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    console.error('\n🔄 Restoring backup...');
    
    try {
      db.exec('ROLLBACK');
      db.close();
      fs.copyFileSync(backupPath, dbPath);
      console.log('✅ Backup restored successfully\n');
    } catch (restoreError) {
      console.error(`❌ Failed to restore backup: ${restoreError.message}\n`);
    }
    
    process.exit(1);
  }

  // Close database
  db.close();

  console.log('\n✅ Migration v25 completed successfully!');
  console.log(`💾 Backup saved at: ${backupPath}\n`);
}

// Run migration
main();
