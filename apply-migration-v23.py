import sqlite3
import os

# Database path
db_path = os.path.join(os.environ['APPDATA'], 'JSERP', 'database', 'erp-pro.db')

print(f"Database path: {db_path}")

if not os.path.exists(db_path):
    print(f"ERROR: Database not found at {db_path}")
    exit(1)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check current version
    cursor.execute("PRAGMA user_version")
    current_version = cursor.fetchone()[0]
    print(f"Current database version: {current_version}")
    
    # Check if table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='expense_categories'")
    table_exists = cursor.fetchone() is not None
    
    if table_exists:
        print("Table 'expense_categories' already exists!")
        cursor.execute("SELECT COUNT(*) FROM expense_categories")
        count = cursor.fetchone()[0]
        print(f"Current records: {count}")
        
        if count == 0:
            print("Table is empty, inserting default categories...")
            # Insert default categories
            categories = [
                ('CAT-001', 'Utilities'),
                ('CAT-002', 'Rent'),
                ('CAT-003', 'Salaries'),
                ('CAT-004', 'Transport'),
                ('CAT-005', 'Office Supplies'),
                ('CAT-006', 'Maintenance'),
                ('CAT-007', 'Marketing'),
                ('CAT-008', 'Insurance'),
                ('CAT-009', 'Taxes'),
                ('CAT-010', 'Other')
            ]
            
            for cat_id, cat_name in categories:
                cursor.execute(
                    "INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES (?, ?, 'active')",
                    (cat_id, cat_name)
                )
            
            conn.commit()
            print("Default categories inserted!")
        else:
            print("Categories already exist:")
            cursor.execute("SELECT id, name FROM expense_categories LIMIT 5")
            for row in cursor.fetchall():
                print(f"  - {row[0]}: {row[1]}")
    else:
        print("Creating expense_categories table...")
        
        # Create table
        cursor.execute("""
            CREATE TABLE expense_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert default categories
        categories = [
            ('CAT-001', 'Utilities'),
            ('CAT-002', 'Rent'),
            ('CAT-003', 'Salaries'),
            ('CAT-004', 'Transport'),
            ('CAT-005', 'Office Supplies'),
            ('CAT-006', 'Maintenance'),
            ('CAT-007', 'Marketing'),
            ('CAT-008', 'Insurance'),
            ('CAT-009', 'Taxes'),
            ('CAT-010', 'Other')
        ]
        
        for cat_id, cat_name in categories:
            cursor.execute(
                "INSERT INTO expense_categories (id, name, status) VALUES (?, ?, 'active')",
                (cat_id, cat_name)
            )
        
        # Update version to 23 if it's less
        if current_version < 23:
            cursor.execute("PRAGMA user_version = 23")
            print("Updated database version to 23")
        
        conn.commit()
        print("SUCCESS: Table created and categories inserted!")
        
    # Final verification
    cursor.execute("SELECT COUNT(*) FROM expense_categories")
    final_count = cursor.fetchone()[0]
    print(f"\nFinal verification: {final_count} categories in database")
    
    cursor.execute("PRAGMA user_version")
    final_version = cursor.fetchone()[0]
    print(f"Database version: {final_version}")
    
except Exception as e:
    print(f"ERROR: {e}")
    conn.rollback()
    exit(1)
finally:
    conn.close()

print("\nMigration completed successfully!")
