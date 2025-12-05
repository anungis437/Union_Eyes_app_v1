# Email Notification Testing - Quick Start

## ✅ Configuration Status
All email components are configured and ready to test!

```
✓ RESEND_API_KEY: Configured (re_UaoQtFB...ku7y)
✓ EMAIL_FROM: noreply@unionclaims.com
✓ EMAIL_REPLY_TO: support@unionclaims.com
✓ Email Service: lib/email-service.ts (Resend v6.4.2)
✓ Notifications: lib/claim-notifications.ts
✓ Templates: lib/email-templates.tsx (@react-email)
✓ Workflow Integration: workflow-engine.ts (with error handling)
```

## 📧 Email Recipients

### Test Claims
- **CLM-2025-003**: Assigned to LRO (info@nzilaventures.com)
- **CLM-2025-004**: Assigned to LRO (info@nzilaventures.com)

### Member Email
The **member** who submitted these claims will receive email notifications.
- Member ID: UUID from claims.member_id field
- Email: Fetched from Clerk user via memberId

**Important**: To find the actual member email:
1. Check Clerk dashboard for user associated with the claim's member_id
2. OR check server console logs when email is sent
3. OR check Resend dashboard after sending to see recipient

### LRO/Steward Email
You (info@nzilaventures.com) will receive emails for certain status changes:
- ✓ Assigned
- ✓ Investigation
- ✓ Pending Documentation
- ✓ Resolved

## 🚀 Quick Test Steps

### Step 1: Start Dev Server
```powershell
pnpm dev
```

### Step 2: Update Claim Status
1. Navigate to: http://localhost:3000/dashboard/workbench
2. Click "View Full Details" on CLM-2025-003
3. In StatusUpdate component:
   - Select status: "Under Review"
   - Add notes: "Testing email notification"
   - Click "Update Status"

### Step 3: Check Server Console
Look for this log in the terminal running `pnpm dev`:
```
Notification sent for claim [UUID]: under_review
```

OR check for errors:
```
Failed to send email notification: [error message]
```

### Step 4: Check Email Inbox
- **Member inbox**: Check email of member who submitted claim
- **Your inbox** (info@nzilaventures.com): You'll receive email if status is one of:
  - assigned, investigation, pending_documentation, resolved

### Step 5: Verify Email Content
Email should include:
- ✓ Subject: "Claim Under Review - [Claim Type] Claim"
- ✓ From: noreply@unionclaims.com
- ✓ Greeting with member name
- ✓ Status change: "from [old] to Under Review"
- ✓ Claim details box (ID, Title, Type)
- ✓ Your notes: "Testing email notification"
- ✓ Status badge (orange color for under_review)
- ✓ "View Claim" button
- ✓ Footer disclaimer

## 🎯 Test Scenarios

### Scenario 1: Basic Email (Member Only)
```
Status: Submitted → Under Review
Notes: "Initial review started"
Recipient: Member only
```

### Scenario 2: Steward Notification
```
Status: Under Review → Investigation
Notes: "Escalating to investigation team"
Recipients: Member + Steward (you)
```

### Scenario 3: Multiple Transitions
```
1. Investigation → Pending Documentation
2. Pending Documentation → Under Review
3. Under Review → Resolved

Each should send separate email with correct status
```

### Scenario 4: Resolved Status
```
Status: Under Review → Resolved
Notes: "Claim resolved in member's favor"
Recipients: Member + Steward (you)
Email: Green "Resolved" badge
```

## 🔍 Troubleshooting

### No Email Received?
1. **Check server console**: Look for "Notification sent" or error message
2. **Check spam folder**: Email might be filtered
3. **Verify Resend API key**: Should be 36 characters starting with "re_"
4. **Check Resend dashboard**: https://resend.com/emails
5. **Verify member email**: Check Clerk user has valid email address

### Email Sends But Status Update Fails?
**This should NOT happen!** Email is async and won't block status update.
- If it does, check workflow-engine.ts error handling

### Status Updates But No Email?
1. Check console for "Failed to send email notification"
2. Common causes:
   - Invalid member_id in claims table
   - Clerk user not found or has no email
   - Resend API error (check Resend dashboard)
   - RESEND_API_KEY invalid or expired

### Want to Test Without Sending Real Emails?
```powershell
# Stop dev server
# Comment out RESEND_API_KEY in .env.local
# RESEND_API_KEY=re_UaoQtFBw_81TGGt3pTKedNNNkiFU8ku7y

# Restart dev server
pnpm dev

# Update status - email won't send but app works fine
# Console will show: "RESEND_API_KEY not configured. Email will not be sent."
```

## 📊 Resend Dashboard

Check sent emails at: https://resend.com/emails
- See all emails sent from your API key
- View delivery status (Sent/Delivered/Failed)
- Preview email HTML
- Check bounce/complaint rates
- View error details if failed

## ✅ Success Criteria

Mark "Test email notifications end-to-end" complete when:
- [x] Email configuration verified (test-email-config.js passed)
- [ ] Status update triggers email (console confirms)
- [ ] Email received in member's inbox
- [ ] Email content matches claim details
- [ ] Status badges display correct colors
- [ ] "View Claim" link works
- [ ] Multiple status transitions = multiple emails
- [ ] Steward receives email for appropriate statuses
- [ ] Status updates succeed even if email fails

## 📝 Testing Checklist

Run through these tests:

```
□ Test 1: Configuration check (node test-email-config.js) ✓ DONE
□ Test 2: Basic status update with console monitoring
□ Test 3: Verify email received in inbox
□ Test 4: Test multiple status transitions (4 emails)
□ Test 5: Verify steward notification (you should get email)
□ Test 6: Check email template quality (colors, links, etc)
□ Test 7: Test error handling (graceful degradation)
□ Test 8: Check Resend dashboard for delivery status
□ Test 9: Test second claim (CLM-2025-004)
□ Test 10: Database verification (status_change records)
```

## 🎉 Next Todo After Completion

Once all tests pass:
```powershell
# Update todo list
# Mark "Test email notifications end-to-end" as complete
# Move to: "Resolve tenant ID hardcoding"
```

## 📚 Documentation Files
- **Detailed test plan**: `test-email-notifications.md`
- **Config test script**: `test-email-config.js` (already run ✓)
- **This quick reference**: `email-test-quickstart.md`

---

**Current Status**: Ready to test! 🚀
**Next Action**: Update claim status and check for emails
