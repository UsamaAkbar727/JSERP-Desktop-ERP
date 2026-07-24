import type { Migration } from './types';
import type Database from 'better-sqlite3';

/**
 * Database Migrations
 * Add new migrations to this array to upgrade the database schema
 */
export const migrations: Migration[] = [
    {
        version: 1,
        name: 'initial_schema',
        up: (db: Database.Database) => {
            // Create metadata table
            db.exec(`
        CREATE TABLE IF NOT EXISTS _metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Insert initial version
            db.prepare(`
        INSERT OR REPLACE INTO _metadata (key, value, updated_at)
        VALUES ('version', '1', datetime('now'))
      `).run();

            db.prepare(`
        INSERT OR REPLACE INTO _metadata (key, value, updated_at)
        VALUES ('created_at', datetime('now'), datetime('now'))
      `).run();

            // Create sample users table (customize as needed)
            db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          full_name TEXT,
          role TEXT DEFAULT 'user',
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Create sample settings table
            db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          description TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Create audit log table
            db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          table_name TEXT,
          record_id INTEGER,
          changes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

            // Create indexes
            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DROP TABLE IF EXISTS audit_log;
        DROP TABLE IF EXISTS settings;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS _metadata;
      `);
        }
    },

    // Version 2: Core ERP Tables (accounts, customers, suppliers, units, items)
    {
        version: 2,
        name: 'create_core_erp_tables',
        up: (db: Database.Database) => {
            // Accounts table
            db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          account_name TEXT NOT NULL,
          account_type TEXT NOT NULL CHECK(account_type IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom')),
          account_number TEXT,
          bank_name TEXT,
          opening_balance REAL DEFAULT 0,
          current_balance REAL DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Customers table
            db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          name_urdu TEXT,
          email TEXT,
          phone TEXT,
          address TEXT,
          city TEXT,
          opening_balance REAL DEFAULT 0,
          current_balance REAL DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Suppliers table
            db.exec(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          name_urdu TEXT,
          email TEXT,
          phone TEXT,
          address TEXT,
          city TEXT,
          opening_balance REAL DEFAULT 0,
          current_balance REAL DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Units table
            db.exec(`
        CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          name_urdu TEXT,
          symbol TEXT NOT NULL,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Items table
            db.exec(`
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          name_urdu TEXT,
          sku TEXT,
          description TEXT,
          sale_price REAL DEFAULT 0,
          purchase_price REAL DEFAULT 0,
          opening_stock REAL DEFAULT 0,
          stock_quantity REAL DEFAULT 0,
          low_stock_threshold REAL DEFAULT 0,
          unit_id TEXT NOT NULL,
          unit TEXT NOT NULL,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
        );
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DROP TABLE IF EXISTS items;
        DROP TABLE IF EXISTS units;
        DROP TABLE IF EXISTS suppliers;
        DROP TABLE IF EXISTS customers;
        DROP TABLE IF EXISTS accounts;
      `);
        }
    },

    // Version 3: Transaction Tables (sales, purchases, payments, expenses)
    {
        version: 3,
        name: 'create_transaction_tables',
        up: (db: Database.Database) => {
            // Sales table
            db.exec(`
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          invoice_number TEXT UNIQUE NOT NULL,
          customer_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          sale_date TEXT NOT NULL,
          subtotal REAL DEFAULT 0,
          discount_amount REAL DEFAULT 0,
          discount_percent REAL DEFAULT 0,
          total_amount REAL NOT NULL,
          paid_amount REAL DEFAULT 0,
          due_amount REAL DEFAULT 0,
          payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
          payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
          account_id TEXT,
          cheque_account_id TEXT,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
        );
      `);

            // Sale Items table
            db.exec(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id TEXT PRIMARY KEY,
          sale_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_name TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          unit TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT
        );
      `);

            // Purchases table
            db.exec(`
        CREATE TABLE IF NOT EXISTS purchases (
          id TEXT PRIMARY KEY,
          bill_number TEXT UNIQUE NOT NULL,
          supplier_id TEXT NOT NULL,
          supplier_name TEXT NOT NULL,
          purchase_date TEXT NOT NULL,
          subtotal REAL DEFAULT 0,
          discount_amount REAL DEFAULT 0,
          discount_percent REAL DEFAULT 0,
          total_amount REAL NOT NULL,
          paid_amount REAL DEFAULT 0,
          due_amount REAL DEFAULT 0,
          payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
          payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
          account_id TEXT,
          cheque_account_id TEXT,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
        );
      `);

            // Purchase Items table
            db.exec(`
        CREATE TABLE IF NOT EXISTS purchase_items (
          id TEXT PRIMARY KEY,
          purchase_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_name TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          unit TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT
        );
      `);

            // Payments table
            db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          payment_type TEXT NOT NULL CHECK(payment_type IN ('receipt', 'payment')),
          payment_date TEXT NOT NULL,
          customer_id TEXT,
          supplier_id TEXT,
          sale_id TEXT,
          purchase_id TEXT,
          account_id TEXT NOT NULL,
          account_name TEXT NOT NULL,
          payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
          cheque_account_id TEXT,
          cheque_number TEXT,
          amount REAL NOT NULL,
          reference_number TEXT,
          notes TEXT,
          is_full_payment INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
          FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
          FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
        );
      `);

            // Expenses table
            db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          account_id TEXT NOT NULL,
          account_name TEXT NOT NULL,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
        );
      `);

            // Transactions table (ledger entries)
            db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          transaction_date TEXT NOT NULL,
          reference_type TEXT NOT NULL CHECK(reference_type IN ('sale', 'purchase', 'customer_payment', 'supplier_payment')),
          reference_id TEXT NOT NULL,
          account_id TEXT,
          customer_id TEXT,
          supplier_id TEXT,
          direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
          amount REAL NOT NULL,
          balance_after REAL,
          description TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
        );
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DROP TABLE IF EXISTS transactions;
        DROP TABLE IF EXISTS expenses;
        DROP TABLE IF EXISTS payments;
        DROP TABLE IF EXISTS purchase_items;
        DROP TABLE IF EXISTS purchases;
        DROP TABLE IF EXISTS sale_items;
        DROP TABLE IF EXISTS sales;
      `);
        }
    },

    // Version 4: Settings and License Tables
    {
        version: 4,
        name: 'create_settings_and_license_tables',
        up: (db: Database.Database) => {
            // Update users table from v1 to match ERP requirements
            db.exec(`
        DROP TABLE IF EXISTS users;
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          language_preference TEXT DEFAULT 'en' CHECK(language_preference IN ('en', 'ur')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Update settings table to be a pure key-value store
            db.exec(`
        DROP TABLE IF EXISTS settings;
        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // License table for app licensing
            db.exec(`
        CREATE TABLE IF NOT EXISTS license (
          id INTEGER PRIMARY KEY CHECK(id = 1),
          license_key TEXT UNIQUE,
          activated_at TEXT,
          expires_at TEXT,
          status TEXT DEFAULT 'trial' CHECK(status IN ('trial', 'active', 'expired', 'invalid')),
          hardware_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Insert default license record
            db.exec(`
        INSERT OR IGNORE INTO license (id, status) VALUES (1, 'trial');
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DROP TABLE IF EXISTS license;
      `);
        }
    },

    // Version 5: Goods Module Tables
    {
        version: 5,
        name: 'create_goods_module_tables',
        up: (db: Database.Database) => {
            // Riders table
            db.exec(`
        CREATE TABLE IF NOT EXISTS riders (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          name_urdu TEXT,
          phone TEXT,
          email TEXT,
          vehicle_number TEXT,
          vehicle_type TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Goods Tasks table (delivery tracking)
            db.exec(`
        CREATE TABLE IF NOT EXISTS goods_tasks (
          id TEXT PRIMARY KEY,
          task_number TEXT UNIQUE NOT NULL,
          task_date TEXT NOT NULL,
          rider_id TEXT NOT NULL,
          rider_name TEXT NOT NULL,
          customer_id TEXT,
          customer_name TEXT,
          sale_id TEXT,
          invoice_number TEXT,
          pickup_address TEXT,
          delivery_address TEXT NOT NULL,
          description TEXT,
          amount REAL DEFAULT 0,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
          priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
          assigned_at TEXT,
          started_at TEXT,
          completed_at TEXT,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE RESTRICT,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
        );
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DROP TABLE IF EXISTS goods_tasks;
        DROP TABLE IF EXISTS riders;
      `);
        }
    },

    // Version 6: Performance Indexes
    {
        version: 6,
        name: 'create_performance_indexes',
        up: (db: Database.Database) => {
            db.exec(`
        -- Customer indexes
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
        CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
        CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(current_balance);

        -- Supplier indexes
        CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
        CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
        CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
        CREATE INDEX IF NOT EXISTS idx_suppliers_balance ON suppliers(current_balance);

        -- Items indexes
        CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
        CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
        CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
        CREATE INDEX IF NOT EXISTS idx_items_unit_id ON items(unit_id);

        -- Sales indexes
        CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
        CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
        CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
        CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

        -- Sale items indexes
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);

        -- Purchases indexes
        CREATE INDEX IF NOT EXISTS idx_purchases_bill_number ON purchases(bill_number);
        CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
        CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);
        CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

        -- Purchase items indexes
        CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
        CREATE INDEX IF NOT EXISTS idx_purchase_items_item_id ON purchase_items(item_id);

        -- Payments indexes
        CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
        CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
        CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
        CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
        CREATE INDEX IF NOT EXISTS idx_payments_purchase_id ON payments(purchase_id);
        CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);

        -- Expenses indexes
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
        CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON expenses(account_id);

        -- Transactions indexes
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_reference_type ON transactions(reference_type);
        CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON transactions(supplier_id);

        -- Goods tasks indexes
        CREATE INDEX IF NOT EXISTS idx_goods_tasks_task_number ON goods_tasks(task_number);
        CREATE INDEX IF NOT EXISTS idx_goods_tasks_rider_id ON goods_tasks(rider_id);
        CREATE INDEX IF NOT EXISTS idx_goods_tasks_customer_id ON goods_tasks(customer_id);
        CREATE INDEX IF NOT EXISTS idx_goods_tasks_sale_id ON goods_tasks(sale_id);
        CREATE INDEX IF NOT EXISTS idx_goods_tasks_status ON goods_tasks(status);
        CREATE INDEX IF NOT EXISTS idx_goods_tasks_task_date ON goods_tasks(task_date);

        -- Accounts indexes
        CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
        CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DROP INDEX IF EXISTS idx_customers_name;
        DROP INDEX IF EXISTS idx_customers_phone;
        DROP INDEX IF EXISTS idx_customers_status;
        DROP INDEX IF EXISTS idx_customers_balance;
        DROP INDEX IF EXISTS idx_suppliers_name;
        DROP INDEX IF EXISTS idx_suppliers_phone;
        DROP INDEX IF EXISTS idx_suppliers_status;
        DROP INDEX IF EXISTS idx_suppliers_balance;
        DROP INDEX IF EXISTS idx_items_name;
        DROP INDEX IF EXISTS idx_items_sku;
        DROP INDEX IF EXISTS idx_items_status;
        DROP INDEX IF EXISTS idx_items_unit_id;
        DROP INDEX IF EXISTS idx_sales_invoice_number;
        DROP INDEX IF EXISTS idx_sales_customer_id;
        DROP INDEX IF EXISTS idx_sales_sale_date;
        DROP INDEX IF EXISTS idx_sales_payment_status;
        DROP INDEX IF EXISTS idx_sales_created_at;
        DROP INDEX IF EXISTS idx_sale_items_sale_id;
        DROP INDEX IF EXISTS idx_sale_items_item_id;
        DROP INDEX IF EXISTS idx_purchases_bill_number;
        DROP INDEX IF EXISTS idx_purchases_supplier_id;
        DROP INDEX IF EXISTS idx_purchases_purchase_date;
        DROP INDEX IF EXISTS idx_purchases_payment_status;
        DROP INDEX IF EXISTS idx_purchases_created_at;
        DROP INDEX IF EXISTS idx_purchase_items_purchase_id;
        DROP INDEX IF EXISTS idx_purchase_items_item_id;
        DROP INDEX IF EXISTS idx_payments_payment_type;
        DROP INDEX IF EXISTS idx_payments_payment_date;
        DROP INDEX IF EXISTS idx_payments_customer_id;
        DROP INDEX IF EXISTS idx_payments_supplier_id;
        DROP INDEX IF EXISTS idx_payments_sale_id;
        DROP INDEX IF EXISTS idx_payments_purchase_id;
        DROP INDEX IF EXISTS idx_payments_account_id;
        DROP INDEX IF EXISTS idx_expenses_date;
        DROP INDEX IF EXISTS idx_expenses_category;
        DROP INDEX IF EXISTS idx_expenses_account_id;
        DROP INDEX IF EXISTS idx_transactions_date;
        DROP INDEX IF EXISTS idx_transactions_reference_type;
        DROP INDEX IF EXISTS idx_transactions_reference_id;
        DROP INDEX IF EXISTS idx_transactions_account_id;
        DROP INDEX IF EXISTS idx_transactions_customer_id;
        DROP INDEX IF EXISTS idx_transactions_supplier_id;
        DROP INDEX IF EXISTS idx_goods_tasks_task_number;
        DROP INDEX IF EXISTS idx_goods_tasks_rider_id;
        DROP INDEX IF EXISTS idx_goods_tasks_customer_id;
        DROP INDEX IF EXISTS idx_goods_tasks_sale_id;
        DROP INDEX IF EXISTS idx_goods_tasks_status;
        DROP INDEX IF EXISTS idx_goods_tasks_task_date;
        DROP INDEX IF EXISTS idx_accounts_type;
        DROP INDEX IF EXISTS idx_accounts_status;
      `);
        }
    },

    // Version 7: Seed Default Data
    {
        version: 7,
        name: 'seed_default_data',
        up: (db: Database.Database) => {
            // Default Cash Account - only if Cash account doesn't exist
            // This preserves existing accounts and their balances during restore
            // IMPORTANT: Check by account_name to prevent duplicate Cash accounts
            const cashAccount = db.prepare("SELECT id, account_name, current_balance FROM accounts WHERE account_name = 'Cash' OR (account_type = 'cash' AND account_name LIKE '%Cash%')").get() as { id: string; account_name: string; current_balance: number } | undefined;
            
            if (!cashAccount) {
                // No Cash account exists, create default one
                db.exec(`
                    INSERT INTO accounts (id, account_name, account_type, opening_balance, current_balance, status)
                    VALUES ('1', 'Cash', 'cash', 0, 0, 'active');
                `);
                console.log('✅ Migration v7: Created default Cash account');
            } else {
                console.log(`ℹ️  Migration v7: Cash account already exists (ID: ${cashAccount.id}, Balance: ${cashAccount.current_balance}) - skipping creation`);
                
                // Log existing accounts for troubleshooting
                const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
                console.log(`   Total accounts in database: ${accountCount.count}`);
            }

            // Default Units
            const units = [
                { id: '1', name: 'Piece', nameUrdu: '+�+�+�', symbol: 'pcs' },
                { id: '2', name: 'Kilogram', nameUrdu: '+�+�+�+�+�+�+�', symbol: 'kg' },
                { id: '3', name: 'Gram', nameUrdu: '+�+�+�+�', symbol: 'g' },
                { id: '4', name: 'Meter', nameUrdu: '+��+�+�', symbol: 'm' },
                { id: '5', name: 'Liter', nameUrdu: '+��+�+�', symbol: 'L' },
                { id: '6', name: 'Box', nameUrdu: '+�+���', symbol: 'box' },
                { id: '7', name: 'Dozen', nameUrdu: '+�+�+�+�', symbol: 'dz' },
                { id: '8', name: 'Carton', nameUrdu: '+�+�+�+�+�', symbol: 'ctn' },
                { id: '9', name: 'Packet', nameUrdu: '++��+�+�', symbol: 'pkt' },
                { id: '10', name: 'Pair', nameUrdu: '+�+�+�+�', symbol: 'pr' }
            ];

            const insertUnit = db.prepare(`
        INSERT OR IGNORE INTO units (id, name, name_urdu, symbol, status)
        VALUES (?, ?, ?, ?, 'active')
      `);

            for (const unit of units) {
                insertUnit.run(unit.id, unit.name, unit.nameUrdu, unit.symbol);
            }

            // Default Expense Categories (stored in settings)
            const expenseCategories = [
                'Utilities', 'Rent', 'Salaries', 'Transport',
                'Office Supplies', 'Maintenance', 'Marketing',
                'Insurance', 'Taxes', 'Other'
            ];

            db.exec(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('expense_categories', '${JSON.stringify(expenseCategories)}');
      `);

            // Default app settings
            db.exec(`
        INSERT OR REPLACE INTO settings (key, value) VALUES
          ('app_name', 'JSERP'),
          ('currency', 'PKR'),
          ('currency_symbol', 'Rs.'),
          ('language', 'en'),
          ('date_format', 'YYYY-MM-DD'),
          ('invoice_prefix', 'INV-'),
          ('purchase_prefix', 'PUR-'),
          ('task_prefix', 'TSK-');
      `);

            // Menu visibility settings (all visible by default)
            const menuSettings = {
                dashboard: true,
                pos: true,
                customers: true,
                suppliers: true,
                items: true,
                sales: true,
                purchases: true,
                expenses: true,
                accounts: true,
                reports: true,
                goods: true
            };

            db.exec(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('menu_visibility', '${JSON.stringify(menuSettings)}');
      `);

            // Customer form settings (all hidden by default except required fields)
            const customerFormSettings = {
                showEmail: false,
                showPhone: false,
                showAddress: false,
                showCity: false,
                showStatus: false,
                showNotes: false
            };

            db.exec(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('customer_form_settings', '${JSON.stringify(customerFormSettings)}');
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DELETE FROM settings WHERE key IN (
          'expense_categories', 'app_name', 'currency', 'currency_symbol',
          'language', 'date_format', 'invoice_prefix', 'purchase_prefix',
          'task_prefix', 'menu_visibility', 'customer_form_settings'
        );
        DELETE FROM units WHERE id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10');
        DELETE FROM customers WHERE id = '1';
        DELETE FROM accounts WHERE id = '1';
      `);
        }
    },
    
    // Version 8: License Management System
    {
        version: 8,
        name: 'create_licenses_table',
        up: (db: Database.Database) => {
            // Drop old license table if exists
            db.exec(`DROP TABLE IF EXISTS license`);
            
            // Create new licenses table (plural)
            db.exec(`
        CREATE TABLE IF NOT EXISTS licenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          license_key TEXT UNIQUE NOT NULL,
          customer_name TEXT,
          customer_email TEXT,
          hardware_id TEXT,
          activation_date TEXT DEFAULT (datetime('now')),
          expiry_date TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'revoked', 'suspended')),
          last_verified TEXT,
          metadata TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);

            // Create indexes for licenses table
            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
        CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
        CREATE INDEX IF NOT EXISTS idx_licenses_hardware ON licenses(hardware_id);
      `);

            // Create trigger for automatic timestamp update
            db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_licenses_timestamp 
        AFTER UPDATE ON licenses
        BEGIN
            UPDATE licenses SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DROP TRIGGER IF EXISTS update_licenses_timestamp;
        DROP INDEX IF EXISTS idx_licenses_hardware;
        DROP INDEX IF EXISTS idx_licenses_status;
        DROP INDEX IF EXISTS idx_licenses_key;
        DROP TABLE IF EXISTS licenses;
      `);
        }
    },

    // Version 9: Users Authentication
    {
        version: 9,
        name: 'users_authentication_fields',
        up: (db: Database.Database) => {
            // Always drop and recreate users table to ensure correct schema
            try {
                db.exec(`DROP TABLE IF EXISTS users;`);
            } catch (error) {
                console.error('G��n+�  Users table may not exist:', error);
            }
            
            // Drop indexes if they exist
            try {
                db.exec(`
        DROP INDEX IF EXISTS idx_users_active;
        DROP INDEX IF EXISTS idx_users_role;
        DROP INDEX IF EXISTS idx_users_email;
      `);
            } catch (error) {
                console.error('G��n+�  Indexes may not exist:', error);
            }
            
            // Create new users table with auth fields - correct schema with all three roles
            db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Create indexes
            db.exec(`
        CREATE UNIQUE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_role ON users(role);
        CREATE INDEX idx_users_active ON users(active);
      `);

        },
        down: (db: Database.Database) => {
            db.exec(`
        DROP INDEX IF EXISTS idx_users_active;
        DROP INDEX IF EXISTS idx_users_role;
        DROP INDEX IF EXISTS idx_users_email;
        DROP TABLE IF EXISTS users;
      `);
        }
    },

    // Version 10: Fix users table constraint (ensure super_admin role is included)
    {
        version: 10,
        name: 'fix_users_table_constraint',
        up: (db: Database.Database) => {
            try {
                // Check if users table exists and has the old constraint
                const checkTable = db.prepare(`
          SELECT sql FROM sqlite_master 
          WHERE type='table' AND name='users'
        `).get() as { sql: string } | undefined;

                if (checkTable && !checkTable.sql.includes("'super_admin'")) {
                    
                    // Backup existing data
                    db.exec(`
            CREATE TABLE users_backup AS SELECT * FROM users;
          `);

                    // Drop old table and indexes
                    db.exec(`DROP TABLE IF EXISTS users;`);
                    db.exec(`
            DROP INDEX IF EXISTS idx_users_active;
            DROP INDEX IF EXISTS idx_users_role;
            DROP INDEX IF EXISTS idx_users_email;
          `);

                    // Create new table with correct constraint
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

                    // Restore data
                    db.exec(`
            INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
            SELECT id, name, email, password_hash, role, active, created_at, updated_at FROM users_backup;
          `);

                    // Remove backup
                    db.exec(`DROP TABLE users_backup;`);

                    // Create indexes
                    db.exec(`
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);

                } 
            } catch (error: any) {
                console.error('G��n+�  Migration v10: Could not migrate users table, will be created fresh:', error.message);
                
                // If migration fails, drop and recreate
                try {
                    db.exec(`DROP TABLE IF EXISTS users_backup;`);
                    db.exec(`DROP TABLE IF EXISTS users;`);
                    db.exec(`
            DROP INDEX IF EXISTS idx_users_active;
            DROP INDEX IF EXISTS idx_users_role;
            DROP INDEX IF EXISTS idx_users_email;
          `);

                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

                    db.exec(`
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);

                } catch (err) {
                    console.error('G�� Migration v10 failed:', err);
                    throw err;
                }
            }
        },
        down: (db: Database.Database) => {
            // No rollback needed, this is a constraint fix
        }
    },

    // Version 11: Final users table validation and cleanup
    {
        version: 11,
        name: 'validate_users_table_integrity',
        up: (db: Database.Database) => {
            try {
                // Check if users table exists
                const checkTable = db.prepare(`
          SELECT sql FROM sqlite_master 
          WHERE type='table' AND name='users'
        `).get() as { sql: string } | undefined;

                if (!checkTable) {
                    // Create new users table with proper schema
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

                    // Create indexes
                    db.exec(`
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);

                    return;
                }

                // Verify the table has INTEGER PRIMARY KEY
                if (!checkTable.sql.includes('INTEGER PRIMARY KEY')) {
                    
                    // Backup existing data if any
                    const userCount = db.prepare(`SELECT COUNT(*) as count FROM users`).get() as { count: number };
                    
                    if (userCount && userCount.count > 0) {
                        db.exec(`CREATE TABLE users_final AS SELECT * FROM users;`);
                    }

                    // Drop old table
                    db.exec(`DROP TABLE IF EXISTS users;`);

                    // Create new table with correct schema
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

                    // Restore data if it existed
                    if (userCount && userCount.count > 0) {
                        try {
                            db.exec(`
              INSERT INTO users (name, email, password_hash, role, active, created_at, updated_at)
              SELECT name, email, password_hash, role, active, created_at, updated_at FROM users_final;
            `);
                            db.exec(`DROP TABLE users_final;`);
                        } catch (err) {
                            db.exec(`DROP TABLE IF EXISTS users_final;`);
                        }
                    }

                    // Create indexes
                    db.exec(`
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);

                } 

                // Verify constraint is correct
                if (!checkTable.sql.includes("'super_admin'")) {
                    db.exec(`DROP TABLE IF EXISTS users;`);
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

                    db.exec(`
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);

                }
            } catch (error: any) {
                console.error('G�� Migration v11 error:', error.message);
                
                try {
                    db.exec(`DROP TABLE IF EXISTS users;`);
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

                    db.exec(`
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);

                } catch (err) {
                    console.error('G�� Migration v11 emergency recovery failed:', err);
                    throw err;
                }
            }
        },
        down: (db: Database.Database) => {
        }
    },

    // Version 12: Fix NULL IDs and cleanup corrupt user records
    {
        version: 12,
        name: 'cleanup_null_ids_and_fix_constraint',
        up: (db: Database.Database) => {
            try {
                
                // First, check if users table exists
                const tableCheck = db.prepare(`
          SELECT sql FROM sqlite_master WHERE type='table' AND name='users'
        `).get() as { sql: string } | undefined;
                
                if (!tableCheck) {
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);
                    return;
                }
                
                // Check if constraint has super_admin
                if (!tableCheck.sql.includes("'super_admin'")) {
                    
                    // Backup existing data
                    db.exec(`
            CREATE TABLE users_backup_v12 AS 
            SELECT name, email, password_hash, role, active, created_at, updated_at FROM users;
          `);
                    
                    // Drop old table and indexes
                    db.exec(`
            DROP TABLE IF EXISTS users;
            DROP INDEX IF EXISTS idx_users_email;
            DROP INDEX IF EXISTS idx_users_role;
            DROP INDEX IF EXISTS idx_users_active;
          `);
                    
                    // Create new table with correct constraint
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);
                    
                    // Restore data
                    db.exec(`
            INSERT INTO users (name, email, password_hash, role, active, created_at, updated_at)
            SELECT name, email, password_hash, role, active, created_at, updated_at FROM users_backup_v12;
          `);
                    db.exec(`DROP TABLE users_backup_v12;`);
                    
                    // Create indexes
                    db.exec(`
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);
                    
                }
                
                // Clean up NULL IDs
                const nullIdCount = db.prepare(`
          SELECT COUNT(*) as count FROM users WHERE id IS NULL
        `).get() as { count: number };
                
                if (nullIdCount && nullIdCount.count > 0) {
                    db.prepare(`DELETE FROM users WHERE id IS NULL`).run();
                    db.prepare(`DELETE FROM sqlite_sequence WHERE name='users'`).run();
                }
                
                // Verify constraint and IDs
                const finalUsers = db.prepare(`SELECT COUNT(*) as count, COUNT(DISTINCT id) as uniqueIds FROM users`).get() as { count: number; uniqueIds: number };
                
            } catch (error: any) {
                console.error('G�� Migration v12 error:', error.message);
                
                try {
                    db.exec(`DROP TABLE IF EXISTS users_backup_v12;`);
                    db.exec(`DROP TABLE IF EXISTS users;`);
                    db.exec(`
            DROP INDEX IF EXISTS idx_users_email;
            DROP INDEX IF EXISTS idx_users_role;
            DROP INDEX IF EXISTS idx_users_active;
          `);
                    
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);
                    
                } catch (err) {
                    console.error('   G�� Emergency recovery failed:', err);
                    throw err;
                }
            }
        },
        down: (db: Database.Database) => {
        }
    },

    // Version 13: Fix NULL IDs by recreating table with ROWID preservation
    {
        version: 13,
        name: 'fix_null_ids_regenerate',
        up: (db: Database.Database) => {
            try {
                
                // Check for users with NULL IDs
                const nullCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE id IS NULL`).get() as { count: number };
                
                if (!nullCount || nullCount.count === 0) {
                    return;
                }
                
                // Backup users
                db.exec(`CREATE TABLE users_final AS SELECT * FROM users;`);
                
                // Drop old indexes and table
                db.exec(`
          DROP INDEX IF EXISTS idx_users_email;
          DROP INDEX IF EXISTS idx_users_role;
          DROP INDEX IF EXISTS idx_users_active;
          DROP TABLE users;
        `);
                
                // Create new table with proper AUTOINCREMENT
                db.exec(`
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `);
                
                // Restore data - SQLite will auto-generate IDs
                db.exec(`
          INSERT INTO users (name, email, password_hash, role, active, created_at, updated_at)
          SELECT name, email, password_hash, role, active, created_at, updated_at FROM users_final;
        `);
                
                // Clean up backup
                db.exec(`DROP TABLE users_final;`);
                
                // Recreate indexes
                db.exec(`
          CREATE UNIQUE INDEX idx_users_email ON users(email);
          CREATE INDEX idx_users_role ON users(role);
          CREATE INDEX idx_users_active ON users(active);
        `);
                
                // Verify fix
                const result = db.prepare(`
          SELECT COUNT(*) as total, COUNT(CASE WHEN id IS NULL THEN 1 END) as nullIds FROM users
        `).get() as { total: number; nullIds: number };
                
               
                
                if (result && result.total > 0 && result.nullIds === 0) {
                    const users = db.prepare(`SELECT id, email FROM users ORDER BY id`).all();
                    users.forEach((u: any, idx: number) => {
                    });
                }
            } catch (error: any) {
                console.error('G�� Migration v13 error:', error.message);
                try {
                    db.exec(`DROP TABLE IF EXISTS users_final;`);
                } catch (e) {
                    // ignore cleanup errors
                }
                throw error;
            }
        },
        down: (db: Database.Database) => {
        }
    },

    // Version 14: Final cleanup - nuke and rebuild users table completely fresh
    {
        version: 14,
        name: 'final_null_id_cleanup',
        up: (db: Database.Database) => {
            try {
                
                // Check if any users still have NULL IDs
                const nullCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE id IS NULL`).get() as { count: number };
                
                if (nullCount && nullCount.count > 0) {
                    
                    // Get all user data WITHOUT id column (so we can regenerate)
                    const allUsers = db.prepare(`
            SELECT name, email, password_hash, role, active, created_at, updated_at 
            FROM users 
            WHERE id IS NOT NULL
            ORDER BY rowid
          `).all() as Array<{name: string; email: string; password_hash: string; role: string; active: number; created_at: string; updated_at: string}>;
                    
                    
                    // Completely drop and recreate
                    db.exec(`
            DROP INDEX IF EXISTS idx_users_email;
            DROP INDEX IF EXISTS idx_users_role;
            DROP INDEX IF EXISTS idx_users_active;
            DROP TABLE IF EXISTS users;
            DELETE FROM sqlite_sequence WHERE name='users';
          `);
                    
                    // Create fresh table
                    db.exec(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
              active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_active ON users(active);
          `);
                    
                    // Insert users back - IDs will auto-generate as 1, 2, 3, etc.
                    const insertUser = db.prepare(`
            INSERT INTO users (name, email, password_hash, role, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
                    
                    for (const user of allUsers) {
                        insertUser.run(
                            user.name,
                            user.email,
                            user.password_hash,
                            user.role,
                            user.active,
                            user.created_at,
                            user.updated_at
                        );
                    }
                    
                } 
                 
                
                // Final verification
                const finalStats = db.prepare(`
          SELECT COUNT(*) as total, MIN(id) as minId, MAX(id) as maxId 
          FROM users
        `).get() as { total: number; minId: number; maxId: number };
                
                
            } catch (error: any) {
                console.error('G�� Migration v14 error:', error.message);
                throw error;
            }
        },
        down: (db: Database.Database) => {
        }
    },

    // Version 15: Complete nuke and rebuild users table
    {
        version: 15,
        name: 'complete_users_table_reset',
        up: (db: Database.Database) => {
            try {
                
                // 1. DROP EVERYTHING
                db.exec(`
          DROP TABLE IF EXISTS users;
          DROP INDEX IF EXISTS idx_users_email;
          DROP INDEX IF EXISTS idx_users_role;
          DROP INDEX IF EXISTS idx_users_active;
          DELETE FROM sqlite_sequence WHERE name='users';
        `);
                
                // 2. CREATE PRISTINE TABLE
                db.exec(`
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `);
                
                // 3. CREATE INDEXES
                db.exec(`
          CREATE UNIQUE INDEX idx_users_email ON users(email);
          CREATE INDEX idx_users_role ON users(role);
          CREATE INDEX idx_users_active ON users(active);
        `);
                
                
            } catch (error: any) {
                console.error('G�� Migration v15 error:', error.message);
                throw error;
            }
        },
        down: (db: Database.Database) => {
        }
    },

    // Version 16: Add expense to transaction reference types
    {
        version: 16,
        name: 'add_expense_to_transaction_types',
        up: (db: Database.Database) => {
            try {
                // SQLite doesn't support ALTER for CHECK constraints
                // We need to recreate the table
                
                // 1. Create temporary table with new schema
                db.exec(`
          CREATE TABLE transactions_new (
            id TEXT PRIMARY KEY,
            transaction_date TEXT NOT NULL,
            reference_type TEXT NOT NULL CHECK(reference_type IN ('sale', 'purchase', 'customer_payment', 'supplier_payment', 'expense')),
            reference_id TEXT NOT NULL,
            account_id TEXT,
            customer_id TEXT,
            supplier_id TEXT,
            direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
            amount REAL NOT NULL,
            balance_after REAL,
            description TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
          );
        `);
                
                // 2. Copy existing data
                db.exec(`
          INSERT INTO transactions_new 
          SELECT * FROM transactions;
        `);
                
                // 3. Drop old table
                db.exec(`DROP TABLE transactions;`);
                
                // 4. Rename new table
                db.exec(`ALTER TABLE transactions_new RENAME TO transactions;`);
                
                // 5. Recreate indexes
                db.exec(`
          CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
          CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_supplier ON transactions(supplier_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_reference_type ON transactions(reference_type);
        `);
                
            } catch (error: any) {
                console.error('G�� Migration v16 error:', error.message);
                throw error;
            }
        },
        down: (db: Database.Database) => {
            // Rollback would require recreating table without 'expense'
            // This is destructive and would lose expense transactions
            console.warn('G��n+� Rolling back v16 would remove expense transaction support');
        }
    },

    // Version 17: Add partial delivery tracking to goods_tasks
    {
        version: 17,
        name: 'add_partial_delivery_tracking',
        up: (db: Database.Database) => {
            try {
                // 1. Create goods_task_items table for tracking individual boxes/items
                db.exec(`
          CREATE TABLE IF NOT EXISTS goods_task_items (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            item_name TEXT NOT NULL,
            description TEXT,
            is_delivered INTEGER DEFAULT 0,
            delivered_at TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES goods_tasks(id) ON DELETE CASCADE
          );
        `);

                // Create index for task_id lookups
                db.exec(`
          CREATE INDEX IF NOT EXISTS idx_task_items_task ON goods_task_items(task_id);
        `);

                // 2. Recreate goods_tasks table with new fields and status
                db.exec(`
          CREATE TABLE goods_tasks_new (
            id TEXT PRIMARY KEY,
            task_number TEXT UNIQUE NOT NULL,
            task_date TEXT NOT NULL,
            rider_id TEXT NOT NULL,
            rider_name TEXT NOT NULL,
            customer_id TEXT,
            customer_name TEXT,
            sale_id TEXT,
            invoice_number TEXT,
            pickup_address TEXT,
            delivery_address TEXT NOT NULL,
            description TEXT,
            amount REAL DEFAULT 0,
            total_boxes INTEGER DEFAULT 0,
            delivered_boxes INTEGER DEFAULT 0,
            remaining_boxes INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_transit', 'partially_delivered', 'delivered', 'cancelled')),
            priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
            assigned_at TEXT,
            started_at TEXT,
            completed_at TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE RESTRICT,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
          );
        `);

                // 3. Copy existing data with default values for new fields
                db.exec(`
          INSERT INTO goods_tasks_new 
          SELECT 
            id, task_number, task_date, rider_id, rider_name,
            customer_id, customer_name, sale_id, invoice_number,
            pickup_address, delivery_address, description, amount,
            0 as total_boxes,
            0 as delivered_boxes,
            0 as remaining_boxes,
            status, priority, assigned_at, started_at, completed_at,
            notes, created_at, updated_at
          FROM goods_tasks;
        `);

                // 4. Drop old table
                db.exec(`DROP TABLE goods_tasks;`);

                // 5. Rename new table
                db.exec(`ALTER TABLE goods_tasks_new RENAME TO goods_tasks;`);

                // 6. Recreate indexes
                db.exec(`
          CREATE INDEX IF NOT EXISTS idx_goods_tasks_rider ON goods_tasks(rider_id);
          CREATE INDEX IF NOT EXISTS idx_goods_tasks_customer ON goods_tasks(customer_id);
          CREATE INDEX IF NOT EXISTS idx_goods_tasks_sale ON goods_tasks(sale_id);
          CREATE INDEX IF NOT EXISTS idx_goods_tasks_status ON goods_tasks(status);
          CREATE INDEX IF NOT EXISTS idx_goods_tasks_date ON goods_tasks(task_date);
        `);

            } catch (error: any) {
                console.error('G�� Migration v17 error:', error.message);
                throw error;
            }
        },
        down: (db: Database.Database) => {
            try {
                // Rollback: recreate goods_tasks without new fields
                db.exec(`
          CREATE TABLE goods_tasks_old (
            id TEXT PRIMARY KEY,
            task_number TEXT UNIQUE NOT NULL,
            task_date TEXT NOT NULL,
            rider_id TEXT NOT NULL,
            rider_name TEXT NOT NULL,
            customer_id TEXT,
            customer_name TEXT,
            sale_id TEXT,
            invoice_number TEXT,
            pickup_address TEXT,
            delivery_address TEXT NOT NULL,
            description TEXT,
            amount REAL DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
            priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
            assigned_at TEXT,
            started_at TEXT,
            completed_at TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE RESTRICT,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
          );
        `);

                db.exec(`
          INSERT INTO goods_tasks_old 
          SELECT 
            id, task_number, task_date, rider_id, rider_name,
            customer_id, customer_name, sale_id, invoice_number,
            pickup_address, delivery_address, description, amount,
            CASE 
              WHEN status = 'partially_delivered' THEN 'in_transit'
              ELSE status
            END as status,
            priority, assigned_at, started_at, completed_at,
            notes, created_at, updated_at
          FROM goods_tasks;
        `);

                db.exec(`DROP TABLE goods_tasks;`);
                db.exec(`ALTER TABLE goods_tasks_old RENAME TO goods_tasks;`);
                db.exec(`DROP TABLE IF EXISTS goods_task_items;`);

            } catch (error: any) {
                console.error('G�� Rollback v17 error:', error.message);
                throw error;
            }
        }
    },

    // Version 18: Add credit payment method support
    {
        version: 18,
        name: 'add_credit_payment_method',
        up: (db: Database.Database) => {
            try {
                // 1. Recreate sales table with credit in CHECK constraint
                db.exec(`
          CREATE TABLE sales_new (
            id TEXT PRIMARY KEY,
            invoice_number TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            sale_date TEXT NOT NULL,
            subtotal REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            discount_percent REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            paid_amount REAL DEFAULT 0,
            due_amount REAL DEFAULT 0,
            payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
            payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit')),
            account_id TEXT,
            cheque_account_id TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
          );
        `);

                // Copy data from old sales table
                db.exec(`
          INSERT INTO sales_new 
          SELECT * FROM sales;
        `);

                // Drop old table and rename new table
                db.exec(`DROP TABLE sales;`);
                db.exec(`ALTER TABLE sales_new RENAME TO sales;`);

                // Recreate indexes
                db.exec(`
          CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
          CREATE INDEX IF NOT EXISTS idx_sales_account ON sales(account_id);
          CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
          CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status);
        `);

                // 2. Recreate purchases table with credit in CHECK constraint
                db.exec(`
          CREATE TABLE purchases_new (
            id TEXT PRIMARY KEY,
            bill_number TEXT UNIQUE NOT NULL,
            supplier_id TEXT NOT NULL,
            supplier_name TEXT NOT NULL,
            purchase_date TEXT NOT NULL,
            subtotal REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            discount_percent REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            paid_amount REAL DEFAULT 0,
            due_amount REAL DEFAULT 0,
            payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
            payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit')),
            account_id TEXT,
            cheque_account_id TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
          );
        `);

                // Copy data from old purchases table
                db.exec(`
          INSERT INTO purchases_new 
          SELECT * FROM purchases;
        `);

                // Drop old table and rename new table
                db.exec(`DROP TABLE purchases;`);
                db.exec(`ALTER TABLE purchases_new RENAME TO purchases;`);

                // Recreate indexes
                db.exec(`
          CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
          CREATE INDEX IF NOT EXISTS idx_purchases_account ON purchases(account_id);
          CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
          CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status);
        `);

                // 3. Recreate payments table with credit in CHECK constraint
                db.exec(`
          CREATE TABLE payments_new (
            id TEXT PRIMARY KEY,
            payment_type TEXT NOT NULL CHECK(payment_type IN ('receipt', 'payment')),
            payment_date TEXT NOT NULL,
            customer_id TEXT,
            supplier_id TEXT,
            sale_id TEXT,
            purchase_id TEXT,
            account_id TEXT NOT NULL,
            account_name TEXT NOT NULL,
            payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit')),
            cheque_account_id TEXT,
            cheque_number TEXT,
            amount REAL NOT NULL,
            reference_number TEXT,
            notes TEXT,
            is_full_payment INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
            FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
          );
        `);

                // Copy data from old payments table
                db.exec(`
          INSERT INTO payments_new 
          SELECT * FROM payments;
        `);

                // Drop old table and rename new table
                db.exec(`DROP TABLE payments;`);
                db.exec(`ALTER TABLE payments_new RENAME TO payments;`);

                // Recreate indexes
                db.exec(`
          CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
          CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
          CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
          CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
          CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
        `);

            } catch (error: any) {
                console.error('🔧 Migration v18 error:', error.message);
                throw error;
            }
        },
        down: (db: Database.Database) => {
            try {
                // Rollback: recreate tables without credit option
                // Note: This will FAIL if any records use 'credit' payment method

                // 1. Rollback sales table
                db.exec(`
          CREATE TABLE sales_old (
            id TEXT PRIMARY KEY,
            invoice_number TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            sale_date TEXT NOT NULL,
            subtotal REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            discount_percent REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            paid_amount REAL DEFAULT 0,
            due_amount REAL DEFAULT 0,
            payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
            payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'cheque')),
            account_id TEXT,
            cheque_account_id TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
          );
        `);

                db.exec(`
          INSERT INTO sales_old 
          SELECT * FROM sales WHERE payment_method != 'credit';
        `);

                db.exec(`DROP TABLE sales;`);
                db.exec(`ALTER TABLE sales_old RENAME TO sales;`);

                // 2. Rollback purchases table
                db.exec(`
          CREATE TABLE purchases_old (
            id TEXT PRIMARY KEY,
            bill_number TEXT UNIQUE NOT NULL,
            supplier_id TEXT NOT NULL,
            supplier_name TEXT NOT NULL,
            purchase_date TEXT NOT NULL,
            subtotal REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            discount_percent REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            paid_amount REAL DEFAULT 0,
            due_amount REAL DEFAULT 0,
            payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
            payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'cheque')),
            account_id TEXT,
            cheque_account_id TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
          );
        `);

                db.exec(`
          INSERT INTO purchases_old 
          SELECT * FROM purchases WHERE payment_method != 'credit';
        `);

                db.exec(`DROP TABLE purchases;`);
                db.exec(`ALTER TABLE purchases_old RENAME TO purchases;`);

                // 3. Rollback payments table
                db.exec(`
          CREATE TABLE payments_old (
            id TEXT PRIMARY KEY,
            payment_type TEXT NOT NULL CHECK(payment_type IN ('receipt', 'payment')),
            payment_date TEXT NOT NULL,
            customer_id TEXT,
            supplier_id TEXT,
            sale_id TEXT,
            purchase_id TEXT,
            account_id TEXT NOT NULL,
            account_name TEXT NOT NULL,
            payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'cheque')),
            cheque_account_id TEXT,
            cheque_number TEXT,
            amount REAL NOT NULL,
            reference_number TEXT,
            notes TEXT,
            is_full_payment INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
            FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
          );
        `);

                db.exec(`
          INSERT INTO payments_old 
          SELECT * FROM payments WHERE payment_method != 'credit';
        `);

                db.exec(`DROP TABLE payments;`);
                db.exec(`ALTER TABLE payments_old RENAME TO payments;`);

            } catch (error: any) {
                console.error('🔧 Rollback v18 error:', error.message);
                throw error;
            }
        }
    },

    // Version 19: Add mobile_wallet and custom to payment method CHECK constraint
    {
        version: 19,
        name: 'add_mobile_wallet_custom_payment_methods',
        up: (db: Database.Database) => {
            try {
                // Migration v19: Adding mobile_wallet and custom payment methods

                // Recreate payments table with all payment method types
                db.exec(`
          CREATE TABLE payments_new (
            id TEXT PRIMARY KEY,
            payment_type TEXT NOT NULL CHECK(payment_type IN ('receipt', 'payment')),
            payment_date TEXT NOT NULL,
            customer_id TEXT,
            supplier_id TEXT,
            sale_id TEXT,
            purchase_id TEXT,
            account_id TEXT NOT NULL,
            account_name TEXT NOT NULL,
            payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
            cheque_account_id TEXT,
            cheque_number TEXT,
            amount REAL NOT NULL,
            reference_number TEXT,
            notes TEXT,
            is_full_payment INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
            FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
          );
        `);

                // Copy existing data
                db.exec(`
          INSERT INTO payments_new 
          SELECT * FROM payments;
        `);

                // Drop old table and rename new table
                db.exec(`DROP TABLE payments;`);
                db.exec(`ALTER TABLE payments_new RENAME TO payments;`);

                // Recreate indexes
                db.exec(`
          CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
          CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
          CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
          CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
          CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
        `);

                // Migration v19 completed successfully

            } catch (error: any) {
                console.error('❌ Migration v19 error:', error.message);
                throw error;
            }
        },
        down: (db: Database.Database) => {
            try {
                // Rollback: recreate table with limited payment methods
                console.warn('⚠️ Rolling back v19 - This will fail if mobile_wallet or custom records exist');

                db.exec(`
          CREATE TABLE payments_old (
            id TEXT PRIMARY KEY,
            payment_type TEXT NOT NULL CHECK(payment_type IN ('receipt', 'payment')),
            payment_date TEXT NOT NULL,
            customer_id TEXT,
            supplier_id TEXT,
            sale_id TEXT,
            purchase_id TEXT,
            account_id TEXT NOT NULL,
            account_name TEXT NOT NULL,
            payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit')),
            cheque_account_id TEXT,
            cheque_number TEXT,
            amount REAL NOT NULL,
            reference_number TEXT,
            notes TEXT,
            is_full_payment INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
            FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
          );
        `);

                // Copy only non-mobile_wallet and non-custom records
                db.exec(`
          INSERT INTO payments_old 
          SELECT * FROM payments WHERE payment_method NOT IN ('mobile_wallet', 'custom');
        `);

                db.exec(`DROP TABLE payments;`);
                db.exec(`ALTER TABLE payments_old RENAME TO payments;`);

            } catch (error: any) {
                console.error('❌ Rollback v19 error:', error.message);
                throw error;
            }
        }
    }
        ,
        // Version 20: Repair payment_method constraint if schema is outdated
        {
          version: 20,
          name: 'repair_payment_method_constraint',
          up: (db: Database.Database) => {
            try {
              const row = db.prepare(`
            SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'payments'
          `).get() as { sql?: string } | undefined;

              const tableSql = row?.sql || '';
              const hasMobileWallet = tableSql.includes('mobile_wallet');
              const hasCustom = tableSql.includes('custom');

              if (hasMobileWallet && hasCustom) {
                return;
              }

              // Migration v20: Repairing payment_method constraint

              db.exec(`
            CREATE TABLE payments_new (
            id TEXT PRIMARY KEY,
            payment_type TEXT NOT NULL CHECK(payment_type IN ('receipt', 'payment')),
            payment_date TEXT NOT NULL,
            customer_id TEXT,
            supplier_id TEXT,
            sale_id TEXT,
            purchase_id TEXT,
            account_id TEXT NOT NULL,
            account_name TEXT NOT NULL,
            payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
            cheque_account_id TEXT,
            cheque_number TEXT,
            amount REAL NOT NULL,
            reference_number TEXT,
            notes TEXT,
            is_full_payment INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
            FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
            FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
            );
          `);

              db.exec(`
            INSERT INTO payments_new
            SELECT * FROM payments;
          `);

              db.exec(`DROP TABLE payments;`);
              db.exec(`ALTER TABLE payments_new RENAME TO payments;`);

              db.exec(`
            CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
            CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
            CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
            CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
          `);

              // Migration v20 completed successfully
            } catch (error: any) {
              console.error('❌ Migration v20 error:', error.message);
              throw error;
            }
          }
        }
        ,
        // Version 21: Repair sales/purchases/payment_method constraints
        {
          version: 21,
          name: 'repair_sales_purchases_payment_method_constraints',
          up: (db: Database.Database) => {
            try {
              const getTableSql = (tableName: string): string => {
                const row = db.prepare(`
              SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?
            `).get(tableName) as { sql?: string } | undefined;
                return row?.sql || '';
              };

              const hasAllMethods = (tableSql: string): boolean => {
                return tableSql.includes('mobile_wallet') && tableSql.includes('custom');
              };

              const salesSql = getTableSql('sales');
              if (salesSql && !hasAllMethods(salesSql)) {
                // Migration v21: Repairing sales payment_method constraint

                db.exec(`
              CREATE TABLE sales_new (
                id TEXT PRIMARY KEY,
                invoice_number TEXT UNIQUE NOT NULL,
                customer_id TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                sale_date TEXT NOT NULL,
                subtotal REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                discount_percent REAL DEFAULT 0,
                total_amount REAL NOT NULL,
                paid_amount REAL DEFAULT 0,
                due_amount REAL DEFAULT 0,
                payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
                payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
                account_id TEXT,
                cheque_account_id TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
                FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
              );
            `);

                db.exec(`
              INSERT INTO sales_new
              SELECT * FROM sales;
            `);

                db.exec(`DROP TABLE sales;`);
                db.exec(`ALTER TABLE sales_new RENAME TO sales;`);

                db.exec(`
              CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
              CREATE INDEX IF NOT EXISTS idx_sales_account ON sales(account_id);
              CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
              CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status);
            `);
              }

              const purchasesSql = getTableSql('purchases');
              if (purchasesSql && !hasAllMethods(purchasesSql)) {
                // Migration v21: Repairing purchases payment_method constraint

                db.exec(`
              CREATE TABLE purchases_new (
                id TEXT PRIMARY KEY,
                bill_number TEXT UNIQUE NOT NULL,
                supplier_id TEXT NOT NULL,
                supplier_name TEXT NOT NULL,
                purchase_date TEXT NOT NULL,
                subtotal REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                discount_percent REAL DEFAULT 0,
                total_amount REAL NOT NULL,
                paid_amount REAL DEFAULT 0,
                due_amount REAL DEFAULT 0,
                payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due')),
                payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
                account_id TEXT,
                cheque_account_id TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
                FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
              );
            `);

                db.exec(`
              INSERT INTO purchases_new
              SELECT * FROM purchases;
            `);

                db.exec(`DROP TABLE purchases;`);
                db.exec(`ALTER TABLE purchases_new RENAME TO purchases;`);

                db.exec(`
              CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
              CREATE INDEX IF NOT EXISTS idx_purchases_account ON purchases(account_id);
              CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
              CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status);
            `);
              }

              const paymentsSql = getTableSql('payments');
              if (paymentsSql && !hasAllMethods(paymentsSql)) {
                // Migration v21: Repairing payments payment_method constraint

                db.exec(`
              CREATE TABLE payments_new (
                id TEXT PRIMARY KEY,
                payment_type TEXT NOT NULL CHECK(payment_type IN ('receipt', 'payment')),
                payment_date TEXT NOT NULL,
                customer_id TEXT,
                supplier_id TEXT,
                sale_id TEXT,
                purchase_id TEXT,
                account_id TEXT NOT NULL,
                account_name TEXT NOT NULL,
                payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'mobile_wallet', 'cheque', 'custom', 'credit')),
                cheque_account_id TEXT,
                cheque_number TEXT,
                amount REAL NOT NULL,
                reference_number TEXT,
                notes TEXT,
                is_full_payment INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
                FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
                FOREIGN KEY (cheque_account_id) REFERENCES accounts(id) ON DELETE SET NULL
              );
            `);

                db.exec(`
              INSERT INTO payments_new
              SELECT * FROM payments;
            `);

                db.exec(`DROP TABLE payments;`);
                db.exec(`ALTER TABLE payments_new RENAME TO payments;`);

                db.exec(`
              CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
              CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
              CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
              CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
              CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
            `);
              }
            } catch (error: any) {
              console.error('❌ Migration v21 error:', error.message);
              throw error;
            }
          }
        },
        // Version 22: Update item purchase prices from purchase history for COGS calculation
        {
          version: 22,
          name: 'update_item_purchase_prices_for_cogs',
          up: (db: Database.Database) => {
            try {
              
              // Update purchase_price for all items based on their latest purchase
              db.exec(`
                UPDATE items
                SET purchase_price = (
                  SELECT pi.unit_price
                  FROM purchase_items pi
                  JOIN purchases p ON pi.purchase_id = p.id
                  WHERE pi.item_id = items.id
                  ORDER BY p.purchase_date DESC, p.created_at DESC
                  LIMIT 1
                )
                WHERE id IN (
                  SELECT DISTINCT item_id FROM purchase_items
                )
                AND (purchase_price = 0 OR purchase_price IS NULL);
              `);
              
            } catch (error: any) {
              console.error('❌ Migration v22 error:', error.message);
              throw error;
            }
          },
          down: (db: Database.Database) => {
            // No rollback needed - we don't want to set prices back to 0
          }
        },

        // Version 23: Create expense categories table
        {
          version: 23,
          name: 'create_expense_categories_table',
          up: (db: Database.Database) => {
            try {
              // Create expense_categories table
              db.exec(`
                CREATE TABLE IF NOT EXISTS expense_categories (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL UNIQUE,
                  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
              `);

              // Insert default categories
              const defaultCategories = [
                'Utilities',
                'Rent',
                'Salaries',
                'Transport',
                'Office Supplies',
                'Maintenance',
                'Marketing',
                'Insurance',
                'Taxes',
                'Other'
              ];

              const insertCategory = db.prepare(`
                INSERT OR IGNORE INTO expense_categories (id, name, status)
                VALUES (?, ?, 'active')
              `);

              for (let i = 0; i < defaultCategories.length; i++) {
                const id = `CAT-${(i + 1).toString().padStart(3, '0')}`;
                insertCategory.run(id, defaultCategories[i]);
              }

              console.log('✅ Migration v23: Created expense_categories table with default categories');
            } catch (error: any) {
              console.error('❌ Migration v23 error:', error.message);
              throw error;
            }
          },
          down: (db: Database.Database) => {
            db.exec(`DROP TABLE IF EXISTS expense_categories;`);
          }
        },

        // Version 24: Add profit/loss tracking to sale_items
        {
          version: 24,
          name: 'add_profit_loss_tracking_to_sale_items',
          up: (db: Database.Database) => {
            try {
              console.log('🔄 Migration v24: Adding profit/loss tracking to sale_items...');
              
              // Add purchase_price column to track cost at time of sale
              db.exec(`
                ALTER TABLE sale_items 
                ADD COLUMN purchase_price REAL DEFAULT 0;
              `);
              
              // Add profit column to track profit/loss per item
              db.exec(`
                ALTER TABLE sale_items 
                ADD COLUMN profit REAL DEFAULT 0;
              `);
              
              // Update existing sale_items with current purchase_price from items table
              db.exec(`
                UPDATE sale_items 
                SET purchase_price = (
                  SELECT items.purchase_price 
                  FROM items 
                  WHERE items.id = sale_items.item_id
                )
                WHERE item_id IN (SELECT id FROM items);
              `);
              
              // Calculate profit for existing sale_items
              db.exec(`
                UPDATE sale_items
                SET profit = (unit_price - purchase_price) * quantity
                WHERE purchase_price IS NOT NULL;
              `);
              
              console.log('✅ Migration v24: Successfully added profit/loss tracking to sale_items');
            } catch (error: any) {
              console.error('❌ Migration v24 error:', error.message);
              throw error;
            }
          },
          down: (db: Database.Database) => {
            try {
              // Note: SQLite doesn't support DROP COLUMN directly
              // Would need to recreate table to remove columns
              console.log('⚠️  Migration v24 rollback: SQLite does not support DROP COLUMN. Manual intervention required.');
            } catch (error: any) {
              console.error('❌ Migration v24 rollback error:', error.message);
              throw error;
            }
          }
        },

        // Version 25: Create invoice_number_formats table for configurable invoice numbering
        {
          version: 25,
          name: 'create_invoice_number_formats_table',
          up: (db: Database.Database) => {
            try {
              db.exec(`
                CREATE TABLE IF NOT EXISTS invoice_number_formats (
                  id TEXT PRIMARY KEY,
                  type TEXT UNIQUE NOT NULL,
                  prefix TEXT NOT NULL DEFAULT 'INV',
                  date_format TEXT NOT NULL DEFAULT 'YYYY-MM',
                  digits INTEGER NOT NULL DEFAULT 4,
                  reset_type TEXT NOT NULL DEFAULT 'monthly' CHECK(reset_type IN ('monthly', 'yearly', 'never')),
                  last_counter INTEGER NOT NULL DEFAULT 0,
                  last_reset_date TEXT,
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
              `);

              // Insert default formats for sale and purchase
              db.prepare(`
                INSERT OR IGNORE INTO invoice_number_formats
                  (id, type, prefix, date_format, digits, reset_type, last_counter, last_reset_date)
                VALUES ('SALE-FORMAT', 'sale', 'SAL', 'YYYY-MM', 4, 'monthly', 0, NULL)
              `).run();

              db.prepare(`
                INSERT OR IGNORE INTO invoice_number_formats
                  (id, type, prefix, date_format, digits, reset_type, last_counter, last_reset_date)
                VALUES ('PUR-FORMAT', 'purchase', 'PUR', 'YYYY-MM', 4, 'monthly', 0, NULL)
              `).run();

              console.log('✅ Migration v25: Created invoice_number_formats table with default formats');
            } catch (error: any) {
              console.error('❌ Migration v25 error:', error.message);
              throw error;
            }
          },
          down: (db: Database.Database) => {
            db.exec(`DROP TABLE IF EXISTS invoice_number_formats;`);
          }
        }
];

