import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import type { DatabaseConfig, DatabaseMetadata, DatabaseResult } from './types';
import { applyMigrations, getCurrentVersion, migrations } from './migrations';

/**
 * Database Manager
 * Handles SQLite database initialization, operations, and recovery
 */
export class DatabaseManager {
    private db: Database.Database | null = null;
    private dbPath: string;
    private config: DatabaseConfig;
    private isInitialized = false;

    constructor(config?: Partial<DatabaseConfig>) {
        // Get user data directory
        const userDataPath = app.getPath('userData');
        const dbDir = join(userDataPath, 'database');

        // Ensure database directory exists
        if (!existsSync(dbDir)) {
            mkdirSync(dbDir, { recursive: true });
        }

        // Set database path
        this.dbPath = join(dbDir, config?.filename || 'erp-pro.db');

        // Set configuration - use latest migration version by default
        const latestVersion = migrations.length > 0 ? migrations[migrations.length - 1].version : 1;
        this.config = {
            filename: this.dbPath,
            version: config?.version || latestVersion,
            verbose: config?.verbose || false,
        };

    }

    /**
     * Initialize the database
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Test better-sqlite3 loading first
            try {
                // This will throw if better-sqlite3 can't be loaded
                const testDb = new Database(':memory:');
                testDb.close();
            } catch (sqliteError) {
                console.error('Failed to load better-sqlite3:', sqliteError);
                throw new Error(`Failed to load database engine (better-sqlite3). This usually means the native module was not properly rebuilt for Electron. Error: ${sqliteError}`);
            }

            // Check if database file exists
            const dbExists = existsSync(this.dbPath);

            if (!dbExists) {
            } else {
                // Create backup before opening existing database
                await this.createBackup('pre-init');
            }

            // Open database connection
            this.db = new Database(this.dbPath, {
                // Verbose logging completely disabled
                verbose: undefined,
                nativeBinding: undefined,
            });

            // Configure database
            this.configureDatabase();

            // Verify database integrity
            const isHealthy = await this.checkIntegrity();
            if (!isHealthy) {
                throw new Error('Database integrity check failed');
            }

            // Apply migrations
            applyMigrations(this.db, this.config.version);

            // Ensure all required default data exists on every startup
            this.ensureDefaultData();

            // Repair payments constraint if needed (handles stale metadata)
            this.repairPaymentMethodConstraint();

            this.isInitialized = true;

            // Log database info
            const metadata = await this.getMetadata();

        } catch (error) {
            console.error('Failed to initialize database:', error);

            const message = error instanceof Error ? error.message : String(error);
            const isNativeBinaryError =
                message.includes('Failed to load database engine (better-sqlite3)') ||
                message.includes('ERR_DLOPEN_FAILED') ||
                message.includes('NODE_MODULE_VERSION');

            if (isNativeBinaryError) {
                throw error instanceof Error ? error : new Error(message);
            }

            // Attempt recovery
            const recovered = await this.attemptRecovery();
            if (!recovered) {
                throw new Error(`Database initialization failed: ${error}`);
            }
        }
    }

    /**
     * Configure database settings
     */
    private configureDatabase(): void {
        if (!this.db) return;

        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');

        // Set journal mode to WAL for better concurrency
        this.db.pragma('journal_mode = WAL');

        // Set synchronous mode to NORMAL for better performance
        this.db.pragma('synchronous = NORMAL');

        // Set cache size (in KB)
        this.db.pragma('cache_size = -64000'); // 64MB

        // Set temp store to memory
        this.db.pragma('temp_store = MEMORY');

    }

    /**
     * Ensures all required default data exists in the database.
     * Called on every app startup — safe to run multiple times (INSERT OR IGNORE).
     *
     * Creates:
     *   - Walk-in Customer  (id = '1') — default customer for POS sales
     *   - Cash Account      (id = '1') — default payment account
     */
    private ensureDefaultData(): void {
        if (!this.db) return;

        // ── Walk-in Customer ─────────────────────────────────────────────────
        this.db.exec(`
            INSERT OR IGNORE INTO customers
                (id, name, name_urdu, opening_balance, current_balance, status, notes)
            VALUES
                ('1', 'Walk-in Customer', 'واک اِن کسٹمر', 0, 0, 'active',
                 'Default customer for walk-in sales — created automatically on startup');
        `);

        // ── Default Cash Account ─────────────────────────────────────────────
        this.db.exec(`
            INSERT OR IGNORE INTO accounts
                (id, account_name, account_type, opening_balance, current_balance, status)
            VALUES
                ('1', 'Cash', 'cash', 0, 0, 'active');
        `);
    }

