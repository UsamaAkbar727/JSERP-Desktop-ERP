const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Get database path
const appName = 'JSERP';
const dbDir = path.join(os.homedir(), 'AppData', 'Roaming', appName, 'database');
const dbPath = path.join(dbDir, 'erp-pro.db');


const db = new Database(dbPath);

try {
  // Check current version
  const currentVersion = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
  
  if (currentVersion?.value === '21') {
    db.prepare(`UPDATE _metadata SET value = '22', updated_at = datetime('now') WHERE key = 'version'`).run();
    
    const newVersion = db.prepare(`SELECT value FROM _metadata WHERE key = 'version'`).get();
  } else if (currentVersion?.value === '22') {
    console.log('✅ Database already at version 22');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
