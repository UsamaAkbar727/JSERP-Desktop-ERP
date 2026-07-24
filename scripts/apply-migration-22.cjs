const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get database path - matching electron app's userData path
const appName = 'JSERP'; // productName from package.json
const dbDir = path.join(os.homedir(), 'AppData', 'Roaming', appName, 'database');
const dbPath = path.join(dbDir, 'erp-pro.db');


if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found!');
  process.exit(1);
}

// Backup database
const backupPath = dbPath.replace('.db', `-backup-v22-${Date.now()}.db`);
fs.copyFileSync(dbPath, backupPath);

// Open database
const db = new Database(dbPath);

try {

  // Execute migration in a transaction
  const migrate = db.transaction(() => {
    // Get counts before migration
    const itemsWithZeroPriceBefore = db.prepare(`
      SELECT COUNT(*) as count 
      FROM items 
      WHERE (purchase_price = 0 OR purchase_price IS NULL)
      AND id IN (SELECT DISTINCT item_id FROM purchase_items)
    `).get();

    const allItemsBefore = db.prepare(`
      SELECT id, name, purchase_price 
      FROM items 
      WHERE (purchase_price = 0 OR purchase_price IS NULL)
      AND id IN (SELECT DISTINCT item_id FROM purchase_items)
      LIMIT 10
    `).all();

   
    

    // Execute the migration SQL
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(path.join(__dirname, '..', 'migration-v22.sql'), 'utf8');
    
    // Execute only the UPDATE statement (skip comments and commented code)
    const updateSQL = migrationSQL.split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    db.exec(updateSQL);

    // Get counts after migration
    const itemsWithZeroPriceAfter = db.prepare(`
      SELECT COUNT(*) as count 
      FROM items 
      WHERE (purchase_price = 0 OR purchase_price IS NULL)
      AND id IN (SELECT DISTINCT item_id FROM purchase_items)
    `).get();

    const allItemsAfter = db.prepare(`
      SELECT i.id, i.name, i.purchase_price, 
             (SELECT unit_price FROM purchase_items pi 
              JOIN purchases p ON pi.purchase_id = p.id 
              WHERE pi.item_id = i.id 
              ORDER BY p.purchase_date DESC, p.created_at DESC 
              LIMIT 1) as latest_price
      FROM items i
      WHERE i.id IN (SELECT DISTINCT item_id FROM purchase_items)
      LIMIT 10
    `).all();

   
   
  });

  // Run the migration
  migrate();


  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
