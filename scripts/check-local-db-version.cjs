const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Check local database (development)
const localDbPath = path.join(__dirname, '..', 'erp.db');

if (!fs.existsSync(localDbPath)) {
  console.log('❌ Local database not found at:', localDbPath);
  process.exit(1);
}

try {
  const db = new Database(localDbPath, { readonly: true });
  
  // Check version from _metadata table
  try {
    const result = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
    console.log('✅ Database version:', result ? result.value : 'Unknown');
    
    // Check if sale_items has profit columns
    const tableInfo = db.prepare(`PRAGMA table_info(sale_items)`).all();
    const hasPurchasePrice = tableInfo.some(col => col.name === 'purchase_price');
    const hasProfit = tableInfo.some(col => col.name === 'profit');
    
    console.log('\n📋 sale_items table structure:');
    console.log('  - purchase_price column:', hasPurchasePrice ? '✅ EXISTS' : '❌ MISSING');
    console.log('  - profit column:', hasProfit ? '✅ EXISTS' : '❌ MISSING');
    
    if (hasPurchasePrice && hasProfit) {
      console.log('\n✅ Migration v24 successfully applied!');
    } else {
      console.log('\n⚠️  Migration v24 columns not found. Migration may not have been applied.');
    }
    
  } catch (err) {
    console.log('❌ Could not read version:', err.message);
  }
  
  db.close();
} catch (error) {
  console.error('❌ Error opening database:', error.message);
  process.exit(1);
}
