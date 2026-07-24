# JSERP Production Build Script
# Creates Windows .exe production build with error handling

param(
    [switch]$Clean = $false,
    [switch]$SkipTests = $true
)

Write-Host "🚀 JSERP Production Build Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Set error preference
$ErrorActionPreference = "Stop"

# Function to handle errors
function Handle-Error {
    param($Message)
    Write-Host "❌ ERROR: $Message" -ForegroundColor Red
    exit 1
}

# Function to show step
function Show-Step {
    param($Message)
    Write-Host "📦 $Message" -ForegroundColor Cyan
}

try {
    # Change to project directory
    Set-Location "E:\optify srudio\erp-pro"
    
    # Step 1: Clean previous builds if requested
    if ($Clean) {
        Show-Step "Cleaning previous builds..."
        if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force -ErrorAction SilentlyContinue }
        if (Test-Path "dist-electron") { Remove-Item "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue }
        if (Test-Path "release") { Remove-Item "release" -Recurse -Force -ErrorAction SilentlyContinue }
        Write-Host "✅ Cleaned previous builds" -ForegroundColor Green
    }
    
    # Step 2: Install/update dependencies
    Show-Step "Checking dependencies..."
    if (-not (Test-Path "node_modules")) {
        npm install
        if ($LASTEXITCODE -ne 0) { Handle-Error "Failed to install dependencies" }
    }
    Write-Host "✅ Dependencies ready" -ForegroundColor Green
    
    # Step 3: Build React app
    Show-Step "Building React application..."
    npm run build
    if ($LASTEXITCODE -ne 0) { Handle-Error "Failed to build React app" }
    Write-Host "✅ React app built successfully" -ForegroundColor Green
    
    # Step 4: Build Electron main process
    Show-Step "Building Electron main process..."
    npm run build:electron
    if ($LASTEXITCODE -ne 0) { Handle-Error "Failed to build Electron main process" }
    Write-Host "✅ Electron main process built successfully" -ForegroundColor Green
    
    # Step 5: Create Windows installer
    Show-Step "Creating Windows installer..."
    electron-builder --win --publish never
    if ($LASTEXITCODE -ne 0) { Handle-Error "Failed to create Windows installer" }
    
    # Step 6: Verify build output
    $installerPath = "release\JSERP Setup 1.0.0.exe"
    $exePath = "release\win-unpacked\JSERP.exe"
    
    if (Test-Path $installerPath) {
        $size = [math]::Round((Get-Item $installerPath).Length / 1MB, 2)
        Write-Host ""
        Write-Host "🎉 BUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "===================" -ForegroundColor Green
        Write-Host "📁 Installer: $installerPath ($size MB)" -ForegroundColor White
        Write-Host "📁 Executable: $exePath" -ForegroundColor White
        Write-Host ""
        Write-Host "🚀 Installation Commands:" -ForegroundColor Yellow
        Write-Host "   Install:    .\release\JSERP Setup 1.0.0.exe" -ForegroundColor White
        Write-Host "   Test:       .\release\win-unpacked\JSERP.exe" -ForegroundColor White
        Write-Host ""
    } else {
        Handle-Error "Installer not found after build completion"
    }
    
} catch {
    Handle-Error $_.Exception.Message
}

Write-Host "✅ Production build completed successfully!" -ForegroundColor Green