/**
 * Check Database Migration Status
 * Run with: node scripts/check-migration.cjs
 */

const Database = require('better-sqlite3');
const { join } = require('path');
const { app } = require('electron');

// Electron app isn't available in script context, so we use env var or hardcoded path
const userDataPath = process.env.APPDATA || join(require('os').homedir(), 'AppData', 'Roaming');
const dbPath = join(userDataPath, 'erp-pro-desktop', 'database', 'erp-pro.db');


try {
  const db = new Database(dbPath, { readonly: true });
  
  // Get current version
  const version = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
  
  // Check transactions table schema
  const tableInfo = db.prepare(`PRAGMA table_info(transactions)`).all();
  tableInfo.forEach(col => {
  });
  
  // Try to get the CHECK constraint
  const createTableSQL = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'`).get();

  
  // Check if 'expense' is in the constraint
 
  
  db.close();
} catch (error) {
  console.error('❌ Error checking database:', error.message);
}
