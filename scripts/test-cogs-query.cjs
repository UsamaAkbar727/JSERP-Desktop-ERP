const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Get database path
const appName = 'JSERP';
const dbDir = path.join(os.homedir(), 'AppData', 'Roaming', appName, 'database');
const dbPath = path.join(dbDir, 'erp-pro.db');


const db = new Database(dbPath);

try {
  // Test the exact query that backend should use
  const startDate = '2020-01-01';
  const endDate = '2030-12-31';
  
  
  const cogsQuery = `
    SELECT 
      COALESCE(SUM(si.quantity * i.purchase_price), 0) as cogs
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN items i ON si.item_id = i.id
    WHERE s.sale_date >= ? AND s.sale_date <= ?
  `;
  
  const result = db.prepare(cogsQuery).get(startDate, endDate);
  
  const salesQuery = `
    SELECT 
      COUNT(*) as total_sales,
      COALESCE(SUM(total_amount), 0) as total_amount,
      COALESCE(SUM(paid_amount), 0) as total_paid
    FROM sales
    WHERE sale_date >= ? AND sale_date <= ?
  `;
  const salesResult = db.prepare(salesQuery).get(startDate, endDate);
  console.table([salesResult]);
  
  // Simulate the full P&L report
  const revenue = salesResult.total_amount;
  const cogs = result.cogs;
  const expenses = 200; // from your data
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;
  
 
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
} finally {
  db.close();
}
