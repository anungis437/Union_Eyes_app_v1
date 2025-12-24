# Phase 2 Deployment Checklist

**Date**: December 5, 2025  
**Phase**: Phase 2 - Enhanced Analytics & Reports  
**Status**: Build Complete ✅ | Configuration Required ⏳

---

## Pre-Deployment Checklist

### 1. Environment Configuration ⏳

**Local Development (.env.local)**:
```bash
# Generate a secure random string for CRON_SECRET
CRON_SECRET=<generate-with-openssl-rand-base64-32>

# Configure Resend API for email delivery
RESEND_API_KEY=<your-resend-api-key>
EMAIL_FROM=reports@yourdomain.com
EMAIL_PROVIDER=resend

# Verify existing configuration
DATABASE_URL=<your-database-url>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate CRON_SECRET**:
```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Resend Setup**:
1. Sign up at https://resend.com
2. Add and verify your sending domain
3. Create API key in dashboard
4. Copy key to RESEND_API_KEY
5. Update EMAIL_FROM with verified domain

---

### 2. GitHub Secrets Configuration ⏳

**Required Secrets** (Settings → Secrets and variables → Actions):

```
APP_URL          = https://your-production-domain.com
CRON_SECRET      = <same-as-env-cron-secret>
```

**Setup Steps**:
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add `APP_URL` with your production URL
4. Add `CRON_SECRET` (must match your deployed app's CRON_SECRET)
5. Save both secrets

---

### 3. Database Migrations ⏳

**Run Phase 2 Migrations**:

```bash
# Option 1: Using your migration tool
pnpm migrate:up

# Option 2: Manual application
psql $DATABASE_URL < database/migrations/001_reports_system.sql
psql $DATABASE_URL < database/migrations/002_dashboards_system.sql
psql $DATABASE_URL < database/migrations/003_chart_configurations.sql
psql $DATABASE_URL < database/migrations/010_analytics_reporting_system.sql
```

**Verify Migrations**:
```bash
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('reports', 'dashboards', 'report_schedules', 'export_jobs');"
```

Expected output:
```
 tablename
-----------------
 reports
 dashboards
 report_schedules
 export_jobs
```

---

### 4. Build Verification ✅

```bash
pnpm build
```

**Status**: ✅ Successful  
**Warnings**: Only non-critical OpenTelemetry and BullMQ warnings (safe to ignore)

---

### 5. Local Testing ⏳

**A. Report Builder**:
- [ ] Navigate to `/dashboard/reports`
- [ ] Create new report with custom fields
- [ ] Add filter conditions
- [ ] Execute report and view results
- [ ] Export to CSV
- [ ] Save report

**B. Dashboards**:
- [ ] Navigate to `/dashboard/analytics`
- [ ] Create new dashboard
- [ ] Add 2-3 widgets (charts, tables)
- [ ] Arrange in grid layout
- [ ] Apply global filters
- [ ] Verify data refresh

**C. Charts**:
- [ ] Test area chart
- [ ] Test radar chart
- [ ] Test scatter plot
- [ ] Verify hover interactions
- [ ] Test export to image

**D. Scheduled Reports**:
- [ ] Navigate to `/dashboard/admin/scheduled-reports`
- [ ] Create daily schedule:
  - Report: Select any report
  - Schedule: Daily at next hour
  - Delivery: Email
  - Recipients: Your email
  - Format: CSV
  - Active: Checked
- [ ] Verify schedule appears in list
- [ ] Test manual execution:
  ```bash
  curl -X POST http://localhost:3000/api/cron/scheduled-reports \
    -H "Authorization: Bearer YOUR_CRON_SECRET" \
    -H "Content-Type: application/json"
  ```
- [ ] Check email inbox for report
- [ ] Verify export_jobs table updated:
  ```bash
  psql $DATABASE_URL -c "SELECT id, status, created_at FROM export_jobs ORDER BY created_at DESC LIMIT 5;"
  ```
- [ ] Test pause/resume functionality
- [ ] View execution history

**E. Cron Health Check**:
```bash
curl http://localhost:3000/api/cron/scheduled-reports \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "message": "Cron endpoint healthy",
  "dueSchedules": 0
}
```

---

### 6. GitHub Actions Testing ⏳

**Manual Trigger Test**:
1. Go to GitHub → Actions
2. Select "Scheduled Reports Cron" workflow
3. Click "Run workflow" button
4. Select branch
5. Click "Run workflow"
6. Watch execution logs
7. Verify successful completion

**Monitor First Scheduled Run**:
- Workflow runs every 15 minutes automatically
- Check Actions tab after 15 minutes
- Review execution logs
- Verify no errors

---

### 7. Staging Deployment ⏳

**Pre-Deployment**:
- [ ] Merge phase-3-validation branch to staging branch
- [ ] Verify all environment variables set in hosting provider
- [ ] Run database migrations on staging database
- [ ] Deploy to staging environment

**Post-Deployment Verification**:
- [ ] Visit staging URL
- [ ] Test report builder
- [ ] Test dashboards
- [ ] Test scheduled reports
- [ ] Trigger manual cron execution:
  ```bash
  curl -X POST https://staging.yourdomain.com/api/cron/scheduled-reports \
    -H "Authorization: Bearer $STAGING_CRON_SECRET"
  ```
- [ ] Verify GitHub Actions can reach staging
- [ ] Check application logs for errors
- [ ] Monitor email delivery

---

### 8. Production Deployment ⏳

**Pre-Deployment**:
- [ ] Complete staging testing
- [ ] Merge to production branch
- [ ] Backup production database
- [ ] Schedule maintenance window (optional)
- [ ] Notify users (if applicable)

**Environment Variables** (Production):
```bash
CRON_SECRET=<production-secret>
RESEND_API_KEY=<production-api-key>
EMAIL_FROM=reports@yourdomain.com
EMAIL_PROVIDER=resend
DATABASE_URL=<production-database-url>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**GitHub Secrets** (Production):
```
APP_URL     = https://yourdomain.com
CRON_SECRET = <production-cron-secret>
```

**Deployment Steps**:
1. Run database migrations on production
2. Deploy application
3. Verify deployment successful
4. Test cron endpoint manually
5. Monitor GitHub Actions execution
6. Check application health
7. Monitor error tracking (Sentry)

**Post-Deployment Verification**:
- [ ] Visit production URL
- [ ] Create test report
- [ ] Create test dashboard
- [ ] Create test scheduled report (use test email)
- [ ] Wait for cron execution (15 min)
- [ ] Verify email received
- [ ] Check export_jobs table
- [ ] Review application logs
- [ ] Monitor error rates
- [ ] Check performance metrics

---

## Monitoring & Maintenance

### Daily Monitoring

**GitHub Actions**:
- Check workflow runs at https://github.com/YOUR_ORG/union-claims-standalone/actions
- Review failed executions
- Check execution duration trends

**Application Logs**:
```bash
# Search for scheduled report errors
grep "scheduled-report" /var/log/app.log

# Check cron execution logs
grep "Executor" /var/log/app.log
```

**Database Checks**:
```sql
-- Check recent export jobs
SELECT 
  id, 
  status, 
  error_message, 
  created_at 
FROM export_jobs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check failed jobs
SELECT 
  COUNT(*) as failed_count,
  error_message
FROM export_jobs 
WHERE status = 'failed' 
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY error_message;

-- Check schedule execution stats
SELECT 
  id,
  report_name,
  is_active,
  run_count,
  failure_count,
  last_run_status,
  next_run_at
FROM report_schedules
ORDER BY next_run_at;
```

### Weekly Maintenance

- [ ] Review failed job patterns
- [ ] Check email delivery rates
- [ ] Monitor storage usage
- [ ] Review execution performance
- [ ] Update schedules as needed
- [ ] Clean old export_jobs (optional)

### Monthly Review

- [ ] Analyze usage patterns
- [ ] Optimize slow queries
- [ ] Review and update templates
- [ ] Check for library updates
- [ ] Performance optimization
- [ ] User feedback review

---

## Troubleshooting

### Issue: Cron jobs not executing

**Symptoms**: No jobs running, GitHub Actions succeeding but no reports generated

**Solutions**:
1. Check `next_run_at` in report_schedules:
   ```sql
   SELECT id, next_run_at, is_active FROM report_schedules;
   ```
2. Verify schedules are active (`is_active = true`)
3. Check if `next_run_at` is in the future
4. Manually trigger to test:
   ```bash
   curl -X POST $APP_URL/api/cron/scheduled-reports \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

### Issue: Emails not sending

**Symptoms**: Jobs complete but no emails received

**Solutions**:
1. Check Resend dashboard for delivery status
2. Verify EMAIL_FROM domain is verified
3. Check spam folder
4. Review application logs for email errors
5. Test email service directly:
   ```typescript
   // In browser console or Node
   await fetch('/api/test-email', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ to: 'your@email.com' })
   });
   ```

### Issue: GitHub Actions failing

**Symptoms**: Workflow runs show red X

**Solutions**:
1. Check workflow logs in GitHub Actions
2. Verify APP_URL secret is correct
3. Verify CRON_SECRET matches deployed app
4. Test endpoint manually:
   ```bash
   curl -I $APP_URL/api/cron/scheduled-reports
   ```
5. Check application is running and accessible
6. Verify no firewall blocking GitHub IPs

### Issue: Reports contain no data

**Symptoms**: Jobs succeed but exported files are empty

**Solutions**:
1. Check report query in reports table
2. Verify data exists for date range
3. Test query manually in database
4. Check tenant_id filtering
5. Review report configuration

### Issue: High memory usage

**Symptoms**: Application crashes or slow performance

**Solutions**:
1. Reduce row limits in queries (current: 1000)
2. Implement pagination for large exports
3. Add file size limits
4. Monitor concurrent executions
5. Scale worker processes

---

## Rollback Procedure

If critical issues occur after deployment:

**Immediate Actions**:
1. Disable GitHub Actions workflow (pause scheduled runs)
2. Pause all active schedules:
   ```sql
   UPDATE report_schedules SET is_active = false;
   ```
3. Revert application deployment to previous version
4. Monitor error rates

**Investigation**:
1. Review deployment logs
2. Check database migration status
3. Analyze error patterns
4. Test in staging environment

**Recovery**:
1. Fix identified issues
2. Test thoroughly in staging
3. Re-enable schedules gradually
4. Monitor closely
5. Re-enable GitHub Actions

---

## Success Metrics

### Week 1 Targets:
- [ ] Zero failed deployments
- [ ] 100% cron execution success rate
- [ ] < 5% email delivery failures
- [ ] Zero critical bugs reported
- [ ] All scheduled reports executing on time

### Month 1 Targets:
- [ ] 99.9% uptime
- [ ] < 1 minute average report execution time
- [ ] 95%+ email delivery rate
- [ ] User satisfaction > 4.5/5
- [ ] 10+ active scheduled reports

### Quarter 1 Targets:
- [ ] 50+ scheduled reports in use
- [ ] Zero data accuracy issues
- [ ] Performance optimizations implemented
- [ ] Advanced features adopted by users
- [ ] Documentation complete and helpful

---

## Next Steps After Deployment

### Immediate (Week 1):
1. Monitor cron executions closely
2. Gather user feedback
3. Fix any critical bugs
4. Optimize slow queries
5. Update documentation based on issues

### Short Term (Month 1):
1. Implement Excel/PDF generation
2. Add S3/Azure Blob storage
3. Create execution monitoring dashboard
4. Implement webhook retry logic
5. Add more chart types

### Long Term (Quarter 1):
1. Report parameterization
2. Conditional execution
3. AI-powered insights
4. Real-time dashboard updates
5. Mobile application support

---

## Completion Sign-Off

**Checklist Owner**: ___________________  
**Date Completed**: ___________________

**Environment Configuration**: ☐ Complete  
**Database Migrations**: ☐ Complete  
**Local Testing**: ☐ Complete  
**Staging Deployment**: ☐ Complete  
**Production Deployment**: ☐ Complete  
**Post-Deployment Verification**: ☐ Complete  
**Monitoring Setup**: ☐ Complete

**Notes**:
_______________________________________________________
_______________________________________________________
_______________________________________________________

**Sign-Off**: Phase 2 deployment complete and production-ready ☐

---

**Last Updated**: December 5, 2025  
**Version**: 1.0  
**Status**: Ready for deployment ✅
