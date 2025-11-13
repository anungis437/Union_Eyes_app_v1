# 🎯 Phase 1: What to Do Next

**Last Updated:** November 2025 (After Task 3 completion)

---

## ✅ Task 3 Complete!

The claims page now fetches real data from your PostgreSQL database instead of showing mock cases. All changes are committed to the `phase-1-foundation` branch.

---

## 🧪 IMMEDIATE ACTION: Test the Claims Page (15 minutes)

### Step 1: Get Your Clerk User ID

**Option A - From Clerk Dashboard:**
1. Go to https://dashboard.clerk.com
2. Click "Users" in sidebar
3. Find your test user
4. Copy the User ID (starts with `user_...`)

**Option B - From Browser:**
1. Start dev server: `pnpm run dev`
2. Log in to your app
3. Open Browser DevTools (F12)
4. Go to Network tab
5. Navigate to any protected page
6. Find request to `/api/claims` or similar
7. Check request headers for user ID

### Step 2: Seed Test Data

```powershell
# Replace YOUR_USER_ID with the ID from Step 1
npx tsx scripts/seed-test-claims.ts YOUR_USER_ID
```

Expected output:
```
🌱 Seeding test claims for Phase 1 development...
✅ Using member ID: user_2abc123...
✅ Created claim: CLM-2025-1234 (Wage & Hour)
✅ Created claim: CLM-2025-5678 (Safety)
✅ Created claim: CLM-2025-9012 (Scheduling)
✅ Created claim: CLM-2025-3456 (Discrimination)
✅ Created claim: CLM-2025-7890 (Discipline)
✅ Successfully seeded 5 test claims!
```

### Step 3: Test the UI

```powershell
pnpm run dev
```

Then:
1. Navigate to http://localhost:3000/dashboard/claims
2. **Verify:** You see 5 claims (not the old mock data with CASE-001, CASE-002, CASE-003)
3. **Verify:** Claim numbers start with "CLM-2025-"
4. **Test Search:** Type keywords like "overtime", "safety", "schedule"
5. **Test Filters:** Click status buttons (All, Pending, In Review, Resolved)
6. **Test Expansion:** Click on a claim card to see full details
7. **Check Console:** Open DevTools → Console → Should have no errors

### Expected Results

**Status Counts:**
- All: 5 claims
- Pending: 1 claim
- In Review: 3 claims
- Resolved: 1 claim

**Priority Counts:**
- Urgent: 1 claim (workplace safety)
- High: 2 claims (pay dispute, discrimination)
- Medium: 2 claims (schedule, discipline)

---

## 🚀 NEXT TASK: Connect Workbench to Database (3 hours)

The workbench shows claims assigned to union stewards. Since you've completed the claims page, the workbench is the natural next step.

### What You'll Build

1. **API Route:** `/app/api/workbench/assigned/route.ts`
   - Fetches claims where `assignedTo = currentUserId`
   - Uses existing `getClaimsAssignedToUser()` helper

2. **Update Workbench Page:** `/app/dashboard/workbench/page.tsx`
   - Similar pattern to claims page (useEffect + fetch)
   - Display assigned claims with action buttons
   - Add "Take Case" button for unassigned claims

3. **Assignment UI:**
   - Button on claim details: "Assign to Me"
   - Updates claim.assignedTo field
   - Sends notification to member (future enhancement)

### Why This Next?

- **Similar patterns:** Reuse the data fetching approach from claims page
- **High value:** Stewards need to see their workload
- **Foundation:** Required before workflow engine (Task 6)
- **Quick win:** ~3 hours to complete

### To Start Task 4

When you're ready:
```
"proceed with Task 4: workbench integration"
```

I'll guide you through:
1. Creating the `/api/workbench/assigned` route
2. Updating the workbench page component
3. Adding assignment functionality
4. Testing with multiple users

---

## 📊 Phase 1 Status

**Progress:** 27% Complete (3/11 tasks)

### Completed ✅
- [x] Task 1: Create git branch
- [x] Task 2: Connect dashboard to database
- [x] Task 3: Connect claims page to database

### In Progress 🟡
- [ ] Task 11: Test claims page with seed data ← **DO THIS NOW**

### Up Next ⏸️
- [ ] Task 4: Connect workbench to database (3 hours)
- [ ] Task 5: File upload infrastructure (6 hours)
- [ ] Task 6: Basic workflow engine (8 hours)
- [ ] Task 7: Email notifications (6 hours)
- [ ] Task 8: Members page (4 hours)
- [ ] Task 9: CSV import (12 hours)
- [ ] Task 10: E2E testing (4 hours)

**Estimated Time to Phase 1 Complete:** ~40 hours (4-5 weeks at 10 hrs/week)

---

## 📁 Key Files Changed

### Just Modified
- `app/dashboard/claims/page.tsx` - Now fetches from database
- `scripts/seed-test-claims.ts` - Improved with CLI args
- `TASK_3_COMPLETE.md` - Full documentation of changes

### Previously Created
- `db/schema/claims.ts` - Database table schema
- `db/queries/claims-queries.ts` - 11 reusable query functions
- `app/api/claims/route.ts` - GET/POST endpoints
- `app/api/dashboard/stats/route.ts` - Dashboard metrics
- `PHASE_1_PROGRESS.md` - Overall progress tracking

---

## 🆘 Troubleshooting

### Issue: No claims showing

**Check:**
1. Did you run the seed script with your real Clerk user ID?
2. Is the dev server running? (`pnpm run dev`)
3. Are you logged in with the same user whose ID you used for seeding?
4. Check browser console for errors (F12 → Console)
5. Check Network tab - does `/api/claims` return 200?

**Fix:**
```powershell
# Re-run seed script with correct user ID
npx tsx scripts/seed-test-claims.ts YOUR_CORRECT_USER_ID
```

### Issue: TypeScript errors

**Fix:**
```powershell
# Restart TypeScript server in VS Code
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Build errors

**Fix:**
```powershell
pnpm run build
# Check output for specific errors
```

### Issue: Database connection errors

**Check `.env.local`:**
```env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

---

## 💡 Tips

1. **Use Real User ID:** The seed script creates claims for a specific user. Make sure it's YOUR user ID.

2. **Keep Dev Server Running:** The API routes need the server running to work.

3. **Check Network Tab:** In DevTools → Network, you can see the exact data returned by `/api/claims`.

4. **Test with Multiple Accounts:** Create a second Clerk user to test the workbench (assigned vs unassigned claims).

5. **Git Safety:** All work is on `phase-1-foundation` branch. Your main branch is untouched.

---

## 🎉 What You've Achieved

✅ **Real Database Integration:** Claims page now displays actual data from PostgreSQL  
✅ **Type Safety:** Full TypeScript coverage from DB → API → UI  
✅ **Loading States:** Professional UX with spinners, errors, empty states  
✅ **Search & Filters:** All existing functionality preserved  
✅ **Clean Architecture:** Reusable mapping functions, proper state management  

**This is a major milestone!** You've converted a "pretty demo" into a functional data-driven application. The pattern you've established (API route → useEffect fetch → type mapping → UI states) will be reused for the workbench, members page, and other features.

---

## 📚 Documentation

- **Task 3 Details:** See `TASK_3_COMPLETE.md`
- **Overall Progress:** See `PHASE_1_PROGRESS.md`
- **Quick Start:** See `QUICK_START.md`
- **Azure Deployment:** See `NEXT_STEPS.md` (separate file for deployment)

---

**Ready to test?** Run the seed script and verify your claims page shows real data!  
**Ready to continue?** Say: `"proceed with Task 4: workbench integration"`
