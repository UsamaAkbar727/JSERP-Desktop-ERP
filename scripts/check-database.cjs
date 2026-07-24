/**
 * Database Checker Script
 * Checks if the licenses table exists and shows database info
 */

const Database = require('better-sqlite3');
const { join } = require('path');
const { existsSync } = require('fs');
const { app } = require('electron');

// For running outside electron context
let userDataPath;
try {
  userDataPath = app.getPath('userData');
} catch (e) {
  // Fallback for running outside electron
  userDataPath = join(process.env.APPDATA || process.env.HOME, 'erp-pro');
}

const dbPath = join(userDataPath, 'database', 'erp-pro.db');


// Check if database file exists
if (!existsSync(dbPath)) {
  console.error('Database file does not exist. The application nees to be started at least once to create the database.');
  process.exit(1);
}


try {
  // Open database
  const db = new Database(dbPath, { readonly: true });

  // Get current version
  let version = 0;
  try {
    const result = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
    version = result ? parseInt(result.value, 10) : 0;
  } catch (e) {
    console.error('⚠️  Could not read version (metadata table may not exist)');
  }


  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

 
  tables.forEach((table, index) => {
    const icon = table.name === 'licenses' ? '✅' : '  ';
  });


  // Check specifically for licenses table
  const licensesTable = tables.find(t => t.name === 'licenses');
  
  if (licensesTable) {
  
    // Get table schema
    const schema = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='licenses'
    `).get();
    
   
    // Count rows
    const count = db.prepare(`SELECT COUNT(*) as count FROM licenses`).get();
    
    // Show licenses if any
    if (count.count > 0) {
      const licenses = db.prepare(`
        SELECT id, license_key, status, activation_date, expiry_date 
        FROM licenses
      `).all();
      
     
      
    }
  } 

  db.close();


} catch (error) {
  console.error('❌ Error checking database:', error.message);
  process.exit(1);
}
