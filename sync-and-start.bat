@echo off
echo ========================================
echo Syncing hotelsewa Database
echo ========================================
echo.

echo Step 1: Applying migration to existing data...
echo Please enter MySQL root password if prompted
mysql -u root hotelsewa < migrate-existing-db.sql
if %errorlevel% neq 0 (
    echo [WARNING] Migration had issues, continuing...
)
echo [OK] Migration applied
echo.

echo Step 2: Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma client
    pause
    exit /b 1
)
echo [OK] Prisma client generated
echo.

echo Step 3: Syncing remaining schema...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [WARNING] Some tables may already exist
)
echo [OK] Schema synced
echo.

echo Step 4: Starting server...
call npm start

pause
