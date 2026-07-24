const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Database path
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'JSERP', 'database', 'erp-pro.db');
console.log('Database path:', dbPath);

try {
    const db = new Database(dbPath);
    
    // Check current version
    const currentVersion = db.prepare('PRAGMA user_version').get();
    console.log('Current version:', currentVersion.user_version);
    
    // Check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='expense_categories'").get();
    
    if (tableExists) {
        console.log('Table already exists, checking records...');
        const count = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get();
        console.log('Current records:', count.count);
        
        if (count.count === 0) {
            console.log('Inserting default categories...');
        } else {
            console.log('Categories already exist');
            db.close();
            process.exit(0);
        }
    } else {
        console.log('Creating expense_categories table...');
        
        // Create table
        db.exec(`
            CREATE TABLE expense_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table created successfully');
    }
    
    // Insert default categories
    const insertCategory = db.prepare("INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES (?, ?, 'active')");
    
    const categories = [
        ['CAT-001', 'Utilities'],
        ['CAT-002', 'Rent'], 
        ['CAT-003', 'Salaries'],
        ['CAT-004', 'Transport'],
        ['CAT-005', 'Office Supplies'],
        ['CAT-006', 'Maintenance'],
        ['CAT-007', 'Marketing'],
        ['CAT-008', 'Insurance'],
        ['CAT-009', 'Taxes'],
        ['CAT-010', 'Other']
    ];
    
    for (const [id, name] of categories) {
        insertCategory.run(id, name);
    }
    
    // Update version
    if (currentVersion.user_version < 23) {
        db.prepare('PRAGMA user_version = 23').run();
        console.log('Updated version to 23');
    }
    
    // Verify
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get();
    const finalVersion = db.prepare('PRAGMA user_version').get();
    
    console.log(`SUCCESS: ${finalCount.count} categories inserted`);
    console.log(`Database version: ${finalVersion.user_version}`);
    
    db.close();
    
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}