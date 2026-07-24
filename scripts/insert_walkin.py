import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'JSERP', 'database', 'erp-pro.db')
print('DB path:', db_path)

if not os.path.exists(db_path):
    print('ERROR: Database not found at', db_path)
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check existing
cur.execute("SELECT id, name, status FROM customers WHERE id='1'")
existing = cur.fetchone()
print('Existing Walk-in Customer:', existing)

# Insert or update
cur.execute("""
    INSERT OR IGNORE INTO customers
        (id, name, name_urdu, opening_balance, current_balance, status, notes)
    VALUES
        ('1', 'Walk-in Customer', '\u0648\u0627\u06a9 \u0627\u0650\u0646 \u06a9\u0633\u0679\u0645\u0631', 0, 0, 'active',
         'Default customer for walk-in sales')
""")
conn.commit()

# Verify
cur.execute("SELECT id, name, status FROM customers WHERE id='1'")
result = cur.fetchone()
print('Walk-in Customer now:', result)

# Show all customers
cur.execute('SELECT id, name, status FROM customers ORDER BY created_at DESC')
rows = cur.fetchall()
print('\nAll customers in database:')
for row in rows:
    print('  [{}] {} ({})'.format(row[0], row[1], row[2]))

conn.close()
print('\nDone! Refresh the Customers page in the app.')
