# Admin Setup Script
# Fixes the UUID type mismatch and adds your user as admin

Write-Host "UnionEyes - Admin Access Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Get Clerk user ID from environment or prompt
$clerkUserId = "user_35NlrrNcfTv0DMh2kzBHyXZRtpb"
Write-Host "Using Clerk User ID: $clerkUserId" -ForegroundColor Yellow
Write-Host ""

# Database connection string from .env.local
$dbUrl = "postgresql://unionadmin:UnionEyes2025!Staging@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require"

Write-Host "OPTION 1: Quick Fix via Clerk Dashboard (Recommended)" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "1. Go to: https://dashboard.clerk.com" -ForegroundColor White
Write-Host "2. Navigate to Users -> Find your user" -ForegroundColor White
Write-Host "3. Click on your user -> Metadata tab" -ForegroundColor White
Write-Host "4. Under Public Metadata, add:" -ForegroundColor White
Write-Host '   { "role": "admin" }' -ForegroundColor Cyan
Write-Host "5. Save and refresh your browser" -ForegroundColor White
Write-Host ""

Write-Host "OPTION 2: Database Migration (For Production)" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "This will:" -ForegroundColor White
Write-Host "  - Change user_id column from UUID to VARCHAR(255)" -ForegroundColor White
Write-Host "  - Add your Clerk user as an admin" -ForegroundColor White
Write-Host "  - Create a backup of existing data" -ForegroundColor White
Write-Host ""

$runMigration = Read-Host "Do you want to run the database migration? (y/n)"

if ($runMigration -eq "y" -or $runMigration -eq "Y") {
    Write-Host ""
    Write-Host "Running database migration..." -ForegroundColor Yellow
    
    # Check if psql is installed
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    
    if ($psqlPath) {
        Write-Host "Using psql to run migration..." -ForegroundColor Cyan
        psql "$dbUrl" -f "database/migrations/fix-user-id-type.sql"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✓ Migration completed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Verifying changes..." -ForegroundColor Yellow
            
            # Verify the change
            $verifyQuery = @"
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_schema = 'user_management' 
  AND table_name = 'tenant_users' 
  AND column_name = 'user_id';
"@
            
            $result = psql "$dbUrl" -c "$verifyQuery" -t
            Write-Host "Column type: $result" -ForegroundColor Cyan
            
            Write-Host ""
            Write-Host "Checking if your user was added..." -ForegroundColor Yellow
            $userQuery = "SELECT role, is_active FROM user_management.tenant_users WHERE user_id = '$clerkUserId';"
            $userResult = psql "$dbUrl" -c "$userQuery" -t
            
            if ($userResult -match "admin") {
                Write-Host "✓ Your user is now an admin!" -ForegroundColor Green
            } else {
                Write-Host "⚠ User not found. You may need to add a tenant first." -ForegroundColor Yellow
            }
        } else {
            Write-Host ""
            Write-Host "✗ Migration failed. Check the error messages above." -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "⚠ psql not found. Please install PostgreSQL client tools." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Alternative: Run the SQL manually" -ForegroundColor Cyan
        Write-Host "=================================" -ForegroundColor Cyan
        Write-Host "1. Connect to your database using Azure Data Studio or pgAdmin" -ForegroundColor White
        Write-Host "2. Open: database/migrations/fix-user-id-type.sql" -ForegroundColor White
        Write-Host "3. Execute the SQL commands" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "Skipping database migration." -ForegroundColor Yellow
    Write-Host "Use Option 1 (Clerk Dashboard) for quick testing." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "==========" -ForegroundColor Green
Write-Host "1. Restart your dev server if running" -ForegroundColor White
Write-Host "2. Navigate to http://localhost:3000/dashboard" -ForegroundColor White
Write-Host "3. Look for 'Admin Panel' in the left sidebar" -ForegroundColor White
Write-Host "4. Click it to access admin settings" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  docs/ADMIN_ACCESS_SETUP.md" -ForegroundColor White
Write-Host ""
