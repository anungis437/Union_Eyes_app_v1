# Email Notifications Test Plan

## Overview
Test end-to-end email notification functionality for claim status changes.

## Prerequisites
✅ Dev server running on localhost:3000
✅ Logged in as: info@nzilaventures.com (LRO)
✅ RESEND_API_KEY configured in .env.local
✅ Test claims: CLM-2025-003, CLM-2025-004

## Email Service Configuration

### Current Setup
- **Email Service**: Resend (https://resend.com)
- **API Key**: Configured in `.env.local` as `RESEND_API_KEY=re_UaoQtFBw_81TGGt3pTKedNNNkiFU8ku7y`
- **From Email**: `noreply@unionclaims.com` (configurable via `EMAIL_FROM`)
- **Reply-To**: `support@unionclaims.com` (configurable via `EMAIL_REPLY_TO`)

### Email Flow
1. User updates claim status via StatusUpdate component
2. `updateClaimStatus()` in workflow-engine validates transition
3. On success, calls `sendClaimStatusNotification()` asynchronously
4. Email service fetches member details from Clerk
5. Email template renders with claim details
6. Resend API sends email to member (and steward if assigned)

## Test Cases

### Test 1: Check Email Configuration
**Goal**: Verify Resend API key is configured

```powershell
# Check .env.local file
Get-Content .env.local | Select-String "RESEND_API_KEY"
```

**Expected**: Should show `RESEND_API_KEY=re_UaoQtFBw_...`

---

### Test 2: Update Claim Status and Monitor Console
**Goal**: Trigger email notification and verify console logs

**Steps**:
1. Open browser console (F12)
2. Navigate to http://localhost:3000/dashboard/claims/CLM-2025-003
3. Update status from current → "Under Review"
4. Add notes: "Testing email notification - under review"
5. Click "Update Status"

**Expected Console Logs**:
- ✅ "Notification sent for claim [UUID]: under_review"
- ✅ No error messages about email sending
- OR ❌ "Failed to send email notification: [error]"

**Where to check**:
- Browser console (client-side)
- Terminal running `pnpm dev` (server-side logs)

---

### Test 3: Verify Email Received
**Goal**: Confirm email arrives at member's inbox

**Steps**:
1. After Test 2, check email inbox for member
2. Member email should be from Clerk user linked to claim
3. Look for email with subject: "Claim Under Review - [Claim Title]"

**Expected Email**:
- **From**: noreply@unionclaims.com
- **To**: Member email (from Clerk user)
- **Subject**: "Claim Under Review - [Claim Type] Claim"
- **Content**:
  - Greeting with member name
  - Status change message (from → to)
  - Claim ID, Title, Type
  - Status badge with color
  - Notes from status update
  - "View Claim" button linking to claim detail page

**If email not received**:
- Check spam/junk folder
- Verify RESEND_API_KEY is valid
- Check Resend dashboard for delivery status
- Review server logs for error messages

---

### Test 4: Test Multiple Status Transitions
**Goal**: Verify emails sent for each transition

**Transitions to test**:
1. Under Review → Investigation
   - Notes: "Escalating to investigation - email test"
2. Investigation → Pending Documentation
   - Notes: "Additional evidence required - email test"
3. Pending Documentation → Under Review
   - Notes: "Documentation received - email test"
4. Under Review → Resolved
   - Notes: "Claim resolved in member's favor - email test"

**Expected**:
- 4 separate emails received (one per transition)
- Each email shows correct status change
- Each email includes the notes provided
- Console logs confirm email sent for each

---

### Test 5: Test Steward Notification
**Goal**: Verify steward receives notification when appropriate

**Setup**:
- Claim must be assigned to a steward
- Test claim CLM-2025-003 is assigned to UUID ending in ...0101

**Steps**:
1. Update status to one that notifies steward:
   - "Assigned", "Investigation", "Pending Documentation", or "Resolved"
2. Check both member and steward inboxes

**Expected**:
- Member receives email ✅
- Steward receives email ✅ (same content)
- Console log shows email sent to both recipients

**Note**: Steward email is fetched from Clerk using `assignedTo` field.

---

### Test 6: Test Email Template Rendering
**Goal**: Verify email HTML renders correctly

**Check these elements in received email**:
- [ ] Header with "Union Claims Portal" branding
- [ ] Status badge with appropriate color:
  - Under Review: Orange (#f59e0b)
  - Investigation: Orange (#f59e0b)
  - Pending Documentation: Red (#ef4444)
  - Resolved: Green (#10b981)
- [ ] Claim details box with ID, Title, Type, Status
- [ ] Notes section (if notes provided)
- [ ] "View Claim" button that links to correct URL
- [ ] Footer with automated notification disclaimer
- [ ] Responsive design (test on mobile if possible)

---

### Test 7: Test Error Handling
**Goal**: Verify graceful handling of email failures

**Scenario 1: Invalid member email**
- This would require database manipulation (skip for now)

**Scenario 2: Network error**
- Monitor console for error handling
- Status update should succeed even if email fails
- Console should log: "Failed to send email notification: [error]"

**Expected Behavior**:
- Status update ALWAYS succeeds
- Email failures are logged but don't block updates
- User sees success message regardless of email status

---

### Test 8: Test Email Service Configuration
**Goal**: Verify email service handles missing configuration

**Steps**:
1. Stop dev server
2. Temporarily comment out `RESEND_API_KEY` in .env.local:
   ```
   # RESEND_API_KEY=re_UaoQtFBw_81TGGt3pTKedNNNkiFU8ku7y
   ```
3. Restart dev server
4. Update claim status

**Expected**:
- Status update succeeds ✅
- Console warns: "RESEND_API_KEY not configured. Email will not be sent."
- No email sent (graceful degradation)

**Restore after test**:
```powershell
# Uncomment RESEND_API_KEY in .env.local
# Restart dev server
```

---

### Test 9: Check Resend Dashboard
**Goal**: Verify emails in Resend service dashboard

**Steps**:
1. Log in to Resend dashboard: https://resend.com/emails
2. Check recent emails sent

**Expected**:
- All test emails appear in dashboard
- Delivery status shows "Delivered" (or "Sent")
- Click to view email preview
- Check any delivery errors

---

### Test 10: Test Second Claim
**Goal**: Ensure notifications work for multiple claims

**Steps**:
1. Navigate to CLM-2025-004
2. Update status with notes: "Testing second claim email"
3. Check email inbox

**Expected**:
- Email received for CLM-2025-004
- Correct claim ID in email
- All details match CLM-2025-004 (not CLM-2025-003)

---

## Database Verification

### Check Email was Triggered
```sql
-- Check recent status updates (these trigger emails)
SELECT 
  cu.update_type,
  cu.message,
  cu.created_at,
  c.claim_number,
  c.status
FROM public.claim_updates cu
JOIN public.claims c ON cu.claim_id = c.claim_id
WHERE c.claim_number IN ('CLM-2025-003', 'CLM-2025-004')
  AND cu.update_type = 'status_change'
ORDER BY cu.created_at DESC
LIMIT 10;
```

**Expected**: Each status update should have a corresponding row.

---

## Implementation Notes

### Email Service Files
- **Email Service**: `lib/email-service.ts`
  - Handles Resend API integration
  - Lazy-initializes Resend client
  - Gracefully handles missing API key

- **Claim Notifications**: `lib/claim-notifications.ts`
  - `sendClaimStatusNotification()`: Main entry point
  - Fetches claim and user details from database and Clerk
  - Determines recipients (member + steward for certain statuses)
  - Renders email template and sends

- **Email Templates**: `lib/email-templates.tsx`
  - React Email components for responsive HTML
  - `ClaimStatusNotificationEmail`: Main template
  - Styled with inline CSS for email compatibility

- **Workflow Engine**: `lib/workflow-engine.ts`
  - Line 192: Calls `sendClaimStatusNotification()` after successful status update
  - Async call with error catching (doesn't block status update)

### Steward Notification Statuses
Stewards receive emails for these status changes:
- `assigned`
- `investigation`
- `pending_documentation`
- `resolved`

### Current Limitations
1. **Deadline tracking**: Not implemented in schema
   - Email template has placeholders for deadline/daysRemaining
   - `sendOverdueClaimNotification()` is a stub
   
2. **Email tracking**: No database log of sent emails
   - Consider adding email_logs table in future
   
3. **Email preferences**: No user preference for notifications
   - All members receive all emails

4. **Tenant ID**: Hardcoded in many places
   - Email functionality works but tenant-aware filtering needed

---

## Success Criteria

✅ **Configuration**:
- [ ] RESEND_API_KEY is set in .env.local
- [ ] Email service initializes without errors
- [ ] Server logs show no email configuration errors

✅ **Functionality**:
- [ ] Emails sent for status updates (console confirms)
- [ ] Emails received in member inbox
- [ ] Email content matches claim details
- [ ] Status update succeeds even if email fails
- [ ] Multiple status transitions = multiple emails

✅ **Template Quality**:
- [ ] Email renders correctly (all sections visible)
- [ ] Links work (View Claim button)
- [ ] Colors/badges display correctly
- [ ] Responsive design works

✅ **Error Handling**:
- [ ] Missing API key: graceful warning, status update succeeds
- [ ] Invalid email: logged error, status update succeeds
- [ ] Network error: logged error, status update succeeds

---

## Known Issues & Workarounds

### Issue 1: Member Email Lookup
**Problem**: Emails are fetched from Clerk using `memberId` from claims table.
**Workaround**: Ensure all claims have valid `memberId` that matches Clerk user ID.

### Issue 2: Resend Sandbox Mode
**Problem**: Resend free tier may have sandbox restrictions.
**Workaround**: 
- Verify domain ownership in Resend dashboard
- Or use verified test email addresses
- Check Resend documentation for sandbox limitations

### Issue 3: Email Delivery Delays
**Problem**: Emails may take a few seconds to arrive.
**Workaround**: Wait 30-60 seconds before checking inbox.

---

## Next Steps After Testing

1. **If emails work**:
   - Mark todo item complete ✅
   - Move to "Resolve tenant ID hardcoding"

2. **If emails don't work**:
   - Review Resend API key validity
   - Check domain verification in Resend
   - Review server logs for detailed errors
   - Verify Clerk user has email address
   - Test with curl/Postman to isolate issue

3. **Future enhancements**:
   - Add deadline tracking to schema and emails
   - Implement email preferences
   - Add email logs table for audit trail
   - Create templates for other notification types
   - Add email preview in dev mode
