/**
 * Check Users in Database
 * Direct database inspection to see users table state
 */

const Database = require('better-sqlite3');
const { join } = require('path');
const { existsSync } = require('fs');
const { app } = require('electron');

// Get database path
let userDataPath;
try {
  userDataPath = app.getPath('userData');
} catch (e) {
  // Fallback - use APPDATA
  userDataPath = join(process.env.APPDATA || process.env.HOME, 'erp-pro');
}

const dbPath = join(userDataPath, 'database', 'erp-pro.db');



if (!existsSync(dbPath)) {

  process.exit(1);
}

try {
  const db = new Database(dbPath);
  
  // Check if users table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='users';
  `).get();
  
  if (!tableExists) {
    process.exit(1);
  }
  
  // Check table schema
  const schema = db.prepare(`PRAGMA table_info(users);`).all();
  
  
  // Check table size
  const tableSize = db.prepare(`SELECT COUNT(*) as count FROM users;`).get();

  
  if (tableSize.count > 0) {
    const users = db.prepare(`SELECT * FROM users;`).all();
   
  } else {
    console.error('⚠️  No users in database');
  }
  
  
  // Check sqlite_sequence
  const sequences = db.prepare(`SELECT * FROM sqlite_sequence;`).all();
  if (sequences.length === 0) {
    console.error('   ⚠️  No sequences found!');
  } 
  
  db.close();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
