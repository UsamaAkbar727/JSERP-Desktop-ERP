-- Migration v24: Add profit/loss tracking to sale_items
-- Apply this migration to enable profit/loss visibility in sales

BEGIN TRANSACTION;

-- Add purchase_price and profit columns to sale_items
ALTER TABLE sale_items ADD COLUMN purchase_price REAL DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN profit REAL DEFAULT 0;

-- Update existing sale_items with purchase prices from items table
UPDATE sale_items 
SET purchase_price = (
  SELECT items.purchase_price 
  FROM items 
  WHERE items.id = sale_items.item_id
)
WHERE EXISTS (
  SELECT 1 FROM items WHERE items.id = sale_items.item_id
);

-- Calculate profit for existing records: (unit_price - purchase_price) * quantity
UPDATE sale_items 
SET profit = (unit_price - purchase_price) * quantity;

-- Update database version
PRAGMA user_version = 24;

COMMIT;
