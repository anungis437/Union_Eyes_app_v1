# Schema Drift Protection - Quick Reference

⚡ **Fast access guide for daily operations**

---

## 🚀 Quick Commands

```bash
# Check for schema drift (runtime)
pnpm schema:drift:detect

# Validate migrations
pnpm schema:drift:validate

# Run all checks
pnpm schema:drift:check-all

# Compare two schemas
node scripts/compare-schemas.js db/schema prod-schema
```

---

## 📊 Check Database Status

```sql
-- Recent schema changes (last 7 days)
SELECT * FROM v_recent_schema_changes;

-- Unauthorized changes (last 24 hours)
SELECT * FROM detect_unauthorized_schema_changes(24);

-- Drift alerts
SELECT * FROM check_schema_drift_alerts();

-- Manual changes by user
SELECT 
  executed_by, 
  COUNT(*) as changes,
  MAX(executed_at) as last_change
FROM schema_drift_log
WHERE is_migration = FALSE
GROUP BY executed_by;
```

---

## 🔔 CI/CD Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `schema-validate.yml` | PR, Every 6h | Detect drift, validate migrations |
| `snapshot-gen.yml` | Nightly 2 AM | Generate production snapshots |

**Manual Trigger:**
```bash
# Validate schema
gh workflow run schema-validate.yml

# Generate snapshot
gh workflow run snapshot-gen.yml
```

---

## 🚨 When Drift Alert Fires

### 1. Quick Assessment
```bash
# Download latest drift report
gh run download <RUN_ID> -n schema-drift-report

# View critical issues
jq '.issues[] | select(.severity=="critical")' drift-report.json
```

### 2. Investigate
```sql
-- Who made the change?
SELECT * FROM schema_drift_log
WHERE object_name = 'table_name'
ORDER BY executed_at DESC
LIMIT 5;
```

### 3. Response Matrix

| Severity | Action | Timeline |
|----------|--------|----------|
| **Critical** | Immediate investigation | < 1 hour |
| **Warning** | Review within business day | < 8 hours |
| **Info** | Document and monitor | < 24 hours |

---

## 📝 Common Scenarios

### Scenario 1: "I need to make an emergency schema change"

```sql
-- Make the change (will be logged)
ALTER TABLE my_table ADD COLUMN emergency_field TEXT;

-- Document it immediately
INSERT INTO schema_drift_log (
  event_type, object_name, metadata, is_migration
) VALUES (
  'DDL_CHANGE', 'my_table',
  '{"reason": "emergency_fix", "ticket": "JIRA-123"}',
  FALSE
);
```

**Then:**
```bash
# Create proper migration after
pnpm db:generate

# Commit and push
git add db/migrations/*
git commit -m "chore: add migration for emergency schema change"
```

### Scenario 2: "Drift alert but change was intentional"

1. Review the specific change in GitHub Issue
2. If expected, create migration:
   ```bash
   pnpm db:generate
   git add . && git commit -m "chore: capture intentional schema change"
   ```
3. Close the alert issue with explanation

### Scenario 3: "False positive in CI"

```bash
# Re-run with verbose logging
pnpm schema:drift:detect:json > debug-report.json
cat debug-report.json | jq '.issues'

# Check database state
psql $DATABASE_URL -c "SELECT * FROM schema_drift_log ORDER BY executed_at DESC LIMIT 10;"
```

---

## 🛠️ Maintenance

### Weekly
- [ ] Review drift alerts in Slack
- [ ] Check `v_recent_schema_changes` view
- [ ] Verify CI/CD workflow success rate

### Monthly
- [ ] Audit `schema_drift_log` size
- [ ] Review unauthorized change patterns
- [ ] Update drift thresholds if needed

### Cleanup Old Logs
```sql
-- Archive logs older than 90 days
CREATE TABLE schema_drift_log_archive_$(date +%Y%m) AS
SELECT * FROM schema_drift_log
WHERE executed_at < NOW() - INTERVAL '90 days';

DELETE FROM schema_drift_log
WHERE executed_at < NOW() - INTERVAL '90 days';
```

---

## 🔧 Troubleshooting

### Issue: "No migration tracking table found"
```bash
# Solution: Run migrations
pnpm db:migrate
```

### Issue: "Permission denied for schema_drift_log"
```sql
-- Solution: Grant access
GRANT SELECT ON schema_drift_log TO your_role;
```

### Issue: "CI workflow can't connect to production"
```bash
# Solution: Check secrets
gh secret list
gh secret set PRODUCTION_DATABASE_URL
```

### Issue: "Too many false positives"
```typescript
// Solution: Adjust threshold in scripts/schema-drift-detector.ts
const EXPECTED_MIN_POLICIES = 65; // Increase this value
```

---

## 📞 Escalation

| Issue Type | Contact | SLA |
|------------|---------|-----|
| Critical drift | #engineering-alerts | 1 hour |
| CI/CD failure | #devops | 4 hours |
| False positives | Schema team | 1 day |
| Questions | #engineering | Best effort |

---

## 🔗 Resources

- **Full Documentation:** [`SCHEMA_DRIFT_PROTECTION.md`](./SCHEMA_DRIFT_PROTECTION.md)
- **Migration Guide:** `db/migrations/README.md`
- **Rollback Script:** `db/migrations/rollback/rollback_0080_add_schema_drift_protection.sql`
- **CI Workflow:** `.github/workflows/schema-validate.yml`
- **Snapshot Workflow:** `.github/workflows/snapshot-gen.yml`

---

## 📈 Key Metrics

Monitor these in your dashboard:

1. **Drift Detection Rate**
   ```sql
   SELECT COUNT(*) FROM schema_drift_log
   WHERE is_migration = FALSE 
   AND executed_at > NOW() - INTERVAL '7 days';
   ```

2. **CI/CD Success Rate**
   - Target: >95% green builds
   - Current: Check GitHub Actions

3. **Alert Response Time**
   - Target: <1 hour for critical
   - Current: Track in ops dashboard

---

## 💡 Pro Tips

1. **Before making schema changes:**
   ```bash
   # Check current state first
   pnpm schema:drift:detect
   ```

2. **After deployments:**
   ```bash
   # Verify no unexpected changes
   pnpm schema:drift:check-all
   ```

3. **Use the right tool:**
   - Schema changes → Create migration
   - Emergency fixes → Document immediately
   - Production issues → Check drift logs first

4. **Keep snapshots updated:**
   ```bash
   # Manual snapshot generation
   gh workflow run snapshot-gen.yml -f environment=production
   ```

---

## ✅ Health Check Checklist

Daily:
- [ ] No critical alerts
- [ ] CI/CD workflows green
- [ ] No unauthorized changes

Weekly:
- [ ] Review drift trends
- [ ] Check log table size
- [ ] Verify backup retention

Monthly:
- [ ] Update documentation
- [ ] Review threshold settings
- [ ] Team training refresh

---

**Last Updated:** 2026-02-12  
**Version:** 1.0.0  
**Status:** ✅ Active Protection
