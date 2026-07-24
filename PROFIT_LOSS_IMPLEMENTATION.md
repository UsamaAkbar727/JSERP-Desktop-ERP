# Profit/Loss Tracking Implementation Summary

## Overview
Successfully implemented comprehensive profit/loss tracking system with visual feedback for the ERP system. Users can now clearly see when products are sold below their purchase price (at a loss) through color-coded indicators, warnings, and detailed profit/loss calculations.

## Database Changes

### Migration v24
**File**: `migration-v24.sql`

Added two new columns to the `sale_items` table:
- `purchase_price` (REAL): Stores the purchase price of the item at the time of sale
- `profit` (REAL): Stores the calculated profit/loss: `(unit_price - purchase_price) × quantity`

The migration also:
- Populates existing records with purchase prices from the `items` table
- Calculates profit for all historical sale items
- Updates database version to 24

### Migration Scripts
- **PowerShell**: `apply-migration-v24.ps1` - For Windows users
- **Node.js**: `scripts/apply-migration-24.cjs` - Cross-platform migration script

Both scripts include:
- Automatic backup creation before migration
- Version checking to prevent duplicate migrations
- Error handling with automatic rollback
- Post-migration statistics

## Backend Changes

### Type Definitions (`src/types/api.ts`)
Updated `SaleItem` interface:
```typescript
export interface SaleItem {
  // ... existing fields
  purchase_price: number;  // NEW
  profit: number;          // NEW
}
```

### Repository Layer (`electron/database/repositories/SalesRepository.ts`)
Enhanced `create` method to:
1. Fetch purchase price from `items` table for each sale item
2. Calculate profit: `(sale_price - purchase_price) × quantity`
3. Store both values in `sale_items` table automatically

This ensures every sale transaction captures the profit/loss at the point of sale.

## Frontend UI Changes

### 1. CreateSalePage (`src/pages/sales/CreateSalePage.tsx`)

#### New Features:
- **Profit/Loss Column**: Added new column to cart table showing profit/loss per line item
- **Color Coding**:
  - 🟢 Green text for profitable items
  - 🔴 Red text for items sold at a loss
- **Warning Icons**: 🔺 Red alert triangle appears next to price input when selling below cost
- **Red Border**: Price input fields turn red when price < purchase price
- **Total Profit/Loss**: Displays aggregate profit/loss in the totals section
- **Loss Alert Banner**: Orange warning banner appears when any items are sold below cost

#### Visual Layout:
```
┌─────────────────────────────────────────────────────┐
│ Item Name  │ Qty │ Price ⚠️ │ Total │ Profit/Loss │
├─────────────────────────────────────────────────────┤
│ Widget A   │  5  │  100    │  500  │  +250        │
│                                       │  Profit     │
├─────────────────────────────────────────────────────┤
│ Widget B   │  3  │  80 ⚠️  │  240  │  -30         │
│                                       │  Loss       │
└─────────────────────────────────────────────────────┘

Totals:
  Subtotal:        Rs 740
  Grand Total:     Rs 740
  Total Profit:    Rs 220  (Green)

⚠️ Warning: Some items are being sold below cost
```

### 2. EditSalePage (`src/pages/sales/EditSalePage.tsx`)
Identical profit/loss tracking features as CreateSalePage for consistency.

### 3. CreateSaleDialog (`src/components/forms/CreateSaleDialog.tsx`)
**Compact POS-style dialog** with:
- Inline profit/loss display under each cart item total
- Warning icon next to prices below cost
- Total profit/loss in summary section
- Compact warning message for loss items

### 4. CreateSaleDialogStandalone (`src/components/forms/CreateSaleDialogStandalone.tsx`)
Same profit/loss features as CreateSaleDialog for standalone usage.

## Key Features Implemented

### ✅ Line-Item Level Tracking
- Each cart item shows individual profit or loss
- Real-time calculation as prices are adjusted
- Clear labeling: "Profit" (green) or "Loss" (red)

### ✅ Visual Indicators
- **Red Text**: Negative profit amounts displayed in red
- **Green Text**: Positive profit amounts displayed in green  
- **Warning Icons**: 🔺 Alert triangle for below-cost pricing
- **Red Border**: Input fields highlight when price < purchase price
- **Warning Banner**: Prominent alert when any items sold at loss

### ✅ Grand Total Profit/Loss
- Aggregates profit/loss across all cart items
- Displayed prominently in totals section
- Color-coded: red for overall loss, green for overall profit
- Shows absolute value with clear label

### ✅ Real-Time Calculations
All profit/loss calculations update instantly as users:
- Add/remove items
- Change quantities
- Adjust prices
- Apply discounts

