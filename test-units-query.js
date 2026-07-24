// Quick test script to check units in database
const Database = require('better-sqlite3');
const path = require('path');

// Database path (adjust if needed)
const dbPath = path.join(__dirname, 'erp-database.db');

try {
  const db = new Database(dbPath);
  
  
  // Get all units
  const units = db.prepare('SELECT * FROM units').all();
  
  
  db.close();
} catch (error) {
  console.error('❌ Error:', error.message);
}
