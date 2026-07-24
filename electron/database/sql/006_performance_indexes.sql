-- Migration Version 6: Performance Indexes
-- Creates indexes on frequently queried columns for better performance
-- Optimizes queries for customer balances, invoice numbers, dates, etc.

-- =============================================================================
-- CUSTOMER INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(current_balance);

-- =============================================================================
-- SUPPLIER INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_balance ON suppliers(current_balance);

-- =============================================================================
-- ITEM INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_unit_id ON items(unit_id);

-- =============================================================================
-- SALES INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- =============================================================================
-- SALE ITEMS INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);

-- =============================================================================
-- PURCHASES INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_purchases_bill_number ON purchases(bill_number);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

-- =============================================================================
-- PURCHASE ITEMS INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_item_id ON purchase_items(item_id);

-- =============================================================================
-- PAYMENTS INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_purchase_id ON payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);

-- =============================================================================
-- EXPENSES INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON expenses(account_id);

-- =============================================================================
-- TRANSACTIONS INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_type ON transactions(reference_type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON transactions(supplier_id);

-- =============================================================================
-- GOODS TASKS INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_goods_tasks_task_number ON goods_tasks(task_number);
CREATE INDEX IF NOT EXISTS idx_goods_tasks_rider_id ON goods_tasks(rider_id);
CREATE INDEX IF NOT EXISTS idx_goods_tasks_customer_id ON goods_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_goods_tasks_sale_id ON goods_tasks(sale_id);
CREATE INDEX IF NOT EXISTS idx_goods_tasks_status ON goods_tasks(status);
CREATE INDEX IF NOT EXISTS idx_goods_tasks_task_date ON goods_tasks(task_date);

-- =============================================================================
-- ACCOUNTS INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- =============================================================================
-- RIDERS INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_riders_status ON riders(status);
CREATE INDEX IF NOT EXISTS idx_riders_phone ON riders(phone);
