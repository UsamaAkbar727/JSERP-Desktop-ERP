# Apply Migration v23: Create expense categories table
# This script applies migration v23 to the development database

Write-Host "📋 Applying Migration v23..." -ForegroundColor Cyan

$dbPath = "E:\optify srudio\erp-pro\erp.db"

if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database not found at: $dbPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Database path: $dbPath" -ForegroundColor Green

# Check current version using sqlite3
$currentVersion = sqlite3 $dbPath "PRAGMA user_version"
Write-Host "Current version: $currentVersion" -ForegroundColor Yellow

if ($currentVersion -ge 23) {
    Write-Host "✅ Database already at version 23 or higher. No migration needed." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting migration to version 23..." -ForegroundColor Cyan
Write-Host ""

# Create expense_categories table
Write-Host "📋 Creating expense_categories table..." -ForegroundColor Yellow

$sql = @"
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('utilities', 'Utilities', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('rent', 'Rent', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('salaries', 'Salaries', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('transport', 'Transport', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('office_supplies', 'Office Supplies', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('maintenance', 'Maintenance', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('marketing', 'Marketing', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('insurance', 'Insurance', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('taxes', 'Taxes', 'active');
INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES ('other', 'Other', 'active');

PRAGMA user_version = 23;

COMMIT;
"@

# Save SQL to temp file
$tempSqlFile = [System.IO.Path]::GetTempFileName()
$sql | Out-File -FilePath $tempSqlFile -Encoding ASCII

# Execute SQL
try {
    sqlite3 $dbPath ".read $tempSqlFile"
    Write-Host "✅ Migration v23 completed successfully!" -ForegroundColor Green
    Write-Host "✅ Created expense_categories table with 10 default categories" -ForegroundColor Green
    
    # Verify
    Write-Host ""
    Write-Host "📊 Verification:" -ForegroundColor Cyan
    $newVersion = sqlite3 $dbPath "PRAGMA user_version"
    $categoryCount = sqlite3 $dbPath "SELECT COUNT(*) FROM expense_categories"
    Write-Host "  Database version: $newVersion" -ForegroundColor White
    Write-Host "  Categories count: $categoryCount" -ForegroundColor White
    
} catch {
    Write-Host "❌ Migration failed: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
}
