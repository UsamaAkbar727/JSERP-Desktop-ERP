# Backup Restore - Account Balance Fix

## Issue
Jab backup restore hoti thi aur application restart hoti thi, to accounts ki balances 0 ho jati thi jabke backup file mein proper amounts store thi.

## Root Cause
Migration v7 `seed_default_data` har baar run hota tha aur default Cash account create kar deta tha with 0 balance using `INSERT OR IGNORE`. 

```typescript
// PURANA CODE (Problem):
db.exec(`
  INSERT OR IGNORE INTO accounts (id, account_name, account_type, opening_balance, current_balance, status)
  VALUES ('1', 'Cash', 'cash', 0, 0, 'active');
`);
```

Issue ye tha ke:
1. Backup restore hoti thi with proper account balances
2. Application restart hoti thi
3. Migration v7 run hota tha
4. Agar backup mein Cash account nahi thi ya different ID thi, to migration v7 naya Cash account create kar deta tha 0 balance ke sath
5. Result: User ko 0 balance dikhayi deti thi

## Solution
Migration v7 ko update kiya gaya hai takay wo pehle check kare ke koi accounts exist karte hain ki nahi:

```typescript
// NAYA CODE (Fixed):
const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };

if (accountCount.count === 0) {
    // Sirf tabhi default account create karo jab koi account exist nahi karta
    db.exec(`
        INSERT INTO accounts (id, account_name, account_type, opening_balance, current_balance, status)
        VALUES ('1', 'Cash', 'cash', 0, 0, 'active');
    `);
    console.log('✅ Migration v7: Created default Cash account');
} else {
    // Skip karo agar accounts already exist karte hain (backup restored accounts ko preserve karta hai)
    console.log(`ℹ️  Migration v7: Skipping default Cash account creation - ${accountCount.count} account(s) already exist (preserving balances)`);
}
```

## Benefits
1. **Backup Restore Preserved**: Jab backup restore hoti hai, existing accounts aur unki balances preserve hoti hain
2. **Fresh Install Works**: Naye installation mein default Cash account properly create hota hai
3. **No Data Loss**: User ka data kabhi override nahi hota
4. **Better Logging**: Console logs mein clear messages dikhte hain jo troubleshooting mein help karte hain

## Agar Pehle Se Issue Tha
Agar aap ke accounts ki balances pehle se 0 ho chuki hain, to aap:

### Option 1: Opening Balance Set Karein
1. Account card par "Edit" button click karein
2. Opening Balance field mein proper amount enter karein
3. Save karein
4. Current balance automatically update ho jayegi

### Option 2: Backup Dobara Restore Karein
1. Settings > Backup & Restore par jayein
2. "Restore from File" button click karein
3. Apni backup file select karein
4. Application automatically restart hogi
5. Is baar accounts ki balances properly restore hongi (kyunki migration v7 fix ho gaya hai)

## Testing
Ye scenarios test kiye gaye hain:

✅ **Fresh Installation**: Default Cash account properly create hota hai  
✅ **Backup Restore**: Restored accounts ki balances preserve hoti hain  
✅ **Existing Database**: Koi unnecessary accounts create nahi hote  
✅ **Multiple Restores**: Multiple backups restore karne par bhi data safe rehta hai  

## Migration File
**File**: `electron/database/migrations.ts`  
**Migration Version**: v7  
**Migration Name**: `seed_default_data`

## Date
**Fixed On**: February 20, 2026