/**
 * Apply migrations to bring database to target version
 */
export function applyMigrations(db: Database.Database, targetVersion?: number): void {
    const currentVersion = getCurrentVersion(db);
    const maxVersion = targetVersion || Math.max(...migrations.map(m => m.version));

  

    if (currentVersion >= maxVersion) {
        return;
    }

    // Apply migrations in order
    const migrationsToApply = migrations
        .filter(m => m.version > currentVersion && m.version <= maxVersion)
        .sort((a, b) => a.version - b.version);

    if (migrationsToApply.length === 0) {
        return;
    }


    // Run migrations in a transaction
    const migrate = db.transaction(() => {
        for (const migration of migrationsToApply) {
            migration.up(db);

            // Update version in metadata
            db.prepare(`
        UPDATE _metadata 
        SET value = ?, updated_at = datetime('now')
        WHERE key = 'version'
      `).run(migration.version.toString());
        }
    });

    migrate();
}

/**
 * Get current database version
 */
export function getCurrentVersion(db: Database.Database): number {
    try {
        const result = db.prepare(`
      SELECT value FROM _metadata WHERE key = 'version'
    `).get() as { value: string } | undefined;

        return result ? parseInt(result.value, 10) : 0;
    } catch (error) {
        // Table doesn't exist yet
        return 0;
    }
}

/**
 * Rollback to a specific version (use with caution!)
 */
export function rollbackToVersion(db: Database.Database, targetVersion: number): void {
    const currentVersion = getCurrentVersion(db);

    if (targetVersion >= currentVersion) {
        return;
    }

    const migrationsToRollback = migrations
        .filter(m => m.version > targetVersion && m.version <= currentVersion)
        .sort((a, b) => b.version - a.version); // Reverse order


    const rollback = db.transaction(() => {
        for (const migration of migrationsToRollback) {
            if (migration.down) {
                migration.down(db);
            } else {
                throw new Error(`Migration v${migration.version} does not have a rollback function`);
            }
        }

        // Update version
        db.prepare(`
      UPDATE _metadata 
      SET value = ?, updated_at = datetime('now')
      WHERE key = 'version'
    `).run(targetVersion.toString());
    });

    rollback();
}