### ✅ Data Persistence
- Purchase price captured at sale time (prevents historical data corruption)
- Profit calculated and stored in database
- Historical accuracy maintained even if purchase prices change later

## User Experience Improvements

### Before Implementation:
- ❌ No visibility into profit margins
- ❌ Could accidentally sell below cost without warning
- ❌ No way to track loss-making transactions
- ❌ Analytics showed only gross revenue, not true profit

### After Implementation:
- ✅ Immediate visual feedback on profitability
- ✅ Clear warnings when selling below cost
- ✅ Line-by-line profit/loss visibility
- ✅ Total profit/loss displayed prominently
- ✅ Historical profit data preserved for analytics
- ✅ Color-coded indicators reduce errors

## Analytics & Reporting Impact

The new profit tracking enables:
1. **Accurate Profit Reporting**: Total profit now accounts for losses
2. **Loss Tracking**: Can identify loss-making transactions
3. **Product Analysis**: Can see which products are profitable vs. loss-making
4. **Historical Accuracy**: Purchase prices frozen at sale time

The existing `ProfitLossReport` interface can now leverage the stored profit values for accurate reporting.

## Installation & Migration

### For Development:
```bash
# Apply migration using Node.js
node scripts/apply-migration-24.cjs
```

### For Production (Windows):
```powershell
# Apply migration using PowerShell
.\apply-migration-v24.ps1
```

### For Production (Other):
```bash
# Using Node.js
node scripts/apply-migration-24.cjs
```

## Rollback Plan
Both migration scripts automatically create backups before applying changes:
- Backup format: `erp_backup_v{version}_{timestamp}.db`
- Location: Same directory as main database
- Automatic restore on migration failure

To manually rollback:
1. Stop the application
2. Locate backup file in data directory
3. Replace `erp.db` with backup file
4. Restart application

## Testing Checklist

### Sale Creation:
- ✅ Create sale with profitable items → Shows green profit
- ✅ Create sale with loss items → Shows red loss + warning
- ✅ Mix of profit/loss items → Calculates total correctly
- ✅ Modify price to below cost → Warning appears instantly
- ✅ Modify price to above cost → Warning disappears

### Visual Indicators:
- ✅ Red text for losses
- ✅ Green text for profits
- ✅ Warning icons appear/disappear correctly
- ✅ Red border on below-cost prices
- ✅ Warning banner shows when has losses

### Data Persistence:
- ✅ Profit/loss saved to database correctly
- ✅ Historical sales show correct profit values
- ✅ Purchase price changes don't affect past sales

## Technical Details

### Profit Calculation Formula:
```
Item Profit = (Sale Price - Purchase Price) × Quantity
Total Profit = Sum of all Item Profits - Discounts
```

### Color Coding Logic:
```tsx
isLoss = profit < 0
className = isLoss ? "text-destructive" : "text-success"
```

### Warning Conditions:
```tsx
hasLossItems = cart.some(item => item.unitPrice < item.purchasePrice)
showWarning = hasLossItems && cart.length > 0
```

## Future Enhancements

Potential improvements for future iterations:
1. **Profit Margin %**: Display profit as percentage of sale price
2. **Min Price Enforcement**: Option to prevent sales below cost
3. **Profit Targets**: Set and track profit margin goals
4. **Loss Reports**: Dedicated report for loss-making transactions
5. **Product Profitability**: Dashboard showing most/least profitable products
6. **Profit Alerts**: Notifications when profit margins are too low
7. **Historical Comparison**: Compare current vs. historical profit margins

## Files Modified

### Database:
- `migration-v24.sql` (new)
- `apply-migration-v24.ps1` (new)
- `scripts/apply-migration-24.cjs` (new)

### Backend:
- `electron/database/repositories/SalesRepository.ts`
- `src/types/api.ts`

### Frontend:
- `src/pages/sales/CreateSalePage.tsx`
- `src/pages/sales/EditSalePage.tsx`
- `src/components/forms/CreateSaleDialog.tsx`
- `src/components/forms/CreateSaleDialogStandalone.tsx`

## Summary

This implementation provides comprehensive profit/loss tracking with excellent visual feedback. Users can now:
- ✅ See profit/loss for each item in real-time
- ✅ Get warned when selling below cost
- ✅ Track total profitability per sale
- ✅ Make informed pricing decisions
- ✅ Generate accurate profit reports

The solution is production-ready with proper:
- Database migrations with rollback support
- Type safety across the stack
- Real-time UI updates
- Color-coded visual feedback
- Warning indicators
- Historical data preservation

All user requirements have been successfully implemented! 🎉
