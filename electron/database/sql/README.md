# Database Migrations

This directory contains SQL migration files for the JSERP application. Migrations are automatically applied when the application starts.

## Migration Files

### Version 1: Initial Schema (`001_initial_schema.sql`)
- Creates `_metadata` table for version tracking
- Creates basic `users` table
- Creates generic `settings` key-value store
- Creates `audit_log` for change tracking
- **Status**: ✅ Applied as base migration

### Version 2: Core ERP Tables (`002_core_erp_tables.sql`)
Creates the fundamental business entities:
- **accounts** - Cash, bank, mobile wallet accounts
- **customers** - Customer master with balances
- **suppliers** - Supplier master with balances
- **units** - Measurement units (kg, piece, liter, etc.)
- **items** - Product/inventory items with pricing and stock

**Key Features**:
- Snake_case column names for SQL convention
- Foreign key constraints with referential integrity
- CHECK constraints for data validation
- Bilingual support (English/Urdu) with optional `name_urdu` fields
- Status management (active/inactive)
- Timestamp tracking (created_at, updated_at)

### Version 3: Transaction Tables (`003_transaction_tables.sql`)
Creates all transactional tables:
- **sales** - Sales invoices with payment tracking
- **sale_items** - Line items for each sale
- **purchases** - Purchase bills with payment tracking  
- **purchase_items** - Line items for each purchase
- **payments** - Customer receipts and supplier payments
- **expenses** - Business expenses by category
- **transactions** - General ledger/transaction log

**Key Features**:
- CASCADE delete for child records (sale_items, purchase_items)
- RESTRICT delete to prevent orphaned records
- Payment status tracking (paid, partial, due)
- Multiple payment methods (cash, bank, cheque)
- Discount support (amount and percentage)
- Comprehensive transaction audit trail

### Version 4: Settings & License (`004_settings_and_license.sql`)
Application configuration and licensing:
- **users** (enhanced) - User management with roles
- **settings** - Application configuration store
- **license** - License key management

**Key Features**:
- Password hash storage
- Role-based access (admin, staff)
- Language preferences (en, ur)
- License status tracking (trial, active, expired)
- Hardware ID binding

### Version 5: Goods Module (`005_goods_module.sql`)
Delivery tracking feature:
- **riders** - Delivery personnel/drivers
- **goods_tasks** - Delivery task management

**Key Features**:
- Task lifecycle tracking (pending → in_transit → delivered)
- Priority levels (low, normal, high, urgent)
- Links to sales and customers
- Timestamp tracking for each stage
- Vehicle information

### Version 6: Performance Indexes (`006_performance_indexes.sql`)
Database optimization through strategic indexes:
- Customer/supplier lookups by name, phone, balance
- Sales/purchase queries by date, invoice number, status
- Payment queries by date, customer, account
- Transaction queries by reference type and date
- Full-text search optimization

**Performance Benefits**:
- ⚡ Faster customer balance queries
- ⚡ Rapid invoice/bill number lookups
- ⚡ Efficient date-range reports
- ⚡ Optimized foreign key joins

### Version 7: Seed Data (`007_seed_data.sql`)
Essential default data:
- Default **Cash** account (id=1)
- **Walk-in Customer** (id=1) for POS sales
- 10 common **measurement units** (piece, kg, meter, etc.)
- **Expense categories** (Utilities, Rent, Salaries, etc.)
- **Default settings** (currency, prefixes, menu visibility)

## Schema Design Principles

### 1. **Data Integrity**
- Foreign key constraints enforce relationships
- CHECK constraints validate enums and ranges
- NOT NULL constraints prevent missing critical data
- UNIQUE constraints on business keys (invoice_number, bill_number)

### 2. **Referential Actions**
- `ON DELETE RESTRICT` - Prevents deletion of referenced records (customers, suppliers, items)
- `ON DELETE CASCADE` - Auto-deletes child records (sale_items when sale deleted)
- `ON DELETE SET NULL` - Clears reference but keeps record (account deletion)

### 3. **Audit Trail**
- All tables have `created_at` timestamp
- Transaction tables have `updated_at` timestamp
- `transactions` table logs all financial movements
- Immutable transaction history

### 4. **Denormalization Strategy**
Some fields are intentionally denormalized for performance:
- `customer_name` in `sales` (avoids join for reports)
- `item_name` in `sale_items` (preserves historic names)
- `account_name` in `payments` (audit trail)

