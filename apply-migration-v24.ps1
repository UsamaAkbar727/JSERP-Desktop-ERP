#!/usr/bin/env pwsh
# Migration script for v24 - Add profit/loss tracking

$ErrorActionPreference = "Stop"

Write-Host "Starting Migration v24: Add profit/loss tracking to sale_items..." -ForegroundColor Cyan

# Get the data directory path
$dataDir = Join-Path $PSScriptRoot "data"
$dbPath = Join-Path $dataDir "erp.db"

# Check if database exists
if (-not (Test-Path $dbPath)) {
    Write-Host "Database not found at: $dbPath" -ForegroundColor Red
    Write-Host "Please ensure the application has been run at least once." -ForegroundColor Yellow
    exit 1
}

# Check current version
$currentVersion = sqlite3 $dbPath "PRAGMA user_version;"
Write-Host "Current database version: $currentVersion" -ForegroundColor Yellow

if ($currentVersion -ge 24) {
    Write-Host "Database is already at version 24 or higher. No migration needed." -ForegroundColor Green
    exit 0
}

# Create backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $dataDir "erp_backup_v${currentVersion}_${timestamp}.db"
Write-Host "Creating backup at: $backupPath" -ForegroundColor Yellow
Copy-Item $dbPath $backupPath

# Apply migration
Write-Host "Applying migration v24..." -ForegroundColor Cyan
$sqlPath = Join-Path $PSScriptRoot "migration-v24.sql"

if (-not (Test-Path $sqlPath)) {
    Write-Host "Migration file not found: $sqlPath" -ForegroundColor Red
    exit 1
}

try {
    Get-Content $sqlPath | sqlite3 $dbPath
    
    # Verify version
    $newVersion = sqlite3 $dbPath "PRAGMA user_version;"
    
    if ($newVersion -eq 24) {
        Write-Host "✓ Migration completed successfully!" -ForegroundColor Green
        Write-Host "Database version: $newVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Migration may have failed. Current version: $newVersion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Migration failed: $_" -ForegroundColor Red
    Write-Host "Restoring backup..." -ForegroundColor Yellow
    Copy-Item $backupPath $dbPath -Force
    Write-Host "Backup restored." -ForegroundColor Green
    exit 1
}

Write-Host "`nMigration v24 completed successfully!" -ForegroundColor Green
Write-Host "Backup saved at: $backupPath" -ForegroundColor Cyan
