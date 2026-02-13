# Runbook: Deployment Rollback

**Severity:** High
**Estimated Time:** 15-45 minutes
**Requires:** Deployment access, change management approval

## Symptoms
- New release causes outages or critical errors
- Alerts triggered immediately after deployment

## Diagnosis
1. Confirm release version and deployment time.
2. Validate error patterns are new or amplified.
3. Check known issues for the release.

## Resolution Steps
1. Initiate rollback to last known good release.
2. Verify database migrations are compatible with rollback.
3. Disable newly introduced feature flags.

## Verification
- [ ] Health checks pass
- [ ] Error rate returns to baseline
- [ ] Key user workflows operate normally

## Post-Incident
- [ ] Document rollback reason
- [ ] Open follow-up issue for fix

## Escalation
If rollback fails, engage engineering lead and database owner.
