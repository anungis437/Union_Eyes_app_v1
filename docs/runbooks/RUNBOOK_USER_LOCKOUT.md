# Runbook: User Lockout Recovery

**Severity:** Low
**Estimated Time:** 10-20 minutes
**Requires:** Admin access

## Symptoms
- User reports account lockout
- Repeated failed login attempts

## Diagnosis
1. Verify lockout reason and recent attempts.
2. Check if the account is disabled or suspended.

## Resolution Steps
1. Reset lockout counter or unlock account.
2. Require password reset or MFA re-enrollment if needed.
3. Notify user of resolution steps.

## Verification
- [ ] User can sign in successfully
- [ ] Audit log records unlock action

## Post-Incident
- [ ] Document reason for lockout
- [ ] Review failed login alerts for trends

## Escalation
If lockout is part of a broader attack, escalate to security lead.
