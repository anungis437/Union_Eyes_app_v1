# Runbook: Tenant Provisioning

**Severity:** Low
**Estimated Time:** 10-30 minutes
**Requires:** Admin console access

## Symptoms
- New tenant onboarding request
- Tenant creation failed in admin console

## Diagnosis
1. Verify tenant metadata (name, slug, contact).
2. Check subscription tier and feature flags.
3. Confirm retention and localization settings.

## Resolution Steps
1. Create tenant in the admin console.
2. Configure default roles and permissions.
3. Validate initial admin user access.

## Verification
- [ ] Tenant appears in tenant list
- [ ] Admin user can sign in
- [ ] Audit log contains provisioning record

## Post-Incident
- [ ] Document provisioning details
- [ ] Share onboarding instructions with tenant

## Escalation
If provisioning fails due to system errors, escalate to platform team.
