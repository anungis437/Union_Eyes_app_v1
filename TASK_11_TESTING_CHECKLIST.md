# Task 11: Phase 1 Testing Checklist

**Status:** In Progress  
**Started:** November 13, 2025  
**Estimated Time:** 2 hours  
**Purpose:** Verify Tasks 2-5 work correctly with real data before proceeding to new features

## Testing Environment

- **Dev Server:** Running on http://localhost:3001
- **Database:** Azure PostgreSQL Staging (unioneyes-staging-db)
- **Branch:** phase-1-foundation
- **Test User:** Logged in via Clerk

---

## Test Suite Overview

This checklist covers manual testing of:
1. ✅ Dashboard Integration (Task 2)
2. Claims Page Integration (Task 3)
3. Workbench Integration (Task 4)
4. File Upload Infrastructure (Task 5)

---

## 1. Dashboard Integration Testing

### 1.1 Dashboard Stats Display
- [ ] Navigate to `/dashboard`
- [ ] Verify dashboard loads without errors
- [ ] Check that stats cards display:
  - [ ] Active Claims count
  - [ ] Pending Reviews count  
  - [ ] Resolved Cases count
  - [ ] High Priority count
- [ ] Verify "Real-time stats from database" note is visible
- [ ] Check that "Resolution Rate" calculation shows (e.g., "20%")

**Expected Results:**
- All stats should show numeric values (not "0" unless database is empty)
- No error toasts or console errors
- Stats should match actual database data

**Status:** ⏳ Pending

---

## 2. Claims Page Integration Testing

### 2.1 Claims List Display
- [ ] Navigate to `/dashboard/claims`
- [ ] Verify claims list loads
- [ ] Check for loading spinner during fetch
- [ ] Verify claims display with:
  - [ ] Claim number (e.g., "CLM-2025-001")
  - [ ] Claim type badge (colored)
  - [ ] Status badge (colored)
  - [ ] Priority badge
  - [ ] Incident date
  - [ ] Description preview

**Expected Results:**
- Claims should load from database (not mock data)
- Loading states should appear briefly
- No errors in console

**Status:** ⏳ Pending

---

### 2.2 Claims Filtering
- [ ] Test "All Claims" filter
- [ ] Test filtering by status:
  - [ ] Submitted
  - [ ] Under Review
  - [ ] Investigation
  - [ ] Pending Documentation
  - [ ] Resolved
  - [ ] Rejected
- [ ] Test filtering by priority:
  - [ ] Low
  - [ ] Medium
  - [ ] High
  - [ ] Critical
- [ ] Test filtering by type:
  - [ ] Workplace Safety
  - [ ] Grievance (Pay, Schedule, Discipline)
  - [ ] Discrimination

**Expected Results:**
- Filter dropdowns should work
- Claims list should update based on filters
- Counter should show correct filtered count

**Status:** ⏳ Pending

---

### 2.3 New Claim Creation
- [ ] Click "File New Claim" button
- [ ] Navigate to `/dashboard/claims/new`
- [ ] Fill out claim form:
  - [ ] Select claim category
  - [ ] Set incident date
  - [ ] Enter location
  - [ ] Enter description (min 20 chars)
  - [ ] Enter desired outcome
  - [ ] Toggle witnesses present
  - [ ] Toggle previously reported
  - [ ] Toggle anonymous submission
- [ ] Submit form
- [ ] Verify success toast appears
- [ ] Verify redirect to claims list
- [ ] Verify new claim appears in list

**Expected Results:**
- Form validation should work
- Claim should save to database
- Redirect should happen after success
- New claim should have auto-generated claim number

**Status:** ⏳ Pending

---

### 2.4 Claim Detail View
- [ ] Click on a claim from the list
- [ ] Navigate to `/dashboard/claims/[id]`
- [ ] Verify claim details display:
  - [ ] Claim number
  - [ ] Status and priority badges
  - [ ] Incident date and location
  - [ ] Full description
  - [ ] Desired outcome
  - [ ] Witness information
  - [ ] Previous report details (if applicable)

**Expected Results:**
- All claim fields should display correctly
- No missing data
- Sidebar should show claim metadata

**Status:** ⏳ Pending

---

## 3. Workbench Integration Testing

### 3.1 Assigned Claims Display
- [ ] Log in as a steward/admin user
- [ ] Navigate to `/dashboard/workbench`
- [ ] Verify "My Assigned Claims" section loads
- [ ] Check that assigned claims display with:
  - [ ] Claim number
  - [ ] Member name (if not anonymous)
  - [ ] Claim type
  - [ ] Status
  - [ ] Priority
  - [ ] Days open calculation

**Expected Results:**
- Only claims assigned to current user should display
- Empty state if no assignments
- No errors loading data

**Status:** ⏳ Pending (requires steward account)

---

