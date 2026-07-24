#!/usr/bin/env pwsh

Write-Host "🚀 Applying Migration V22: Update Item Purchase Prices from Purchase History" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules not found. Please run 'npm install' first." -ForegroundColor Red
    exit 1
}

# Run migration script
node scripts/apply-migration-22.cjs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host "⚠️  Please restart the application to see the changes." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
