const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Get database path
const appName = 'JSERP';
const dbDir = path.join(os.homedir(), 'AppData', 'Roaming', appName, 'database');
const dbPath = path.join(dbDir, 'erp-pro.db');


const db = new Database(dbPath);

try {
  
  // 1. Check items table
  const itemsWithPrice = db.prepare(`
    SELECT id, name, purchase_price, sale_price, stock_quantity 
    FROM items 
    WHERE stock_quantity > 0 OR id IN (SELECT DISTINCT item_id FROM sale_items)
    LIMIT 5
  `).all();
  console.table(itemsWithPrice);
  
  // 2. Check sale_items
  const saleItems = db.prepare(`
    SELECT si.id, si.item_id, si.item_name, si.quantity, si.unit_price as sale_price,
           i.purchase_price as item_purchase_price
    FROM sale_items si
    LEFT JOIN items i ON si.item_id = i.id
    LIMIT 5
  `).all();
  console.table(saleItems);
  
  // 3. Check COGS calculation
  const cogs = db.prepare(`
    SELECT 
      COUNT(DISTINCT si.id) as total_sale_items,
      COUNT(DISTINCT i.id) as items_found,
      SUM(si.quantity) as total_quantity_sold,
      SUM(si.quantity * COALESCE(i.purchase_price, 0)) as cogs,
      SUM(si.quantity * si.unit_price) as total_sales
    FROM sale_items si
    LEFT JOIN sales s ON si.sale_id = s.id
    LEFT JOIN items i ON si.item_id = i.id
  `).get();
  console.table([cogs]);
  
  // 4. Check items without purchase price
  const zeroPrice = db.prepare(`
    SELECT COUNT(*) as count
    FROM items
    WHERE (purchase_price = 0 OR purchase_price IS NULL)
    AND id IN (SELECT DISTINCT item_id FROM sale_items)
  `).get();
  
  // 5. Check purchase_items
  const purchaseItems = db.prepare(`
    SELECT pi.item_id, pi.item_name, pi.unit_price as purchase_price, pi.quantity,
           i.purchase_price as current_item_purchase_price
    FROM purchase_items pi
    LEFT JOIN items i ON pi.item_id = i.id
    LIMIT 5
  `).all();
  console.table(purchaseItems);
  
  // 6. Check if migration v22 ran
  const version = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
} finally {
  db.close();
}
