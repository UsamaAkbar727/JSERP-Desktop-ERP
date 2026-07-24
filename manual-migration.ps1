# Manual Expense Categories Table Creation Script
# This PowerShell script manually creates the expense_categories table

Write-Host "Manual Migration: Creating expense_categories table..." -ForegroundColor Cyan

# Check if database exists
$dbPath = "$env:APPDATA\JSERP\database\erp-pro.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database not found at: $dbPath" -ForegroundColor Red
    exit 1
}

# Create SQL for expense_categories table
$sql = @"
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO expense_categories (id, name, status) VALUES 
('CAT-001', 'Utilities', 'active'),
('CAT-002', 'Rent', 'active'),
('CAT-003', 'Salaries', 'active'),
('CAT-004', 'Transport', 'active'),
('CAT-005', 'Office Supplies', 'active'),
('CAT-006', 'Maintenance', 'active'),
('CAT-007', 'Marketing', 'active'),
('CAT-008', 'Insurance', 'active'),
('CAT-009', 'Taxes', 'active'),
('CAT-010', 'Other', 'active');

PRAGMA user_version = 23;

COMMIT;
"@

# Save SQL to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$sql | Out-File -FilePath $tempFile -Encoding UTF8

try {
    # Try using sqlite3 command if available
    if (Get-Command sqlite3 -ErrorAction SilentlyContinue) {
        Write-Host "Using sqlite3 command line tool..." -ForegroundColor Green
        sqlite3 $dbPath ".read $tempFile"
    }
    else {
        # Try using Python's sqlite3 module (if Python is available)
        if (Get-Command python -ErrorAction SilentlyContinue) {
            Write-Host "Using Python sqlite3 module..." -ForegroundColor Green
            $pythonScript = @"
import sqlite3
with open('$tempFile', 'r', encoding='utf-8') as f:
    sql = f.read()
conn = sqlite3.connect('$dbPath')
conn.executescript(sql)
conn.close()
print('Migration applied successfully!')
"@
            $pythonScript | python
        }
        else {
            Write-Host "No SQLite command line tool found." -ForegroundColor Red
            Write-Host "Please install SQLite tools or run the app to auto-apply migrations." -ForegroundColor Yellow
            exit 1
        }
    }
    
    Write-Host "Expense categories table created successfully!" -ForegroundColor Green
    Write-Host "Categories added: 10 default categories" -ForegroundColor Green
    
} catch {
    Write-Host "Error executing migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile
    }
}

Write-Host "You can now start the app with: npm run electron:dev" -ForegroundColor Cyan