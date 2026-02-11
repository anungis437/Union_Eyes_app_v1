# Week 2 P1 High Priority Implementation

**Date:** February 10, 2026  
**Status:** 🚧 In Progress  
**Priority:** P1 - High Priority  
**Estimated Complexity:** Medium-High

## 📊 TODO Inventory Summary

**Total Remaining:** 56 TODOs after Week 1  
**Week 2 Scope:** 15 P1 High Priority items  
**Categories:**
- Financial Service Integration: 6 items
- Dashboard Data Loading: 5 items  
- Autopay Settings: 2 items
- API Pattern Migration: 2 items

## 🎯 Week 2 Objectives

### 1. Financial Service Notification Integration (P1)
**Impact:** Critical for payment workflows  
**Files:** `services/financial-service/src/services/notification-service.ts`

**Issues:**
- Email service not integrated (TODO line 284)
- SMS service not integrated (TODO line 297)
- Push notification service not integrated (TODO line 314)

**Solution:** Link to main notification services in `lib/workers/notification-worker.ts`

### 2. Autopay Settings Implementation (P1)
**Impact:** Required for dues balance API  
**Files:** 
- `app/api/dues/balance/route.ts`
- `db/schema/` (new table needed)

**Issues:**
- No autopay settings table (TODO line 204)
- Cannot retrieve Stripe payment method (TODO line 205)

**Solution:** 
1. Create `autoPaySettings` schema table
2. Add Stripe customer lookup utility
3. Implement autopay enable/disable endpoints

### 3. Dashboard Data Loading Fixes (P1)
**Impact:** User experience - critical data missing  
**Files:**
- `app/[locale]/dashboard/workbench/page.tsx`
- `app/[locale]/dashboard/rewards/page.tsx`
- `app/[locale]/dashboard/voting/page.tsx`

**Issues:**
- Mock member data (workbench TODO lines 153-155)
- Mock rewards calculations (TODO lines 71, 89)
- Mock voting data (TODO line 49)

**Solution:**
1. Create member data query utilities
2. Implement ledger aggregation for rewards
3. Create voting data API endpoint

### 4. API Auth Pattern Migration (P1)
**Impact:** Code consistency and maintainability  
**Files:**
- `app/api/communications/templates/route.ts`
- `app/api/communications/templates/[id]/route.ts`
- `app/api/communications/distribution-lists/route.ts`
- `app/api/communications/distribution-lists/[id]/route.ts`

**Issues:**
- Using deprecated `getCurrentUser()` pattern (multiple files)
- Should use `withApiAuth` wrapper for consistency

**Solution:** Migrate to canonical `withApiAuth` pattern

## 📝 Implementation Plan

### Phase 1: Financial Service Integration (30 min)
- [x] Link email service to SendGrid/Resend (already in lib/)
- [x] Link SMS service to Twilio (already in lib/)
- [x] Link push service to FCM (already in lib/)
- [ ] Update notification-service.ts to use existing services
- [ ] Remove console.log statements
- [ ] Add proper error handling

### Phase 2: Autopay Settings (45 min)
- [ ] Create `autoPaySettings` schema table
- [ ] Add Stripe customer lookup utility
- [ ] Update dues balance route to fetch autopay status
- [ ] Create autopay enable/disable endpoints
- [ ] Update tests

### Phase 3: Dashboard Data Loading (60 min)
- [ ] Create `getMemberDetails()` utility
- [ ] Create `calculateRewardsBalance()` utility
- [ ] Create voting data API endpoint
- [ ] Update workbench page with real data
- [ ] Update rewards page with calculations
- [ ] Update voting page with API integration

### Phase 4: API Auth Migration (30 min)
- [ ] Migrate templates routes to withApiAuth
- [ ] Migrate distribution-lists routes to withApiAuth
- [ ] Remove getCurrentUser() calls
- [ ] Verify auth flows still work

## 🔍 Week 2 TODO Details

### Financial Service TODOs