This trades storage for query speed—acceptable for transactional systems.

### 5. **Balance Management**
- `current_balance` tracked on customers/suppliers/accounts
- Updated through application logic (not triggers)
- Customer balance: positive = they owe us
- Supplier balance: positive = we owe them
- Account balance: current available funds

## TypeScript Type Mapping

| TypeScript Type | SQL Type | Notes |
|----------------|----------|-------|
| `string` | `TEXT` | IDs, names, descriptions |
| `number` | `REAL` | Prices, amounts, quantities |
| `boolean` | `INTEGER` | 0 = false, 1 = true |
| `Date` | `TEXT` | ISO 8601 format (YYYY-MM-DD) |
| Union types | `TEXT + CHECK` | Enforced at DB level |
| Optional `?` | `NULL allowed` | No NOT NULL constraint |

## Running Migrations

Migrations are automatically applied on application startup:

```typescript
import { applyMigrations } from './database/migrations';
import db from './database/manager';

// Apply all pending migrations
applyMigrations(db);
```

### Manual Migration

```typescript
// Apply up to specific version
applyMigrations(db, 5); // Apply up to v5

// Rollback to version (caution!)
rollbackToVersion(db, 3); // Rollback to v3
```

## Common Queries

### Get Customer Balance
```sql
SELECT name, current_balance 
FROM customers 
WHERE status = 'active'
ORDER BY current_balance DESC;
```

### Sales Report by Date Range
```sql
SELECT 
  invoice_number,
  customer_name,
  sale_date,
  total_amount,
  payment_status
FROM sales
WHERE sale_date BETWEEN '2026-01-01' AND '2026-01-31'
ORDER BY sale_date DESC;
```

### Low Stock Items
```sql
SELECT name, stock_quantity, low_stock_threshold
FROM items
WHERE stock_quantity <= low_stock_threshold
  AND status = 'active'
ORDER BY stock_quantity ASC;
```

### Account Ledger
```sql
SELECT 
  transaction_date,
  description,
  CASE 
    WHEN direction = 'in' THEN amount 
    ELSE 0 
  END as debit,
  CASE 
    WHEN direction = 'out' THEN amount 
    ELSE 0 
  END as credit,
  balance_after
FROM transactions
WHERE account_id = '1'
ORDER BY transaction_date DESC, created_at DESC;
```

## Database Location

- **Development**: `%APPDATA%/erp-pro/erp-database.db`
- **Production**: Same location
- **Backup**: Recommended daily backups

## Troubleshooting

### Reset Database
Delete the database file and restart the application. All migrations will run fresh.

### Check Current Version
```typescript
import { getCurrentVersion } from './database/migrations';
```

### View Migration History
```sql
SELECT * FROM _metadata WHERE key = 'version';
```

## Future Migrations

To add a new migration:

1. Create `008_your_feature.sql` in this directory
2. Add migration to `migrations.ts`:
```typescript
{
  version: 8,
  name: 'your_feature',
  up: (db) => {
    // Run SQL from file or inline
  },
  down: (db) => {
    // Rollback logic
  }
}
```

## Schema Diagram

```
┌─────────────┐
│   accounts  │
└──────┬──────┘
       │
       ├─────────┐
       │         │
┌──────▼──────┐  │  ┌─────────────┐
│  customers  │  │  │  suppliers  │
└──────┬──────┘  │  └──────┬──────┘
       │         │         │
       │         │         │
┌──────▼──────┐  │  ┌──────▼──────┐
│    sales    │◄─┘  │  purchases  │
└──────┬──────┘     └──────┬──────┘
       │                   │
┌──────▼──────┐     ┌──────▼──────────┐
│ sale_items  │     │ purchase_items  │
└──────┬──────┘     └──────┬──────────┘
       │                   │
       └─────┬─────────────┘
             │
       ┌─────▼─────┐
       │   items   │
       └─────┬─────┘
             │
       ┌─────▼─────┐
       │   units   │
       └───────────┘
```

## Notes

- All IDs are UUIDs (TEXT type) except auto-increment counters
- Timestamps use ISO 8601 format for portability
- Balances use REAL for precise decimal calculations
- Status fields use CHECK constraints to enforce valid values
- Foreign keys maintain data consistency across tables
