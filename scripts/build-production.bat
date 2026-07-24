@echo off
REM Windows batch script for automated JSERP building
REM Usage: build-production.bat [win|mac|linux|all] [--skip-tests] [--skip-clean]

setlocal enabledelayedexpansion

REM Set environment variables
set NODE_ENV=production
set PLATFORM=%1
if "%PLATFORM%"=="" set PLATFORM=win

set SKIP_TESTS=false
set SKIP_CLEAN=false

REM Parse arguments
:parse_args
if "%2"=="--skip-tests" set SKIP_TESTS=true
if "%2"=="--skip-clean" set SKIP_CLEAN=true
if "%3"=="--skip-tests" set SKIP_TESTS=true
if "%3"=="--skip-clean" set SKIP_CLEAN=true
if "%4"=="--skip-tests" set SKIP_TESTS=true
if "%4"=="--skip-clean" set SKIP_CLEAN=true

echo.
echo ====================================
echo  JSERP Production Build (Windows)
echo ====================================
echo Platform: %PLATFORM%
echo Skip Tests: %SKIP_TESTS%
echo Skip Clean: %SKIP_CLEAN%
echo Environment: %NODE_ENV%
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm not found. Please install npm first.
    pause
    exit /b 1
)

echo Checking current directory...
if not exist "package.json" (
    echo Error: package.json not found. Make sure you're in the project root directory.
    pause
    exit /b 1
)

echo.
echo Starting production build...

REM Build arguments
set BUILD_ARGS=
if "%SKIP_TESTS%"=="true" set BUILD_ARGS=!BUILD_ARGS! --skip-tests
if "%SKIP_CLEAN%"=="true" set BUILD_ARGS=!BUILD_ARGS! --skip-clean

REM Run the production build
node scripts/build-production.cjs %PLATFORM% %BUILD_ARGS%

if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed. Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ✅ Production build completed successfully!
echo.
echo Check the release\ directory for your installer.

if exist "release\*.exe" (
    echo.
    echo Windows installer(s) created:
    for %%f in (release\*.exe) do (
        echo   - %%~nxf
    )
)

echo.
echo Next steps:
echo   1. Test the installer on a clean Windows system
echo   2. Create a GitHub release if satisfied
echo   3. Distribute the installer

echo.
echo Press any key to exit...
pause >nul

:: Step 5: Verify build output
echo.
echo [5/5] Verifying build output...
if exist "release\JSERP Setup 1.0.0.exe" (
    echo.
    echo ========================================
    echo   BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo 📁 Installer: release\JSERP Setup 1.0.0.exe
    echo 📁 Executable: release\win-unpacked\JSERP.exe
    echo.
    echo Installation Commands:
    echo   Install:  .\release\JSERP Setup 1.0.0.exe
    echo   Test:     .\release\win-unpacked\JSERP.exe
    echo.
) else (
    echo ❌ Installer not found after build completion
    pause
    exit /b 1
)

echo ✅ Production build completed successfully!
echo.
pause