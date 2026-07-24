const db = require('better-sqlite3')('erp.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='invoice_number_formats'").all();
console.log('Table exists:', tables.length > 0);
if(tables.length > 0) {
  const formats = db.prepare('SELECT * FROM invoice_number_formats').all();
  console.log('Formats:', JSON.stringify(formats, null, 2));
}
db.close();
