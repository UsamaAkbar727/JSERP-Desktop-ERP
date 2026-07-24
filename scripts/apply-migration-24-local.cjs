/**
 * Local migration script for development
 * Applies migration v24 to local database in project root
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function main() {
  console.log('\n📦 Migration v24: Add profit/loss tracking to sale_items (Local)\n');

  // Use local database in project root
  const dbPath = path.join(__dirname, '..', 'erp.db');

  console.log(`🗄️  Database path: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.error(`\n❌ Database not found at: ${dbPath}`);
    console.error('   Please ensure the development database exists.\n');
    process.exit(1);
  }

  // Open database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Check current version
  const currentVersion = db.pragma('user_version', { simple: true });
  console.log(`\n📌 Current database version: ${currentVersion}`);

  if (currentVersion >= 24) {
    console.log('✅ Database is already at version 24 or higher. No migration needed.\n');
    db.close();
    return;
  }

  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').split('Z')[0];
  const backupPath = path.join(__dirname, '..', `erp_backup_v${currentVersion}_${timestamp}.db`);
  
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

  // Read migration SQL
  const migrationPath = path.join(__dirname, '..', 'migration-v24.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`\n❌ Migration file not found: ${migrationPath}\n`);
    db.close();
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Apply migration
  console.log('\n⚙️  Applying migration...');
  
  try {
    // Execute migration SQL
    db.exec(migrationSQL);

    // Verify version
    const newVersion = db.pragma('user_version', { simple: true });
    
    if (newVersion === 24) {
      console.log('✅ Migration completed successfully!');
      console.log(`📌 New database version: ${newVersion}`);
      
      // Show some stats
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN profit < 0 THEN 1 END) as loss_items,
          SUM(profit) as total_profit
        FROM sale_items
      `).get();
      
      console.log('\n📊 Sale Items Statistics:');
      console.log(`   Total sale items: ${stats.total_items}`);
      console.log(`   Items sold at loss: ${stats.loss_items}`);
      console.log(`   Total profit: Rs ${stats.total_profit ? stats.total_profit.toFixed(2) : '0.00'}`);
      
    } else {
      console.error(`\n❌ Migration may have failed. Current version: ${newVersion}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    console.error('\n🔄 Restoring backup...');
    
    try {
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

  console.log('\n✅ Migration v24 completed successfully!');
  console.log(`💾 Backup saved at: ${backupPath}\n`);
}

// Run migration
main();
