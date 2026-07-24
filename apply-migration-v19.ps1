# Apply Migration v19 - PowerShell Script
# This script updates the payments table to support mobile_wallet and custom payment methods

Write-Host "🔧 Applying Migration v19..." -ForegroundColor Cyan
Write-Host ""

# Database path
$dbPath = "$env:APPDATA\JSERP\database\erp-pro.db"

# Check if database exists
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ ERROR: Database not found at: $dbPath" -ForegroundColor Red
    Write-Host "Please start the application first to create the database." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "📂 Found database at: $dbPath" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  WARNING: Close the application before continuing!" -ForegroundColor Yellow
Write-Host ""
pause

try {
    # Load SQL from file
    $sqlPath = Join-Path $PSScriptRoot "migration-v19.sql"
    if (-not (Test-Path $sqlPath)) {
        throw "SQL file not found: $sqlPath"
    }

    $sql = Get-Content $sqlPath -Raw

    # Load System.Data.SQLite assembly (you might need to install this)
    # For now, we'll use a simpler approach with .NET
    
    Add-Type -TypeDefinition @"
using System;
using System.Data;
using System.Runtime.InteropServices;

public class SQLiteInterop {
    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_open", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Open(byte[] filename, out IntPtr db);
    
    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_exec", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Exec(IntPtr db, byte[] sql, IntPtr callback, IntPtr arg, out IntPtr errMsg);
    
    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_close", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Close(IntPtr db);
    
    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_errmsg", CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr ErrorMsg(IntPtr db);
}
"@

    # Open database
    $dbBytes = [System.Text.Encoding]::UTF8.GetBytes($dbPath + "`0")
    $db = [IntPtr]::Zero
    $result = [SQLiteInterop]::Open($dbBytes, [ref]$db)
    
    if ($result -ne 0) {
        throw "Failed to open database. Error code: $result"
    }

    Write-Host "✓ Database opened" -ForegroundColor Green

    # Execute SQL
    $sqlBytes = [System.Text.Encoding]::UTF8.GetBytes($sql + "`0")
    $errMsg = [IntPtr]::Zero
    $result = [SQLiteInterop]::Exec($db, $sqlBytes, [IntPtr]::Zero, [IntPtr]::Zero, [ref]$errMsg)
    
    if ($result -ne 0) {
        $error = [System.Runtime.InteropServices.Marshal]::PtrToStringAnsi($errMsg)
        throw "SQL execution failed: $error"
    }

    # Close database
    [SQLiteInterop]::Close($db) | Out-Null

    Write-Host ""
    Write-Host "✅ SUCCESS: Migration v19 applied successfully!" -ForegroundColor Green
    Write-Host "You can now restart the application." -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative solution:" -ForegroundColor Yellow
    Write-Host "1. Close the application completely" -ForegroundColor White
    Write-Host "2. Delete the database file:" -ForegroundColor White
    Write-Host "   $dbPath" -ForegroundColor Gray
    Write-Host "3. Restart the application (it will recreate with all migrations)" -ForegroundColor White
}

Write-Host ""
pause
