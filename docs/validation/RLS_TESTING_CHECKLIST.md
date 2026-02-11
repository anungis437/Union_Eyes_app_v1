# RLS Testing Checklist - Phase 2 Area 1

## Test Data Overview

### Tenants

1. **Union Local 123** (ID: `a1111111-1111-1111-1111-111111111111`)
2. **Workers Alliance** (ID: `b2222222-2222-2222-2222-222222222222`)
3. **Default Union** (ID: `29cec18c-5df2-41c0-a7c8-73a9464c9d3b`)
4. **Default Organization** (ID: `00000000-0000-0000-0000-000000000001`)

### Test Claims

- **CLM-2024-TEST-001**: workplace_safety, under_review, medium → **Union Local 123**
- **CLM-2024-TEST-002**: wage_dispute, investigation, high → **Union Local 123**
- **CLM-2024-TEST-003**: harassment_workplace, under_review, high → **Workers Alliance**
- **CLM-2024-TEST-004**: discrimination_gender, assigned, critical → **Workers Alliance**

## Manual Testing Steps

### ✅ Test 1: Tenant Selector Visibility

- [ ] Navigate to dashboard at <http://localhost:3000/dashboard>
- [ ] Confirm tenant selector is visible in top-right header
- [ ] Verify it shows current tenant name with Building2 icon
- [ ] Click dropdown and verify all 4 tenants are listed

### ✅ Test 2: Switch to Union Local 123

- [ ] Click tenant selector dropdown
- [ ] Select "Union Local 123"
- [ ] Page reloads
- [ ] Verify selector now shows "Union Local 123"
- [ ] Check browser DevTools → Application → Cookies
- [ ] Verify `selected_tenant_id` = `a1111111-1111-1111-1111-111111111111`

### ✅ Test 3: Verify Claims for Union Local 123

- [ ] Navigate to "My Cases" page
- [ ] **Expected**: Should see exactly 2 claims:
  - CLM-2024-TEST-001 (workplace_safety)
  - CLM-2024-TEST-002 (wage_dispute)
- [ ] **Should NOT see**: CLM-2024-TEST-003, CLM-2024-TEST-004
- [ ] Check dashboard stats: "My Active Cases" should show correct count

### ✅ Test 4: Switch to Workers Alliance

- [ ] Click tenant selector dropdown
- [ ] Select "Workers Alliance"
- [ ] Page reloads
- [ ] Verify selector now shows "Workers Alliance"
- [ ] Check cookie: `selected_tenant_id` = `b2222222-2222-2222-2222-222222222222`

### ✅ Test 5: Verify Claims for Workers Alliance

- [ ] Navigate to "My Cases" page
- [ ] **Expected**: Should see exactly 2 claims:
  - CLM-2024-TEST-003 (harassment_workplace)
  - CLM-2024-TEST-004 (discrimination_gender)
- [ ] **Should NOT see**: CLM-2024-TEST-001, CLM-2024-TEST-002
- [ ] Verify dashboard stats updated

### ✅ Test 6: Test Default Tenants (No Claims)

- [ ] Switch to "Default Union"
- [ ] Navigate to "My Cases"
- [ ] **Expected**: No test claims visible (may see other claims)
- [ ] Switch to "Default Organization"
- [ ] **Expected**: No test claims visible (may see other claims)

### ✅ Test 7: API Endpoint Testing (Optional)

Open browser DevTools → Network tab:

- [ ] Switch to Union Local 123
- [ ] Refresh page
- [ ] Check Network tab for `/api/claims` request
- [ ] Verify response contains only 2 test claims for this tenant
- [ ] Switch to Workers Alliance and repeat
- [ ] Verify response contains only the other 2 test claims

### ✅ Test 8: Cross-Tenant Data Leakage Check

- [ ] While on Union Local 123, try to access a Workers Alliance claim by URL
- [ ] Example: Navigate to `/claims/[workers-alliance-claim-id]`
- [ ] **Expected**: Should get 404 or access denied (tenant isolation enforced)

## Expected Results Summary

| Tenant | Test Claims Visible | Total Count |
|--------|-------------------|-------------|
| Union Local 123 | CLM-2024-TEST-001, CLM-2024-TEST-002 | 2 |
| Workers Alliance | CLM-2024-TEST-003, CLM-2024-TEST-004 | 2 |
| Default Union | None | 0 |
| Default Organization | None | 0 |

## Success Criteria

✅ **RLS is working correctly if:**

1. Tenant selector allows switching between all 4 tenants
2. Each tenant only sees their own test claims
3. Switching tenants updates the visible claims immediately
4. Dashboard stats reflect correct counts per tenant
5. No cross-tenant data leakage (can't access other tenant's claims)
6. Cookie persists tenant selection across page reloads

## Troubleshooting

### Tenant selector keeps resetting

- Check that cookie `selected_tenant_id` is being set
- Verify user is in `organization_users` table for selected tenant
- Check browser console for errors

### Seeing all claims regardless of tenant

- Verify database user has RLS enabled (not BYPASSRLS)
- Check that claims API uses `withTenantAuth` middleware
- Verify RLS policies are active: `SELECT * FROM pg_policies WHERE tablename='claims';`

### Can't switch to certain tenants

- Verify user is associated with tenant in `organization_users` table
- Check `/api/tenant/switch` response for 403 errors
- Confirm tenant status is 'active' in database

## Next Steps After Testing

- [ ] Document any issues found
- [ ] Take screenshots of successful tenant switching
- [ ] Verify all RLS policies are working as expected
- [ ] Update Phase 2 documentation with test results
- [ ] Mark Phase 2 Area 1 as complete
