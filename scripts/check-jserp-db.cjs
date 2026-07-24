const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Check JSERP database in AppData
const appDataPath = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const dbPath = path.join(appDataPath, 'JSERP', 'database', 'erp-pro.db');

console.log('📂 Checking database at:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database not found');
  process.exit(1);
}

const stat = fs.statSync(dbPath);
console.log(`📦 Database size: ${(stat.size / 1024).toFixed(2)} KB`);

try {
  const db = new Database(dbPath, { readonly: true });
  
  // Check version from _metadata table
  try {
    const result = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
    const version = result ? parseInt(result.value) : 0;
    console.log(`\n✅ Database version: ${version}`);
    
    if (version >= 24) {
      console.log('🎉 Migration v24 is available!');
    } else {
      console.log(`⚠️  Migration v24 not applied yet (current: v${version})`);
    }
    
    // Check if sale_items has profit columns
    const tableInfo = db.prepare(`PRAGMA table_info(sale_items)`).all();
    const hasPurchasePrice = tableInfo.some(col => col.name === 'purchase_price');
    const hasProfit = tableInfo.some(col => col.name === 'profit');
    
    console.log('\n📋 sale_items table columns:');
    tableInfo.forEach(col => {
      const highlight = (col.name === 'purchase_price' || col.name === 'profit') ? '⭐' : '  ';
      console.log(`${highlight} ${col.name} (${col.type})`);
    });
    
    console.log('\n🔍 Migration v24 status:');
    console.log(`  - purchase_price column: ${hasPurchasePrice ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - profit column: ${hasProfit ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (hasPurchasePrice && hasProfit) {
      console.log('\n🎉 SUCCESS! Migration v24 has been applied successfully!');
      console.log('📊 The system can now track profit/loss for each sale.');
    } else {
      console.log('\n⚠️  Migration v24 not fully applied. Columns missing.');
    }
    
  } catch (err) {
    console.log('❌ Could not read database:', err.message);
  }
  
  db.close();
} catch (error) {
  console.error('❌ Error opening database:', error.message);
  process.exit(1);
}
