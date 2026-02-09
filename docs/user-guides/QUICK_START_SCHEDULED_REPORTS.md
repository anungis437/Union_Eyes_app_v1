# Quick Start Guide - Scheduled Reports

This guide walks you through setting up and testing the scheduled reports system in 15 minutes.

---

## Step 1: Generate CRON_SECRET (2 minutes)

Choose one method:

**PowerShell** (Windows):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Bash** (Mac/Linux):

```bash
openssl rand -base64 32
```

**Node.js** (Any platform):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output - you'll need it in the next step.

---

## Step 2: Configure Environment (3 minutes)

**Create or update `.env.local`**:

```bash
# Scheduled Reports - Cron Security
CRON_SECRET=paste-your-generated-secret-here

# Email Delivery
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=reports@yourdomain.com

# Verify these exist
DATABASE_URL=your_database_url_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Get Resend API Key**:

1. Go to <https://resend.com/signup>
2. Verify your email
3. Add your domain (or use test domain)
4. Go to API Keys → Create
5. Copy the key to `RESEND_API_KEY`

---

## Step 3: Setup GitHub Secrets (2 minutes)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:

```
Name: APP_URL
Value: https://your-production-domain.com
```

```
Name: CRON_SECRET  
Value: [same value as in .env.local]
```

---

## Step 4: Test Locally (5 minutes)

**Start your development server**:

```bash
pnpm dev
```

**Create a test schedule**:

1. Navigate to <http://localhost:3000/dashboard/admin/scheduled-reports>
2. Click "Create Schedule" button
3. Fill out the form:
   - **Report**: Select any report
   - **Schedule Type**: Daily
   - **Time**: Select next hour (e.g., if it's 2:30 PM, select 3:00 PM)
   - **Delivery Method**: Email
   - **Recipients**: <your-email@example.com>
   - **Export Format**: CSV
   - **Active**: Checked
4. Click "Create Schedule"

**Trigger manual execution**:

```bash
# PowerShell
$env:CRON_SECRET = "your-cron-secret-here"
curl -X POST http://localhost:3000/api/cron/scheduled-reports `
  -H "Authorization: Bearer $env:CRON_SECRET" `
  -H "Content-Type: application/json"

# Bash
curl -X POST http://localhost:3000/api/cron/scheduled-reports \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected response**:

```json
{
  "message": "Execution complete",
  "total": 1,
  "succeeded": 1,
  "failed": 0,
  "results": [...]
}
```

**Check your email** - you should receive the report!

---

## Step 5: Test GitHub Actions (3 minutes)

**Commit and push the workflow**:

```bash
git add .github/workflows/cron-scheduled-reports.yml
git commit -m "Add scheduled reports cron workflow"
git push
```

**Trigger manual test**:

1. Go to GitHub → **Actions** tab
2. Click "Scheduled Reports Cron" workflow
3. Click "Run workflow" button (top right)
4. Select your branch
5. Click green "Run workflow" button
6. Watch the execution logs
7. Verify it completes successfully

**Verify automatic scheduling**:

- The workflow will now run every 15 minutes automatically
- Check back in 15 minutes to see the first automatic run
- Click on any run to see detailed logs

---

## Verification Checklist

- [ ] CRON_SECRET generated and added to .env.local
- [ ] Resend API key configured
- [ ] GitHub secrets added (APP_URL, CRON_SECRET)
- [ ] Test schedule created via UI
- [ ] Manual cron execution successful
- [ ] Email received with report attachment
- [ ] GitHub Actions workflow triggered manually
- [ ] Workflow completed successfully

---

## What Happens Next?

**Automatic Execution**:

- GitHub Actions runs every 15 minutes
- Checks for due schedules (`next_run_at <= NOW`)
- Executes each schedule:
  1. Fetches report data
  2. Generates export file (CSV/JSON)
  3. Sends email with attachment
  4. Updates schedule for next run
  5. Tracks execution in `export_jobs` table

**View Execution History**:

1. Go to `/dashboard/admin/scheduled-reports`
2. Click on any schedule
3. View "Execution History" section
4. See status, timing, and results

**Monitor in Database**:

```sql
-- Recent executions
SELECT * FROM export_jobs 
ORDER BY created_at DESC 
LIMIT 10;

-- Schedule status
SELECT id, report_name, next_run_at, last_run_status, run_count, failure_count 
FROM report_schedules 
WHERE is_active = true;
```

---

## Common Issues & Quick Fixes

### Email not received?

- Check spam folder
- Verify EMAIL_FROM domain is verified in Resend
- Check Resend dashboard for delivery logs
- Review application logs for errors

### GitHub Actions failing?

- Verify APP_URL secret is correct (no trailing slash)
- Ensure CRON_SECRET matches exactly
- Check your application is accessible from internet
- Review workflow logs for specific error

### No schedules executing?

- Check `next_run_at` is in the past
- Verify `is_active = true`
- Manually trigger to test: run curl command above
- Check application logs

### Need help?

- Review full documentation: `DEPLOYMENT_CHECKLIST.md`
- Check troubleshooting section: `PHASE_2_COMPLETE.md`
- Review code comments in `/api/cron/scheduled-reports/route.ts`

---

## Next Steps

1. **Create more schedules**: Weekly summaries, monthly reports
2. **Customize email templates**: Edit `lib/email/report-email-templates.ts`
3. **Add more export formats**: Implement Excel/PDF generators
4. **Monitor performance**: Check execution times and optimize queries
5. **Scale up**: Increase frequency or add more reports

---

**Congratulations!** 🎉

Your scheduled reports system is now running automatically. Reports will be generated and emailed on schedule without any manual intervention.

**Quick Links**:

- Admin UI: <http://localhost:3000/dashboard/admin/scheduled-reports>
- GitHub Actions: <https://github.com/YOUR_ORG/union-claims-standalone/actions>
- Resend Dashboard: <https://resend.com/emails>

---

**Setup Time**: ~15 minutes  
**Last Updated**: December 5, 2025  
**Status**: Production Ready ✅
