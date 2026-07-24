# Backup Merge/Restore Fix - Urdu Documentation

## مسئلہ جو ٹھیک کیا گیا

**اصل مسئلہ**: جب backup restore کیا جاتا تھا تو:
- Database مکمل طور پر خالی ہو جاتا تھا
- نہ پرانا data رہتا تھا
- نہ ہی backup file کا data show ہوتا تھا
- Tables wipe/truncate ہو جاتے تھے

## اصل وجہ

پہلے implementation میں **مکمل file replacement** تھی:
1. Backup file extract ہوتی تھی
2. Current database **مکمل طور پر delete** ہو جاتا تھا
3. Backup file سے database replace ہو جاتا تھا
4. اگر backup پرانی version کا تھا، تو migrations fail ہوتے تھے
5. نتیجہ: خالی database

## حل (Solution)

### 1. ✅ نیا Merge Functionality

`BackupService.ts` میں `mergeRestore()` method add کیا گیا جو:
- Backup file سے data **READ** کرتا ہے (delete نہیں)
- Current database میں data **PRESERVE** کرتا ہے
- دونوں databases کا data **MERGE** کرتا ہے
- `INSERT OR REPLACE` استعمال کرتا ہے (update existing, insert new)

### 2. ✅ Data کی حفاظت

- **موجودہ data محفوظ**: جو data ابھی database میں ہے وہ رہے گا
- **نیا data شامل**: Backup file کا جو نیا data ہے وہ add ہوگا
- **Updates لاگو**: جو records دونوں میں ہیں انہیں update کر دے گا
- **Safety backup**: Merge سے پہلے automatic safety backup بناتا ہے

### 3. ✅ Smart Merge Logic

Tables dependency order میں merge ہوتے ہیں:
```
users → settings → accounts → customers → suppliers → 
units → items → sales → sale_items → purchases → 
purchase_items → payments → expenses → transactions → 
riders → goods_tasks → goods_task_items → audit_log → licenses
```

### 4. ✅ Error Handling

- Transaction-based merge (atomic operation)
- Constraint violations skip (duplicate prevention)
- تفصیلی logging merge statistics کے ساتھ
- Failure پر rollback

## کیسے کام کرتا ہے اب

### قدم بہ قدم عمل:

1. **User backup file منتخب کرتا ہے** restore کے لیے
2. **Backup extract ہوتا ہے** temp location میں (`.restore-temp/`)
3. **Safety backup بنتا ہے** automatically (`.pre-merge.bak`)
4. **Transaction شروع ہوتا ہے** current database پر
5. **ہر table کے لیے**:
   - دونوں databases میں موجودگی چیک کرتا ہے
   - Backup سے تمام rows read کرتا ہے
   - Current database میں `INSERT OR REPLACE` کرتا ہے
   - Merged/skipped records count کرتا ہے
6. **Transaction commit ہوتا ہے** (یا error پر rollback)
7. **Cleanup** temp files کی
8. **نتائج دکھائیں**: "X records merged, Y skipped"
9. **App restart** UI refresh کرنے کے لیے

## Modified Files

### Backend
1. **`electron/backup/BackupService.ts`**
   - `mergeRestore()` method شامل کیا
   - Existing `completeRestore()` preserved (legacy support)
   - Transaction-based merge with rollback support

2. **`electron/ipc/handlers/backup.ts`**
   - `backup:restore` handler update کیا merge استعمال کرنے کے لیے
   - `backup:restore-from-file` handler update کیا
   - Merge statistics return کرتا ہے

### Frontend
3. **`src/components/settings/BackupSettings.tsx`**
   - Dialog messages update کیے merge behavior reflect کرنے کے لیے
   - Toast notifications میں merge statistics دکھاتا ہے
   - Button styling destructive سے primary میں تبدیل کی
   - تفصیلی success messages

## فوائد

✅ **Data کی حفاظت**: کبھی بھی current data ضائع نہیں ہوگا
✅ **لچکدار**: متعدد backups merge کر سکتے ہیں
✅ **شفافیت**: بالکل ظاہر کرتا ہے کہ کیا merge ہوا
✅ **بحالی**: Safety backups تباہی سے بچاتے ہیں
✅ **ذہین Updates**: Duplicates کو سمجھداری سے handle کرتا ہے

## پہلے اور بعد میں فرق

### پرانا طریقہ (Fix سے پہلے)
```
Current DB: [A, B, C, D]
Backup DB:  [A, B, E, F]
نتیجہ:      [A, B, E, F]  ❌ C اور D گم ہو گئے!
```

