const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const appDataPath = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
const dbPath = path.join(appDataPath, 'JSERP', 'database', 'erp-pro.db');

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const hasMetadata = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_metadata'").get();
  if (!hasMetadata) {
    throw new Error('Missing _metadata table. Database is not initialized correctly.');
  }

  const currentVersionRow = db.prepare("SELECT value FROM _metadata WHERE key='version'").get();
  const currentVersion = currentVersionRow ? parseInt(currentVersionRow.value, 10) : 0;
  console.log(`📌 Current version: ${currentVersion}`);

  const tableInfo = db.prepare('PRAGMA table_info(sale_items)').all();
  const hasPurchasePrice = tableInfo.some((c) => c.name === 'purchase_price');
  const hasProfit = tableInfo.some((c) => c.name === 'profit');

  const migrate = db.transaction(() => {
    if (!hasPurchasePrice) {
      db.exec('ALTER TABLE sale_items ADD COLUMN purchase_price REAL DEFAULT 0');
      console.log('✅ Added purchase_price column');
    }

    if (!hasProfit) {
      db.exec('ALTER TABLE sale_items ADD COLUMN profit REAL DEFAULT 0');
      console.log('✅ Added profit column');
    }

    db.exec(`
      UPDATE sale_items
      SET purchase_price = (
        SELECT items.purchase_price
        FROM items
        WHERE items.id = sale_items.item_id
      )
      WHERE item_id IN (SELECT id FROM items)
        AND (purchase_price IS NULL OR purchase_price = 0)
    `);

    db.exec(`
      UPDATE sale_items
      SET profit = (unit_price - purchase_price) * quantity
      WHERE purchase_price IS NOT NULL
    `);

    db.prepare(`
      UPDATE _metadata
      SET value = ?, updated_at = datetime('now')
      WHERE key = 'version' AND CAST(value AS INTEGER) < ?
    `).run('24', 24);
  });

  migrate();

  const versionAfter = db.prepare("SELECT value FROM _metadata WHERE key='version'").get();
  const updatedVersion = versionAfter ? parseInt(versionAfter.value, 10) : 0;

  const columnsAfter = db.prepare('PRAGMA table_info(sale_items)').all();
  const okPurchase = columnsAfter.some((c) => c.name === 'purchase_price');
  const okProfit = columnsAfter.some((c) => c.name === 'profit');

  console.log(`📌 Updated version: ${updatedVersion}`);
  console.log(`🔎 purchase_price: ${okPurchase ? 'OK' : 'MISSING'}`);
  console.log(`🔎 profit: ${okProfit ? 'OK' : 'MISSING'}`);

  if (updatedVersion >= 24 && okPurchase && okProfit) {
    console.log('🎉 Migration v24 applied successfully');
  } else {
    throw new Error('Migration verification failed');
  }
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
