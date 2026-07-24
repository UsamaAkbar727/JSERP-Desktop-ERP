# Credit Payment Method Implementation

## Overview
Added "Credit / Due" payment option to the POS system, allowing sales to be recorded as due/unpaid and added to the customer's balance without requiring immediate payment or account selection.

## Implementation Date
December 2024

## Changes Summary

### 1. Database Schema (Migration v18)

**File**: `electron/database/migrations.ts`

Added migration v18 to update CHECK constraints in three tables to include 'credit' as a valid payment method:

- **sales** table: `payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit'))`
- **purchases** table: `payment_method TEXT CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit'))`
- **payments** table: `payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'cheque', 'credit'))`

**Migration Strategy**: 
- Creates new tables with updated constraints
- Copies all existing data
- Drops old tables and renames new tables
- Recreates all indexes

**Rollback**: Available via down() function - removes credit option (will fail if credit payments exist)

### 2. Type Definitions

**Files Updated**:
- `src/types/erp.ts`: Added 'credit' to PaymentMethod union type
- `src/types/api.ts`: Updated payment_method in CreateSaleInput and CreatePaymentInput interfaces

```typescript
export type PaymentMethod = 'cash' | 'bank' | 'cheque' | 'credit';
```

### 3. Frontend Components

#### PaymentMethodSelector Component
**File**: `src/components/forms/PaymentMethodSelector.tsx`

- Added CreditCard icon import
- Added "Credit / Due" radio button option with Pakistani Rupee (PKR) icon
- Added informational warning box when credit is selected: "💳 Amount will be added to customer's due balance"
- Visual feedback to indicate credit payment behavior

#### POS Page (Main Implementation)
**File**: `src/pages/pos/POSPage.tsx`

**Key Changes**:

1. **Account Selection Logic**:
```typescript
const isCredit = paymentMethod === 'credit';
// Hide account selection when credit payment is selected
{!isCredit && (
  <div className="space-y-2">
    <Label>Payment Account *</Label>
    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
      {/* ... account options ... */}
    </Select>
  </div>
)}
```

2. **Sale Creation Logic**:
```typescript
const saleData = {
  // ... other fields ...
  payment_method: paymentMethod,
  account_id: isCredit ? null : selectedAccount,  // No account for credit sales
  paid_amount: isCredit ? 0 : grandTotal,         // Zero payment for credit
  due_amount: isCredit ? grandTotal : 0,           // Full amount as due
  payment_status: isCredit ? 'due' : 'paid',      // Status based on payment type
  
  // Conditionally add payment record - skip for credit sales
  ...(isCredit ? {} : {
    payment: {
      id: generatePaymentId(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      account_id: selectedAccount!,
      amount: grandTotal,
      notes: saleNotes,
    }
  })
};
```

3. **Validation**:
- Account selection is required for cash/bank/cheque
- Account selection is automatically cleared and skipped for credit
- Customer selection remains mandatory for all payment types

### 4. Backend Repositories

**File**: `electron/database/repositories/PaymentsRepository.ts`

Updated method signature to include 'credit':
```typescript
async getByPaymentMethod(paymentMethod: 'cash' | 'bank' | 'cheque' | 'credit', options?: {...})
```

### 5. IPC Handlers

**File**: `electron/ipc/handlers/sales.ts`

Already supports conditional payment creation - no changes needed. The backend correctly:
- Creates sale with due status when payment is omitted
- Updates customer balance automatically via SalesRepository
- Skips account balance updates when no payment record is provided

## Business Logic

### Credit Sale Flow
1. User selects "Credit / Due" payment method in POS
2. Account selection field is hidden and cleared
3. User completes sale as normal
4. On checkout:
   - Sale is created with `paid_amount = 0`, `due_amount = total_amount`
   - Payment status is set to 'due'
   - No payment record is created
   - Customer's balance is increased by the sale amount
   - No account balance is affected

### Regular Sale Flow (Cash/Bank/Cheque)
1. User selects payment method
2. User selects payment account (required)
3. On checkout:
   - Sale is created with `paid_amount = total`, `due_amount = 0`
   - Payment status is set to 'paid'
   - Payment record is created
   - Account balance is updated
   - Customer balance remains unchanged

## Testing Checklist

- [x] Database migration v18 builds successfully
- [x] Frontend TypeScript compilation passes
- [x] Backend TypeScript compilation passes
- [x] Type definitions are consistent across all layers
- [ ] Manual Testing Required:
  - [ ] Create a credit sale in POS
  - [ ] Verify account selection is hidden for credit
  - [ ] Verify sale is created with due status
  - [ ] Verify customer balance increases
  - [ ] Verify no account balance is affected
  - [ ] Verify sale appears in reports with credit payment method
  - [ ] Test switching between payment methods in POS
  - [ ] Verify database migration applies cleanly on existing database

## Files Modified

### Frontend
- `src/types/erp.ts` - Added 'credit' to PaymentMethod type
- `src/types/api.ts` - Updated CreateSaleInput and CreatePaymentInput payment_method
- `src/components/forms/PaymentMethodSelector.tsx` - Added credit option UI
- `src/pages/pos/POSPage.tsx` - Added credit sale logic

### Backend
- `electron/database/migrations.ts` - Added migration v18
- `electron/database/repositories/PaymentsRepository.ts` - Updated type signature

## Migration Notes

**Database Version**: 18
**Migration Name**: `add_credit_payment_method`

**To Apply Migration**:
The migration will automatically apply when the application starts if the database version is < 18.

**Manual Migration** (if needed):
```javascript
// In scripts/apply-migration-18.cjs or similar
const Database = require('better-sqlite3');
const { applyMigrations } = require('../electron/database/migrations');

const db = new Database('./data/database.db');
applyMigrations(db, 18);
db.close();
```

**To Rollback** (use with caution):
```javascript
const { rollbackToVersion } = require('../electron/database/migrations');
rollbackToVersion(db, 17);
// Note: Will fail if any credit payment records exist
```

## Known Limitations

1. **Rollback Restriction**: Rolling back migration v18 will fail if any records use 'credit' payment method
2. **Customer Requirement**: Credit sales still require customer selection (this is by design for credit tracking)
3. **No Partial Credit**: Credit sales are always full due amount, no partial payment option
4. **Payment Records**: Credit sales do not create payment records - payments must be recorded separately when customer pays

## Future Enhancements

1. Add ability to convert credit sales to paid after receiving payment
2. Implement credit limit per customer
3. Add credit aging reports (30/60/90 day aging)
4. Add credit payment collection workflow
5. Implement credit approval workflow for high-value sales

## Related Documentation

- [POS System Documentation](./README.md)
- [Accounting Logic](./ACCOUNTING_LOGIC_IMPLEMENTATION.md)
- [Database Migrations Guide](./electron/database/README.md)
- [Payment Flow](./PAYMENT_ACCOUNTING_IMPLEMENTATION.md)

## Support

For issues or questions about the credit payment feature, refer to:
- Database migration logs in application console
- TypeScript type errors in development
- Customer balance reconciliation reports

---

**Implementation Status**: ✅ Complete - Ready for Testing
**Review Date**: December 2024
**Next Review**: After user acceptance testing
