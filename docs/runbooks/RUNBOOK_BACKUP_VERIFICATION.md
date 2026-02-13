# Runbook: Backup Verification

**Severity:** Medium
**Estimated Time:** 30-60 minutes
**Requires:** Backup access, storage access

## Symptoms
- Scheduled backup verification failed
- Backup integrity alert

## Diagnosis
1. Check backup job status and logs.
2. Validate checksum or hash comparisons.
3. Confirm storage availability and permissions.

## Resolution Steps
1. Re-run verification job.
2. If failure persists, create a fresh backup.
3. Validate new backup integrity.

## Verification
- [ ] Backup verification completes successfully
- [ ] Latest backup is restorable

## Post-Incident
- [ ] Update backup runbook notes
- [ ] Review backup alert thresholds

## Escalation
If verification fails twice, escalate to database admin.