### 3.2 Claim Assignment
- [ ] Create test claims from different accounts
- [ ] Assign claims to steward accounts
- [ ] Verify assignments appear in workbench
- [ ] Test unassigning claims
- [ ] Verify removal from workbench

**Expected Results:**
- Assignment should update database
- Workbench should reflect changes immediately
- Only authorized users can assign claims

**Status:** ⏳ Pending (requires multiple test accounts)

---

## 4. File Upload Infrastructure Testing

### 4.1 File Upload on New Claim
- [ ] Navigate to `/dashboard/claims/new`
- [ ] Fill out claim form
- [ ] Test file upload section:
  - [ ] Click "Choose files" button
  - [ ] Select valid file (PDF, image, doc)
  - [ ] Verify file appears in preview
  - [ ] Check file size display
  - [ ] Check file type icon
- [ ] Test drag-and-drop:
  - [ ] Drag file over upload area
  - [ ] Verify blue border appears
  - [ ] Drop file
  - [ ] Verify file added to list
- [ ] Submit claim with attachments
- [ ] Verify files upload successfully

**Expected Results:**
- File validation should work (10MB limit)
- Only allowed file types accepted
- Files should upload after claim creation
- Success toast should appear

**Status:** ⏳ Pending (requires BLOB_READ_WRITE_TOKEN)

---

### 4.2 File Upload on Claim Detail Page
- [ ] Navigate to existing claim detail page
- [ ] Locate file upload section
- [ ] Upload additional files:
  - [ ] PDF document
  - [ ] Image (JPG/PNG)
  - [ ] Word document
  - [ ] Excel spreadsheet
- [ ] Verify files appear in attachments list
- [ ] Check metadata displays:
  - [ ] File name
  - [ ] File size
  - [ ] Upload date
  - [ ] Uploaded by (user)

**Expected Results:**
- Files should upload immediately
- Attachment list should update
- File icons should match type
- No duplicate uploads

**Status:** ⏳ Pending (requires BLOB_READ_WRITE_TOKEN)

---

### 4.3 File Download
- [ ] Click on uploaded file name
- [ ] Verify file downloads or opens
- [ ] Test with different file types
- [ ] Verify correct file content

**Expected Results:**
- Files should download correctly
- No 404 errors
- File content should match uploaded file

**Status:** ⏳ Pending (requires BLOB_READ_WRITE_TOKEN)

---

### 4.4 File Deletion
- [ ] Click delete button on attachment
- [ ] Verify confirmation required
- [ ] Confirm deletion
- [ ] Verify file removed from list
- [ ] Verify database updated (metadata removed)

**Expected Results:**
- Confirmation dialog should appear
- File reference removed from database
- File stays in Blob storage (audit trail)
- UI updates immediately

**Status:** ⏳ Pending (requires BLOB_READ_WRITE_TOKEN)

---

### 4.5 File Access Control
- [ ] Log in as claim owner
- [ ] Upload file to own claim
- [ ] Log out and log in as different user
- [ ] Attempt to access file
- [ ] Verify access denied (unless assigned steward)

**Expected Results:**
- Only claim owner or assigned steward can access files
- 403 error for unauthorized users
- No file URLs exposed to unauthorized users

**Status:** ⏳ Pending (requires multiple test accounts)

---

### 4.6 File Validation
- [ ] Test uploading invalid file types:
  - [ ] .exe file
  - [ ] .zip file
  - [ ] .mp4 video
- [ ] Test uploading file > 10MB
- [ ] Verify error messages display
- [ ] Verify upload blocked

**Expected Results:**
- Invalid file types rejected
- Oversized files rejected
- Clear error messages shown
- No files uploaded to Blob storage

**Status:** ⏳ Pending

---

## 5. Integration Testing

### 5.1 End-to-End Claim Flow
- [ ] Create new claim
- [ ] Attach files during creation
- [ ] Submit claim
- [ ] Verify claim appears in list
- [ ] Verify dashboard stats updated
- [ ] Navigate to claim detail
- [ ] Upload additional file
- [ ] Verify all files display
- [ ] Download files to verify
- [ ] Delete one file
- [ ] Verify file removed

**Expected Results:**
- Complete flow works without errors
- Data persists across pages
- Stats update in real-time
- All features integrate seamlessly

**Status:** ⏳ Pending

---

### 5.2 Database Connection Health
- [ ] Check database connection status
- [ ] Verify no connection timeouts
- [ ] Check for connection pool exhaustion
- [ ] Monitor query performance

**Expected Results:**
- All database queries should complete < 2s
- No connection errors in console
- No timeout errors

**Status:** ⏳ Pending

---

### 5.3 Error Handling
- [ ] Test with network offline
- [ ] Test with invalid data
- [ ] Test with missing required fields
- [ ] Verify error messages display
- [ ] Verify no data corruption

