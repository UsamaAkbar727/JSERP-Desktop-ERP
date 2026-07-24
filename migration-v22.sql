-- Migration v22: Update item purchase prices from purchase history
-- This migration fixes items that have purchase_price = 0 by updating them
-- with the latest purchase price from purchase_items table

-- Update purchase_price for all items based on their latest purchase
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

-- Alternative: Use weighted average cost (commented out, uncomment if preferred)
-- UPDATE items
-- SET purchase_price = (
--   SELECT 
--     COALESCE(SUM(pi.quantity * pi.unit_price) / NULLIF(SUM(pi.quantity), 0), 0)
--   FROM purchase_items pi
--   WHERE pi.item_id = items.id
-- )
-- WHERE id IN (
--   SELECT DISTINCT item_id FROM purchase_items
-- )
-- AND (purchase_price = 0 OR purchase_price IS NULL);
