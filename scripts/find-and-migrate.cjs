/**
 * Find and migrate Electron database in development mode
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// This should match Electron's app.getPath('userData') in development
const APP_NAME = 'Electron'; // Default Electron development name
const ACTUAL_APP_NAME = 'erp-pro-desktop'; // From package.json name

function findDatabase() {
  const platform = os.platform();
  let possiblePaths = [];

  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    possiblePaths = [
      path.join(appData, ACTUAL_APP_NAME, 'database', 'erp-pro.db'),
      path.join(appData, APP_NAME, 'database', 'erp-pro.db'),
      path.join(appData, 'erp-pro', 'database', 'erp-pro.db'),
      path.join(appData, 'erp-pro', 'erp.db'),
      path.join(__dirname, '..', 'erp.db'), // Local dev database
    ];
  }

  console.log('\n🔍 Searching for database...\n');
  
  for (const dbPath of possiblePaths) {
    console.log(`Checking: ${dbPath}`);
    if (fs.existsSync(dbPath)) {
      console.log(`✅ Found database at: ${dbPath}\n`);
      return dbPath;
    }
  }

  console.log('\n❌ No database found in expected locations.');
  console.log('Database paths checked:');
  possiblePaths.forEach(p => console.log(`  - ${p}`));
  console.log('\nPlease start the Electron app first to create the database.\n');
  process.exit(1);
}

function applyMigration(dbPath) {
  console.log(`📦 Applying migration v25 to: ${dbPath}\n`);

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  try {
    // Check current version
    const currentVersion = db.pragma('user_version', { simple: true });
    console.log(` Current version: ${currentVersion}`);

    if (currentVersion >= 25) {
      console.log('✅ Database already at version 25 or higher.\n');
      db.close();
      return;
    }

    // Create backup
    const backupPath = dbPath.replace('.db', `_backup_v${currentVersion}_${Date.now()}.db`);
    console.log(`💾 Creating backup: ${path.basename(backupPath)}`);
    fs.copyFileSync(dbPath, backupPath);

    // Apply migration
    console.log('⚙️  Applying migration...');
    db.exec('BEGIN TRANSACTION');

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

    db.prepare(`
      INSERT OR IGNORE INTO invoice_number_formats
        (id, type, prefix, date_format, digits, reset_type, last_counter, last_reset_date)
      VALUES ('SALE-FORMAT', 'sale', 'SAL', 'YYYY-MM', 4, 'monthly', 0, NULL)
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO invoice_number_formats
        (id, type, prefix, date_format, digits, reset_type, last_counter, last_reset_date)
      VALUES ('PUR-FORMAT', 'purchase', 'PUR', 'YYYY-MM', 4, 'monthly', 0, NULL)
    `).run();

    db.pragma(`user_version = 25`);
    db.exec('COMMIT');

    const newVersion = db.pragma('user_version', { simple: true });
    console.log(`✅ Migration completed! Version: ${newVersion}\n`);

    // Show formats
    const formats = db.prepare('SELECT * FROM invoice_number_formats').all();
    console.log('📊 Invoice Number Formats:');
    formats.forEach(format => {
      console.log(`   ${format.type.toUpperCase()}: ${format.prefix}-${format.date_format}-${'#'.repeat(format.digits)}`);
    });
    console.log('');

    db.close();
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    try {
      db.exec('ROLLBACK');
    } catch (e) {}
    db.close();
    process.exit(1);
  }
}

// Main
const dbPath = findDatabase();
applyMigration(dbPath);
console.log('✅ Done! Restart the Electron app to use the new feature.\n');