**Expected Results:**
- User-friendly error messages
- No app crashes
- Data integrity maintained

**Status:** ⏳ Pending

---

## 6. Known Issues & Limitations

### Database Seeding Issue
**Problem:** Seed script fails with "password authentication failed for user 'AubertNungisa'"

**Root Cause:** 
- Postgres library falls back to Windows username when DATABASE_URL not found
- TypeScript/ESM modules load statically, causing timing issues with dotenv
- Dev server works fine (Next.js loads .env.local automatically)

**Workaround:**
- ✅ Manual testing via browser (dev server running)
- ❌ Seed script needs fixing (see solutions below)

**Potential Solutions:**
1. Create `.env` file (Next.js loads this for scripts)
2. Use `--env-file` flag with tsx
3. Rewrite seed script to use dynamic imports
4. Test via API routes in browser console

**Status:** BLOCKED - Manual testing only

---

### File Upload Requires Configuration
**Problem:** BLOB_READ_WRITE_TOKEN not set in environment

**Impact:**
- File uploads will fail
- Cannot test Task 5 functionality fully

**Solution:**
1. Get token from Vercel Dashboard → Storage → Blob Store → Settings
2. Add to .env.local: `BLOB_READ_WRITE_TOKEN=vercel_blob_...`
3. Restart dev server

**Status:** ⚠️ CONFIGURATION NEEDED

---

## 7. Test Results Summary

### Completed Tests
- [ ] Dashboard stats (0/5)
- [ ] Claims list display (0/4)
- [ ] Claims filtering (0/3)
- [ ] New claim creation (0/1)
- [ ] Claim detail view (0/1)
- [ ] Workbench assigned claims (0/2)
- [ ] File upload new claim (0/1)
- [ ] File upload detail page (0/1)
- [ ] File download (0/1)
- [ ] File deletion (0/1)
- [ ] File access control (0/1)
- [ ] File validation (0/1)
- [ ] End-to-end flow (0/1)

**Total Progress:** 0/19 tests completed (0%)

---

### Critical Issues Found
None yet - testing in progress

---

### Minor Issues Found
None yet - testing in progress

---

### Recommendations
1. Fix seed script database connection issue
2. Configure BLOB_READ_WRITE_TOKEN for file upload testing
3. Create multiple test accounts (member, steward, admin)
4. Consider adding automated E2E tests (Task 10)

---

## 8. Next Steps After Testing

### If All Tests Pass
- ✅ Mark Task 11 as complete
- ✅ Update PHASE_1_PROGRESS.md
- ✅ Commit testing documentation
- ✅ Choose next task:
  - Option A: Task 6 (Workflow Engine)
  - Option B: Task 7 (Email Notifications)
  - Option C: Task 8 (Members Page)

### If Issues Found
- 🐛 Create issue list with priority
- 🔧 Fix critical issues first
- 📝 Document workarounds for minor issues
- ♻️ Retest after fixes

---

## Testing Log

### Session 1: November 13, 2025

**Time Started:** [Current Time]  
**Tester:** AI Assistant  
**Environment:** Local dev server on port 3001

**Tests Completed:**
- ✅ Dev server successfully started
- ✅ Opened dashboard in Simple Browser
- ⏳ Waiting for manual testing results

**Issues Encountered:**
- ❌ Seed script fails due to database authentication
- ⚠️ BLOB_READ_WRITE_TOKEN not configured (file uploads will fail)

**Notes:**
- Dev server connects to database successfully
- Dashboard page loads without errors
- Need to configure Vercel Blob storage for file upload testing
- Consider alternative approach to seed script (API route, manual creation, or .env file)

---

## Appendix: Test Data Requirements

### Required Test Accounts
1. **Member Account** (Regular user)
   - Can create claims
   - Can view own claims
   - Can upload files to own claims

2. **Steward Account** (Union representative)
   - Can view assigned claims
   - Can update claim status
   - Can access files for assigned claims

3. **Admin Account** (System administrator)
   - Can view all claims
   - Can assign claims to stewards
   - Can access all files

### Required Test Claims
1. **New Submission** (status: submitted, priority: medium)
2. **Under Review** (status: under_review, priority: high, assigned to steward)
3. **Investigation** (status: investigation, priority: critical, with attachments)
4. **Resolved** (status: resolved, priority: low, with resolution notes)
5. **Anonymous Claim** (isAnonymous: true, status: submitted)

### Required Test Files
1. **PDF Document** (employment_contract.pdf, ~500KB)
2. **Image** (incident_photo.jpg, ~2MB)
3. **Word Document** (witness_statement.docx, ~100KB)
4. **Excel Spreadsheet** (pay_records.xlsx, ~300KB)
5. **Large File** (test_video.mp4, >10MB) - for validation testing

---

*Last Updated: November 13, 2025*
