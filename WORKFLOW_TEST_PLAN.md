# Workflow UI Testing Plan

## Test Environment
- **User**: info@nzilaventures.com
- **Role**: LRO (Labor Relations Officer)
- **Assigned Claims**: CLM-2025-003, CLM-2025-004
- **Server**: http://localhost:3000

## Test Cases

### 1. Navigation & Display
- [x] Navigate to workbench (/dashboard/workbench)
- [x] Verify 2 assigned claims are displayed
- [x] Click "View Full Details" on a claim
- [x] Verify claim detail page loads with LRO perspective
- [x] Verify "Assigned to You" card is visible
- [x] Verify "Back to Assigned Claims" button (not "My Claims")
- [x] Verify labels show "Member's Desired Outcome" (not "Your Desired Outcome")

### 2. Status Update Component
- [ ] Verify StatusUpdate component is visible in sidebar
- [ ] Check current status is displayed correctly
- [ ] Open status dropdown - verify it shows allowed transitions only
- [ ] Select a new status
- [ ] Add notes in the text area
- [ ] Click "Update Status" button
- [ ] Verify success message appears
- [ ] Verify claim status updates in the UI

### 3. Workflow History
- [ ] Verify workflow history section is visible
- [ ] Check if existing status transitions are displayed
- [ ] After status update, verify new entry appears in history
- [ ] Verify history shows: status change, date, notes

### 4. Workflow Transitions (Test Each Status)

#### From: submitted → under_review
- [ ] Select "Under Review" from dropdown
- [ ] Add note: "Initial review started"
- [ ] Submit and verify success

#### From: under_review → investigation
- [ ] Select "Investigation" from dropdown
- [ ] Add note: "Escalating to investigation team"
- [ ] Submit and verify success

#### From: investigation → pending_documentation
- [ ] Select "Pending Documentation" from dropdown
- [ ] Add note: "Need additional evidence from member"
- [ ] Submit and verify success

#### From: pending_documentation → under_review
- [ ] Select "Under Review" from dropdown
- [ ] Add note: "Documentation received, resuming review"
- [ ] Submit and verify success

#### From: under_review → resolved
- [ ] Select "Resolved" from dropdown
- [ ] Add note: "Claim resolved in member's favor"
- [ ] Submit and verify success

### 5. Data Validation
- [ ] Verify notes field validation (required for status changes)
- [ ] Try to update without notes - should show error
- [ ] Verify only allowed transitions appear in dropdown
- [ ] Check console for any errors

### 6. Multi-User Scenarios
- [ ] Open claim in two browser tabs
- [ ] Update status in one tab
- [ ] Refresh other tab - verify updated status appears

### 7. Error Handling
- [ ] Disconnect network, try status update - verify error message
- [ ] Try invalid status transition - verify validation works
- [ ] Check console logs for API errors

## Expected Behavior

### Successful Status Update:
1. User selects new status from dropdown
2. User enters notes explaining the change
3. User clicks "Update Status"
4. System validates the transition is allowed
5. System updates claim status in database
6. System creates workflow history record
7. System sends email notification to member
8. UI shows success message
9. Claim detail refreshes with new status
10. Workflow history shows new entry

### Status Update API Flow:
```
POST /api/claims/[claimNumber]/status
Body: {
  newStatus: "under_review",
  notes: "Initial review started",
  userId: "00000000-0000-0000-0000-000000000101"
}

Response: {
  success: true,
  message: "Claim status updated successfully"
}
```

## Console Log Monitoring

Watch for these in browser console:
- Status update requests (POST /api/claims/[id]/status)
- Workflow history fetches (GET /api/claims/[id]/workflow/history)
- Email notification logs (if configured)
- Any 500 or 403 errors

## Database Verification

After status update, check database:
```sql
-- Check claim status was updated
SELECT claim_number, status, updated_at 
FROM public.claims 
WHERE claim_number = 'CLM-2025-003';

-- Check workflow history record was created
SELECT * FROM public.claim_updates 
WHERE claim_id = (SELECT claim_id FROM public.claims WHERE claim_number = 'CLM-2025-003')
ORDER BY created_at DESC
LIMIT 5;
```

## Known Issues
- Email notifications not yet tested (next todo item)
- Tenant ID hardcoded (works for single-tenant testing)

## Success Criteria
- ✅ All navigation works correctly
- ✅ LRO perspective is consistent throughout
- ✅ Status updates save successfully
- ✅ Workflow history displays correctly
- ✅ No console errors during normal operation
- ⏸️ Email notifications sent (to be tested separately)
