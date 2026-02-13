# Runbook: Database Restore

**Severity:** Critical
**Estimated Time:** 60-180 minutes
**Requires:** Database admin access, backup credentials

## Symptoms
- Data loss or corruption detected
- Failed migrations causing invalid state

## Diagnosis
1. Identify the affected dataset and time window.
2. Confirm latest good backup and integrity.
3. Validate restore target and downtime window.

## Resolution Steps
1. Place system in maintenance mode if required.
2. Restore from verified backup.
3. Replay WAL or incremental backups if applicable.
4. Validate schema and data consistency.

## Verification
- [ ] Data checks pass
- [ ] Application read/write tests succeed
- [ ] Alerts clear

## Post-Incident
- [ ] Document restore timeline
- [ ] Review backup strategy and retention

## Escalation
If restore exceeds 2 hours, escalate to infrastructure leadership.
