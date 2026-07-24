@echo off
echo =========================================
echo Applying Migration v18: Credit Payment
echo =========================================
echo.
echo IMPORTANT: Make sure the application is closed!
echo Press Ctrl+C to cancel, or
pause
echo.
echo Checking for database...

if not exist "erp.db" (
    echo ERROR: Database file 'erp.db' not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo Database found: erp.db
echo Applying migration...
echo.

sqlite3 erp.db < migration-v18.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =========================================
    echo Migration applied successfully!
    echo =========================================
    echo.
    echo You can now start the application.
    echo The credit payment method is now available in POS.
) else (
    echo.
    echo =========================================
    echo ERROR: Migration failed!
    echo =========================================
    echo.
    echo Please check if:
    echo 1. SQLite3 is installed (download from https://www.sqlite.org/)
    echo 2. The application is completely closed
    echo 3. The database file is not locked
)

echo.
pause