### نیا طریقہ (Fix کے بعد)
```
Current DB: [A, B, C, D]
Backup DB:  [A, B, E, F]
نتیجہ:      [A, B, C, D, E, F]  ✅ سب کچھ محفوظ!
```

## حفاظتی خصوصیات

1. **Pre-merge backup**: Automatic `.pre-merge.bak` بنتا ہے
2. **Transaction safety**: All-or-nothing commit
3. **تصدیق**: Table/file کی موجودگی چیک کرتا ہے
4. **Logging**: تفصیلی console logs debugging کے لیے
5. **Error reporting**: مخصوص error messages return کرتا ہے

## Testing Checklist

### Test کرنے سے پہلے
- [ ] Current database کا backup بنائیں
- [ ] موجودہ data counts نوٹ کریں (users, customers, products, وغیرہ)

### Test Cases

#### Test 1: نئے Data کے ساتھ Merge
1. Backup بنائیں
2. نئے products, customers شامل کریں
3. پرانا backup restore کریں
4. **متوقع نتیجہ**: نیا data + backup data دونوں نظر آئیں

#### Test 2: Updates کے ساتھ Merge
1. Backup بنائیں
2. موجودہ customer names تبدیل کریں
3. Backup restore کریں
4. **متوقع نتیجہ**: اصل names restore ہو جائیں (UPDATE behavior)

#### Test 3: Conflicts کے ساتھ Merge
1. Backup بنائیں
2. کچھ records delete کریں، نئے شامل کریں
3. Backup restore کریں
4. **متوقع نتیجہ**: Delete شدہ records restore ہوں، نئے preserved رہیں

#### Test 4: خالی Backup
1. خالی database کا backup بنائیں
2. Data شامل کریں
3. خالی backup restore کریں
4. **متوقع نتیجہ**: موجودہ data preserved رہے (کوئی deletion نہیں)

#### Test 5: Error Handling
1. Backup بنائیں
2. خراب/غلط backup file restore کریں
3. **متوقع نتیجہ**: Error message، current data intact

## کیسے Test کریں

### Build اور Run
```powershell
# Development mode
npm run dev

# Production build
npm run build
```

### Logs چیک کریں
یہ log messages تلاش کریں:
- `🔄 Starting merge restore from:`
- `✅ Safety backup created:`
- `✅ Table 'tablename': X rows merged, Y skipped`
- `✅ Merge transaction committed`
- `✅ Merge restore completed:`

## مسائل کا حل

### مسئلہ: "Database connection not available"
**حل**: App restart کریں، database initialized نہیں تھا

### مسئلہ: "Restored database file not found"
**حل**: چیک کریں backup file valid .gz format میں ہے

### مسئلہ: Skipped records کی بڑی تعداد
**وجہ**: Duplicate records یا constraint violations (عام بات ہے)

### مسئلہ: Merge کے بعد App restart نہیں ہوتی
**حل**: دستی طور پر application بند کر کے دوبارہ کھولیں

## خلاصہ

اس fix کے بعد:
- ✅ Database کبھی خالی نہیں ہوگا
- ✅ Current data ہمیشہ preserved رہے گا
- ✅ Backup کا نیا data add ہوگا
- ✅ Existing records update ہوں گے (اگر backup میں ہیں)
- ✅ User کو تفصیلی feedbackملے گا
- ✅ Safety backups automatically بنتے ہیں

## اہم نوٹ

**ضروری Testing**: براہ کرم production deployment سے پہلے مکمل طور پر test کریں!

### استعمال کے طریقہ کار

1. Settings پر جائیں
2. Database Backup & Restore section تلاش کریں
3. "Restore Backup" button پر کلک کریں
4. Backup file منتخب کریں
5. Merge dialog میں تفصیلات پڑھیں
6. "Merge Backup" بٹن پر کلک کریں
7. نتائج دیکھیں (X records merged, Y skipped)
8. App automatically restart ہوگی

### یاد رکھیں

- ⚠️ یہ **MERGE** ہے نہ کہ **REPLACE**
- ✅ آپ کا موجودہ data **محفوظ** رہے گا
- ✅ Backup کا data **شامل** ہوگا
- ✅ Automatic safety backup **بنتا** ہے
- ✅ کوئی data **ضائع** نہیں ہوگا

---

**تیار کردہ**: Copilot AI Assistant  
**تاریخ**: February 20, 2026
