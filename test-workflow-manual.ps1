# Workflow UI Manual Testing Checklist
# Run this with: node test-workflow-manual.js

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Workflow UI Manual Testing Checklist" -ForegroundColor Cyan
Write-Host "  Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  ✓ Dev server running on localhost:3000" -ForegroundColor Green
Write-Host "  ✓ Logged in as: info@nzilaventures.com (LRO)" -ForegroundColor Green
Write-Host "  ✓ Test claims: CLM-2025-003, CLM-2025-004" -ForegroundColor Green
Write-Host ""

# Test 1: Navigation & Display
Write-Host "Test 1: Navigation and Display" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "1. Navigate to http://localhost:3000/dashboard/workbench"
Write-Host "   Expected: 2 assigned claims displayed"
Write-Host ""
Write-Host "2. Click 'View Full Details' on CLM-2025-003"
Write-Host "   Expected: Claim detail page loads"
Write-Host ""
Write-Host "3. Check page heading"
Write-Host "   Expected: Shows 'CLM-2025-003' (not generic 'Claim Details')"
Write-Host ""
Write-Host "4. Check back button"
Write-Host "   Expected: Says 'Back to Assigned Claims' (not 'My Claims')"
Write-Host ""
Write-Host "5. Check 'Assigned to You' card"
Write-Host "   Expected: Green card visible with LRO assignment message"
Write-Host ""
Write-Host "6. Check field labels"
Write-Host "   Expected: 'Member's Desired Outcome' (not 'Your Desired Outcome')"
Write-Host "   Expected: 'Submitted by Member' (not 'Submitted')"
Write-Host ""
$response = Read-Host "Did all navigation tests pass? (y/n)"
if ($response -eq "y") {
    Write-Host "✓ Navigation & Display tests passed" -ForegroundColor Green

} else {
    Write-Host "✗ Navigation & Display tests failed" -ForegroundColor Red
}
Write-Host ""

# Test 2: Status Update Component
Write-Host "Test 2: Status Update Component" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "1. Check StatusUpdate component in sidebar"
Write-Host "   Expected: Component visible with current status"
Write-Host ""
Write-Host "2. Open status dropdown"
Write-Host "   Expected: Shows only allowed transitions for current status"
Write-Host "   Example: If 'submitted' -> should show 'under_review', 'assigned'"
Write-Host ""
Write-Host "3. Select 'Under Review' status"
Write-Host ""
Write-Host "4. Add notes: 'Initial review started - test'"
Write-Host ""
Write-Host "5. Click 'Update Status' button"
Write-Host "   Expected: Success message appears"
Write-Host "   Expected: Page refreshes with new status"
Write-Host ""
$response = Read-Host "Did status update work? (y/n)"
if ($response -eq "y") {
    Write-Host "✓ Status Update Component tests passed" -ForegroundColor Green

} else {
    Write-Host "✗ Status Update Component tests failed" -ForegroundColor Red
}
Write-Host ""

# Test 3: Workflow History
Write-Host "Test 3: Workflow History" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "1. Scroll to 'Status History' section in sidebar"
Write-Host "   Expected: Previous status changes visible"
Write-Host ""
Write-Host "2. Check if your recent status change appears"
Write-Host "   Expected: 'Under Review' status shown"
Write-Host "   Expected: Date and your notes displayed"
Write-Host ""
Write-Host "3. Verify timeline format"
Write-Host "   Expected: Shows 'From: [old status]' and date"
Write-Host ""
$response = Read-Host "Is workflow history displaying correctly? (y/n)"
if ($response -eq "y") {
    Write-Host "✓ Workflow History tests passed" -ForegroundColor Green

} else {
    Write-Host "✗ Workflow History tests failed" -ForegroundColor Red
}
Write-Host ""

# Test 4: Multiple Status Transitions
Write-Host "Test 4: Multiple Status Transitions" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "Test the following transitions:"
Write-Host ""
Write-Host "1. Under Review -> Investigation"
Write-Host "   Notes: 'Escalating to investigation team'"
Write-Host ""
Write-Host "2. Investigation -> Pending Documentation"
Write-Host "   Notes: 'Need additional evidence from member'"
Write-Host ""
Write-Host "3. Pending Documentation -> Under Review"
Write-Host "   Notes: 'Documentation received, resuming review'"
Write-Host ""
Write-Host "4. Under Review -> Resolved"
Write-Host "   Notes: 'Claim resolved in member's favor'"
Write-Host ""
$response = Read-Host "Did all transitions work correctly? (y/n)"
if ($response -eq "y") {
    Write-Host "[PASS] Status Transitions tests passed" -ForegroundColor Green
}
else {
    Write-Host "[FAIL] Status Transitions tests failed" -ForegroundColor Red
}
Write-Host ""

