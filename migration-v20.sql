-- Migration V20: Fix Supplier and Customer Balances
-- This migration recalculates all supplier and customer balances correctly

-- ========================================
-- Fix Supplier Balances
-- ========================================
UPDATE suppliers
SET current_balance = (
    -- Start with opening balance
    COALESCE(opening_balance, 0) +
    -- Add all purchases (total_amount)
    COALESCE((
        SELECT SUM(total_amount) 
        FROM purchases 
        WHERE purchases.supplier_id = suppliers.id
    ), 0) -
    -- Subtract all payments made to this supplier
    COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE payments.supplier_id = suppliers.id 
        AND payments.payment_type = 'payment'
    ), 0)
);

-- ========================================
-- Fix Customer Balances
-- ========================================
UPDATE customers
SET current_balance = (
    -- Start with opening balance
    COALESCE(opening_balance, 0) +
    -- Add all sales (total_amount)
    COALESCE((
        SELECT SUM(total_amount) 
        FROM sales 
        WHERE sales.customer_id = customers.id
    ), 0) -
    -- Subtract all receipts from this customer
    COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE payments.customer_id = customers.id 
        AND payments.payment_type = 'receipt'
    ), 0)
);