        /**
         * Ensure payments.payment_method allows mobile_wallet and custom
         */
        private repairPaymentMethodConstraint(): void {
                if (!this.db) return;

                const row = this.db.prepare(
                        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'payments'"
                ).get() as { sql?: string } | undefined;

                const tableSql = row?.sql || '';
                const hasMobileWallet = tableSql.includes('mobile_wallet');
                const hasCustom = tableSql.includes('custom');

                if (hasMobileWallet && hasCustom) {
                        return;
                }

                const repair = this.db.transaction(() => {
                        this.db!.exec(`
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

                        this.db!.exec(`
                INSERT INTO payments_new
                SELECT * FROM payments;
            `);

                        this.db!.exec('DROP TABLE payments;');
                        this.db!.exec('ALTER TABLE payments_new RENAME TO payments;');

                        this.db!.exec(`
                CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
                CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
                CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
                CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
                CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
            `);

                        this.db!.prepare(`
                UPDATE _metadata
                SET value = ?, updated_at = datetime('now')
                WHERE key = 'version'
            `).run('20');
                });

                repair();
        }

    /**
     * Check database integrity
     */
    private async checkIntegrity(): Promise<boolean> {
        if (!this.db) return false;

        try {
            const result = this.db.pragma('integrity_check') as Array<{ integrity_check: string }>;
            const isOk = result.length === 1 && result[0].integrity_check === 'ok';



            return isOk;
        } catch (error) {
            console.error('Error checking database integrity:', error);
            return false;
        }
    }

    /**
     * Attempt to recover corrupted database
     */
    private async attemptRecovery(): Promise<boolean> {

        try {
            // Close current connection
            if (this.db) {
                this.db.close();
                this.db = null;
            }

            // Look for backup files
            const backupPath = `${this.dbPath}.backup`;

            if (existsSync(backupPath)) {

                // Rename corrupted file
                const corruptedPath = `${this.dbPath}.corrupted.${Date.now()}`;
                copyFileSync(this.dbPath, corruptedPath);

                // Restore from backup
                copyFileSync(backupPath, this.dbPath);

                // Try to initialize again
                await this.initialize();
                return true;
            } else {

                // Rename corrupted file
                if (existsSync(this.dbPath)) {
                    const corruptedPath = `${this.dbPath}.corrupted.${Date.now()}`;
                    copyFileSync(this.dbPath, corruptedPath);
                }

                // Initialize new database
                await this.initialize();
                return true;
            }
        } catch (error) {
            console.error('Recovery failed:', error);
            return false;
        }
    }

    /**
     * Create a backup of the database
     */
    public async createBackup(suffix?: string): Promise<string> {
        if (!existsSync(this.dbPath)) {
            throw new Error('Database file does not exist');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = suffix
            ? `${this.dbPath}.${suffix}.${timestamp}.backup`
            : `${this.dbPath}.${timestamp}.backup`;

        copyFileSync(this.dbPath, backupName);

        return backupName;
    }

    /**
     * Execute a query that returns rows
     */
    public query<T = any>(sql: string, params: any[] = []): T[] {
        this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(sql);
            const result = stmt.all(...params) as T[];
            return result;
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    }

    /**
     * Execute a query that returns a single row
     */
    public queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
        this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(sql);
            return stmt.get(...params) as T | undefined;
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    }

    /**
     * Execute a statement (INSERT, UPDATE, DELETE)
     */
    public execute(sql: string, params: any[] = []): Database.RunResult {
        this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(sql);
            const result = stmt.run(...params);
            return result;
        } catch (error) {
            console.error('Execute error:', error);
            throw error;
        }
    }

    /**
     * Execute multiple statements in a transaction
     */
    public transaction<T>(callback: () => T): T {
        this.ensureInitialized();

        const txn = this.db!.transaction(callback);
        return txn();
    }

    /**
     * Get database metadata
     */
    public async getMetadata(): Promise<DatabaseMetadata> {
        this.ensureInitialized();

        const version = getCurrentVersion(this.db!);

        const createdAt = this.queryOne<{ value: string }>(
            `SELECT value FROM _metadata WHERE key = 'created_at'`
        )?.value || new Date().toISOString();

        const updatedAt = this.queryOne<{ value: string }>(
            `SELECT value FROM _metadata WHERE key = 'updated_at'`
        )?.value || new Date().toISOString();

        return {
            version,
            createdAt,
            updatedAt,
        };
    }

    /**
     * Get current database version
     */
    public getVersion(): number {
        this.ensureInitialized();
        return getCurrentVersion(this.db!);
    }

    /**
     * Close database connection
     */
    public close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }

    /**
     * Get database instance (use with caution)
     */
    public getDatabase(): Database.Database {
        this.ensureInitialized();
        return this.db!;
    }

    /**
     * Ensure database is initialized
     */
    private ensureInitialized(): void {
        if (!this.isInitialized || !this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
    }

    /**
     * Get database path
     */
    public getPath(): string {
        return this.dbPath;
    }

    /**
     * Check if database is initialized
     */
    public isReady(): boolean {
        return this.isInitialized && this.db !== null;
    }
}

// Singleton instance
let dbInstance: DatabaseManager | null = null;

/**
 * Get database instance
 */
export function getDatabase(): DatabaseManager {
    if (!dbInstance) {
        dbInstance = new DatabaseManager();
    }
    return dbInstance;
}

/**
 * Initialize database (call this on app startup)
 */
export async function initializeDatabase(config?: Partial<DatabaseConfig>): Promise<DatabaseManager> {
    if (!dbInstance) {
        dbInstance = new DatabaseManager(config);
    }

    if (!dbInstance.isReady()) {
        await dbInstance.initialize();
    }

    return dbInstance;
}

/**
 * Close database (call this on app shutdown)
 */
export function closeDatabase(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