1. **services/financial-service/src/services/notification-service.ts:284**
   ```typescript
   // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
   ```
   **Fix:** Import and use `lib/email/send-email` utility

2. **services/financial-service/src/services/notification-service.ts:297**
   ```typescript
   // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
   ```
   **Fix:** Import and use `lib/workers/sms-worker` utility

3. **services/financial-service/src/services/notification-service.ts:314**
   ```typescript
   // TODO: Integrate with push service (Firebase, OneSignal, etc.)
   ```
   **Fix:** Import and use `services/fcm-service` (implemented in Week 1)

4. **services/financial-service/src/jobs/payment-collection-workflow.ts:301**
   ```typescript
   // TODO: Integrate with notification service when available
   ```
   **Fix:** Call financial-service notification service

5. **services/financial-service/src/jobs/stipend-processing-workflow.ts:377**
   ```typescript
   // TODO: Integrate with Stripe for actual payment processing
   ```
   **Fix:** Import Stripe SDK and implement payment intent creation

6. **services/financial-service/src/jobs/payment-collection-workflow.ts:335**
   ```typescript
   // TODO: In multi-tenant setup, iterate through all tenants
   ```
   **Fix:** Add tenant iteration logic with proper isolation

### Autopay TODOs

7. **app/api/dues/balance/route.ts:204**
   ```typescript
   autoPayEnabled: false, // TODO: Implement autopay settings table
   ```
   **Fix:** Create table and query autopay status

8. **app/api/dues/balance/route.ts:205**
   ```typescript
   paymentMethodLast4: null, // TODO: Get from Stripe customer
   ```
   **Fix:** Add Stripe customer lookup utility

### Dashboard TODOs

9. **app/[locale]/dashboard/workbench/page.tsx:153-155**
   ```typescript
   memberName: claim.isAnonymous ? "Anonymous Member" : "Member", // TODO
   memberEmail: claim.isAnonymous ? "" : "member@union.com", // TODO
   memberPhone: claim.isAnonymous ? "" : "", // TODO
   ```
   **Fix:** Query profile data from database

10. **app/[locale]/dashboard/rewards/page.tsx:71**
    ```typescript
    {/* TODO: Calculate from ledger where type = 'earned' */}
    ```
    **Fix:** Implement ledger aggregation query

11. **app/[locale]/dashboard/rewards/page.tsx:89**
    ```typescript
    {/* TODO: Calculate from ledger where type = 'redeemed' */}
    ```
    **Fix:** Implement ledger aggregation query

12. **app/[locale]/dashboard/voting/page.tsx:49**
    ```typescript
    // Mock data - TODO: Replace with actual data from database
    ```
    **Fix:** Create voting API endpoint and use real data

### API Auth TODOs

13-14. **Multiple communications API routes**
    ```typescript
    // TODO: Migrate to withApiAuth wrapper pattern for consistency
    ```
    **Fix:** Replace getCurrentUser() with withApiAuth wrapper

## ⚠️ Dependencies

- Stripe SDK (already installed)
- Twilio SDK (needs verification)
- SendGrid/Resend (configured in Week 1)
- Firebase Admin (configured in Week 1)

## 🧪 Testing Requirements

1. Financial service notification tests
2. Autopay settings CRUD tests
3. Dashboard data loading integration tests
4. API auth migration validation tests

## 📈 Success Metrics

- ✅ 15 TODOs resolved (27% reduction from Week 1 baseline)
- ✅ No console.log in notification services
- ✅ All dashboard pages show real data
- ✅ Autopay settings fully functional
- ✅ Consistent auth pattern across communications APIs

## 🚀 Next Steps (Week 3)

After completing Week 2 P1 items, move to P2 Medium Priority:
- CLC schema tables (5 TODOs)
- Tax slip service enhancements (3 TODOs)
- Communications campaign sending logic (3 TODOs)
- Calendar integration improvements (3 TODOs)

---

**Last Updated:** February 10, 2026  
**Implemented By:** GitHub Copilot  
**Related:** WEEK1_P0_IMPLEMENTATION.md
