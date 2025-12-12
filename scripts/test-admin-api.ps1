# Admin Panel API Testing Script
# This script tests all admin API endpoints with proper authentication

$baseUrl = "http://localhost:3000"
$apiBase = "$baseUrl/api/admin"

# Color output functions
function Write-Success { param($message) Write-Host $message -ForegroundColor Green }
function Write-Error { param($message) Write-Host $message -ForegroundColor Red }
function Write-Info { param($message) Write-Host $message -ForegroundColor Cyan }
function Write-Warning { param($message) Write-Host $message -ForegroundColor Yellow }

# Test counter
$script:passedTests = 0
$script:failedTests = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Body = @{},
        [int]$ExpectedStatus = 200
    )
    
    Write-Info "`n🧪 Testing: $Name"
    Write-Host "   Method: $Method $Url" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
        }
        
        if ($Body.Count -gt 0) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            Write-Host "   Body: $($params.Body)" -ForegroundColor Gray
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Success "   ✓ PASSED - Status: $($response.StatusCode)"
            $script:passedTests++
            
            # Parse and display response
            $content = $response.Content | ConvertFrom-Json
            if ($content.data) {
                Write-Host "   Response: $($content.data | ConvertTo-Json -Compress)" -ForegroundColor Gray
            } elseif ($content.message) {
                Write-Host "   Message: $($content.message)" -ForegroundColor Gray
            }
        } else {
            Write-Warning "   ⚠ Unexpected status: $($response.StatusCode) (expected $ExpectedStatus)"
            $script:failedTests++
        }
    }
    catch {
        Write-Error "   ✗ FAILED - $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "   Status: $statusCode" -ForegroundColor Red
        }
        $script:failedTests++
    }
}

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║       ADMIN PANEL API TESTING SUITE                   ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Magenta

Write-Warning "⚠️  IMPORTANT: Make sure you are logged in as an admin user!"
Write-Warning "⚠️  Open $baseUrl in your browser and log in before running these tests.`n"

$continue = Read-Host "Press Enter to continue or 'q' to quit"
if ($continue -eq 'q') { exit }

# ===== STATISTICS TESTS =====
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  1. STATISTICS ENDPOINTS                               ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Test-Endpoint `
    -Name "Get System Overview Stats" `
    -Method "GET" `
    -Url "$apiBase/stats/overview"

Test-Endpoint `
    -Name "Get Recent Activity (limit 10)" `
    -Method "GET" `
    -Url "$apiBase/stats/activity?limit=10"

Test-Endpoint `
    -Name "Get Recent Activity (limit 50)" `
    -Method "GET" `
    -Url "$apiBase/stats/activity?limit=50"

# ===== USER MANAGEMENT TESTS =====
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  2. USER MANAGEMENT ENDPOINTS                          ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Test-Endpoint `
    -Name "List All Users" `
    -Method "GET" `
    -Url "$apiBase/users"

Test-Endpoint `
    -Name "Search Users by Role (admin)" `
    -Method "GET" `
    -Url "$apiBase/users?role=admin"

Test-Endpoint `
    -Name "Search Users by Query" `
    -Method "GET" `
    -Url "$apiBase/users?search=test"

# Test user creation (will need actual IDs)
Write-Info "`n📝 User creation requires valid Clerk User ID and Tenant ID"
Write-Warning "Skipping POST /api/admin/users test (requires valid IDs)"

# ===== ORGANIZATION MANAGEMENT TESTS =====
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  3. ORGANIZATION MANAGEMENT ENDPOINTS                  ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Test-Endpoint `
    -Name "List All Organizations" `
    -Method "GET" `
    -Url "$apiBase/organizations"

Test-Endpoint `
    -Name "Search Organizations" `
    -Method "GET" `
    -Url "$apiBase/organizations?search=toronto"

# Test organization creation
$testOrgSlug = "test-org-$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Info "`n📝 Creating test organization: $testOrgSlug"

Test-Endpoint `
    -Name "Create Test Organization" `
    -Method "POST" `
    -Url "$apiBase/organizations" `
    -Body @{
        tenantSlug = $testOrgSlug
        tenantName = "Test Organization"
        contactEmail = "test@example.com"
        phone = "+1-555-0100"
        subscriptionTier = "basic"
    } `
    -ExpectedStatus 200

# ===== SYSTEM MANAGEMENT TESTS =====
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  4. SYSTEM MANAGEMENT ENDPOINTS                        ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Test-Endpoint `
    -Name "Get System Settings (All)" `
    -Method "GET" `
    -Url "$apiBase/system/settings"

Test-Endpoint `
    -Name "Get System Settings (Email Category)" `
    -Method "GET" `
    -Url "$apiBase/system/settings?category=email"

Test-Endpoint `
    -Name "Clear Application Cache" `
    -Method "POST" `
    -Url "$apiBase/system/cache"

# ===== DATABASE MANAGEMENT TESTS =====
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  5. DATABASE MANAGEMENT ENDPOINTS                      ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Test-Endpoint `
    -Name "Get Database Health Metrics" `
    -Method "GET" `
    -Url "$apiBase/database/health"

Test-Endpoint `
    -Name "Optimize Database (ANALYZE)" `
    -Method "POST" `
    -Url "$apiBase/database/optimize"

# ===== ERROR HANDLING TESTS =====
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  6. ERROR HANDLING TESTS                               ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Test-Endpoint `
    -Name "Create Org with Missing Fields" `
    -Method "POST" `
    -Url "$apiBase/organizations" `
    -Body @{ tenantSlug = "test" } `
    -ExpectedStatus 400

Test-Endpoint `
    -Name "Create Org with Invalid Slug" `
    -Method "POST" `
    -Url "$apiBase/organizations" `
    -Body @{
        tenantSlug = "Invalid Slug!!!"
        tenantName = "Test"
        contactEmail = "test@test.com"
    } `
    -ExpectedStatus 400

Test-Endpoint `
    -Name "Update Non-existent User" `
    -Method "PUT" `
    -Url "$apiBase/users/non-existent-user" `
    -Body @{
        tenantId = "fake-tenant"
        action = "updateRole"
        role = "admin"
    } `
    -ExpectedStatus 500

# ===== RESULTS SUMMARY =====
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║  TEST RESULTS SUMMARY                                  ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

$total = $script:passedTests + $script:failedTests
Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Success "Passed: $($script:passedTests)"
Write-Error "Failed: $($script:failedTests)"

if ($script:failedTests -eq 0) {
    Write-Host "`n🎉 All tests passed!" -ForegroundColor Green
} else {
    $successRate = [math]::Round(($script:passedTests / $total) * 100, 2)
    Write-Host "`n📊 Success Rate: $successRate%" -ForegroundColor Yellow
}

Write-Host "`n✅ Testing complete!`n" -ForegroundColor Cyan
