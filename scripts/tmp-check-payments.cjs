const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA || '', 'JSERP', 'database', 'erp-pro.db');
const db = new Database(dbPath, { readonly: true });

const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'").get();
const version = db.prepare("SELECT value FROM _metadata WHERE key='version'").get();

console.log('dbPath', dbPath);
console.log('version', version && version.value);
console.log('payments_sql', row && row.sql);

const sample = db.prepare("SELECT payment_method, COUNT(*) as count FROM payments GROUP BY payment_method").all();
console.log('payment_methods', sample);

db.close();