# Test 5: Error Handling
Write-Host "Test 5: Error Handling" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "1. Try to update status without adding notes"
Write-Host "   Expected: Error message or validation (if required)"
Write-Host ""
Write-Host "2. Try invalid transition (if possible)"
Write-Host "   Expected: Error message about invalid transition"
Write-Host ""
Write-Host "3. Check browser console (F12)"
Write-Host "   Expected: No errors during normal operation"
Write-Host "   Expected: API calls to /api/claims/[claimNumber]/status"
Write-Host ""
$response = Read-Host "Is error handling working? (y/n)"
if ($response -eq "y") {
    Write-Host "✓ Error Handling tests passed" -ForegroundColor Green

} else {
    Write-Host "✗ Error Handling tests failed" -ForegroundColor Red
}
Write-Host ""

# Test 6: Browser Console Check
Write-Host "Test 6: Browser Console Check" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "Open Browser Console (F12) and check for:"
Write-Host ""
Write-Host "Expected console logs:"
Write-Host "  - GET /api/claims/CLM-2025-XXX (Status: 200)"
Write-Host "  - GET /api/claims/CLM-2025-XXX/workflow/history (Status: 200)"
Write-Host "  - PATCH /api/claims/CLM-2025-XXX/status (Status: 200)"
Write-Host ""
Write-Host "Should NOT see:"
Write-Host "  - 500 Internal Server Error"
Write-Host "  - 403 Forbidden (unless accessing unauthorized resource)"
Write-Host "  - 'invalid input syntax for type uuid' errors"
Write-Host "  - 'column does not exist' errors"
Write-Host ""
$response = Read-Host "Is console clean (no errors)? (y/n)"
if ($response -eq "y") {
    Write-Host "✓ Console Check passed" -ForegroundColor Green

} else {
    Write-Host "✗ Console Check failed" -ForegroundColor Red
}
Write-Host ""

# Test 7: Database Verification (Optional)
Write-Host "Test 7: Database Verification (Optional)" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "Run these SQL queries to verify data:"
Write-Host ""
Write-Host "-- Check claim status was updated" -ForegroundColor Yellow
Write-Host "SELECT claim_number, status, updated_at" -ForegroundColor Yellow
Write-Host "FROM public.claims" -ForegroundColor Yellow
Write-Host "WHERE claim_number = 'CLM-2025-003';" -ForegroundColor Yellow
Write-Host ""
Write-Host "-- Check workflow history records" -ForegroundColor Yellow
Write-Host "SELECT update_type, message, created_at, created_by" -ForegroundColor Yellow
Write-Host "FROM public.claim_updates" -ForegroundColor Yellow
Write-Host "WHERE claim_id = (SELECT claim_id FROM public.claims WHERE claim_number = 'CLM-2025-003')" -ForegroundColor Yellow
Write-Host "ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Yellow
Write-Host ""
$response = Read-Host "Did database checks confirm updates? (y/n/skip)"
if ($response -eq "y") {
    Write-Host "✓ Database Verification passed" -ForegroundColor Green
} elseif ($response -eq "skip") {
    Write-Host "⊘ Database Verification skipped" -ForegroundColor Yellow

} else {
    Write-Host "✗ Database Verification failed" -ForegroundColor Red
}
Write-Host ""

# Test 8: Second Claim Test
Write-Host "Test 8: Second Claim Test" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "1. Go back to workbench"
Write-Host ""
Write-Host "2. Open CLM-2025-004"
Write-Host "   Expected: Same LRO perspective"
Write-Host "   Expected: StatusUpdate component works"
Write-Host ""
Write-Host "3. Update status to test workflow on second claim"
Write-Host ""
$response = Read-Host "Does second claim work the same? (y/n)"
if ($response -eq "y") {
    Write-Host "✓ Second Claim tests passed" -ForegroundColor Green

} else {
    Write-Host "✗ Second Claim tests failed" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Testing Complete!" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If all tests passed, mark todo item complete"
Write-Host "2. Move to next todo: Test email notifications"
Write-Host "3. Document any issues found"
Write-Host ""

Write-Host "Known Limitations:" -ForegroundColor Yellow
Write-Host "- Email notifications not yet tested"
Write-Host "- Tenant ID hardcoded (works for single-tenant)"
Write-Host "- User mapping uses email lookup (Clerk -> Database UUID)"
Write-Host ""

