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
const backupPath = dbPath.replace('.db', `-backup-v20-${Date.now()}.db`);
fs.copyFileSync(dbPath, backupPath);

// Open database
const db = new Database(dbPath);

try {
  

  // Execute migration in a transaction
  const migrate = db.transaction(() => {
    // Get counts before migration
    const suppliersBefore = db.prepare('SELECT id, name, current_balance FROM suppliers').all();
    const customersBefore = db.prepare('SELECT id, name, current_balance FROM customers').all();

 

    // Execute the supplier balance update
    db.exec(`
      UPDATE suppliers
      SET current_balance = (
          COALESCE(opening_balance, 0) +
          COALESCE((
              SELECT SUM(total_amount) 
              FROM purchases 
              WHERE purchases.supplier_id = suppliers.id
          ), 0) -
          COALESCE((
              SELECT SUM(amount) 
              FROM payments 
              WHERE payments.supplier_id = suppliers.id 
              AND payments.payment_type = 'payment'
          ), 0)
      );
    `);

    db.exec(`
      UPDATE customers
      SET current_balance = (
          COALESCE(opening_balance, 0) +
          COALESCE((
              SELECT SUM(total_amount) 
              FROM sales 
              WHERE sales.customer_id = customers.id
          ), 0) -
          COALESCE((
              SELECT SUM(amount) 
              FROM payments 
              WHERE payments.customer_id = customers.id 
              AND payments.payment_type = 'receipt'
          ), 0)
      );
    `);

    // Get counts after migration
    const suppliersAfter = db.prepare('SELECT id, name, current_balance FROM suppliers').all();
    const customersAfter = db.prepare('SELECT id, name, current_balance FROM customers').all();

   

    // Show changes
    
    let supplierChanges = 0;
    suppliersBefore.forEach((before) => {
      const after = suppliersAfter.find(s => s.id === before.id);
      if (after && before.current_balance !== after.current_balance) {
        console.log(`   - ${before.name}: Rs ${before.current_balance} → Rs ${after.current_balance}`);
        supplierChanges++;
      }
    });
    
    let customerChanges = 0;
    customersBefore.forEach((before) => {
      const after = customersAfter.find(c => c.id === before.id);
      if (after && before.current_balance !== after.current_balance) {
        console.log(`   - ${before.name}: Rs ${before.current_balance} → Rs ${after.current_balance}`);
        customerChanges++;
      }
    });
  
  });

  migrate();

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error('\n🔄 Restoring backup...');
  db.close();
  fs.copyFileSync(backupPath, dbPath);
  process.exit(1);
}

db.close();
