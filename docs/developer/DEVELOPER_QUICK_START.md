# Developer Quick Start - ML Infrastructure

**Last Updated:** January 2026  
**Target Audience:** Developers, Data Scientists, DevOps

This guide gets you up and running with Union Eyes ML infrastructure in under 10 minutes.

---

## 🚀 Prerequisites

- Node.js 18+ installed
- pnpm v10.20.0+ installed
- PostgreSQL database accessible
- Environment variables configured (.env.local)

---

## ⚡ Quick Setup (3 Steps)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Database Migrations

```bash
pnpm db:migrate
```

If migrations don't exist yet, create them from schema:

```bash
psql -U your_user -d your_database -f database/ml-retraining-schema.sql
```

### 3. Seed Platform with Data

```bash
# Default: 3 tenants, 50 users, 200 claims per tenant
pnpm seed:platform

# Or customize:
npx tsx scripts/seed-full-platform.ts --tenants 5 --users 100 --claims 500
```

**✅ Done! You now have:**

- 3 tenants (union locals)
- 150 users (35 members, 12 stewards, 3 admins per tenant)
- 600 claims across all types and statuses
- 1,440 ML predictions (historical data)
- 12 model metadata records (4 models per tenant)
- 30 member AI feedback samples
- Analytics benchmarks and scheduled reports

---

## 🎯 Common Tasks

### View AI Monitoring Dashboard

1. Start dev server: `pnpm dev`
2. Navigate to: <http://localhost:3000/dashboard/ai-monitoring>
3. Explore 4 tabs: Overview, Model Performance, Data Quality, User Activity

### Test Model Retraining

```bash
# Retrain all models
pnpm ml:retrain:all

# Retrain specific model
pnpm ml:retrain claim_outcome
pnpm ml:retrain timeline
pnpm ml:retrain churn_risk
pnpm ml:retrain assignment
```

**What it does:**

1. Checks data drift (PSI scores)
2. Checks model performance (accuracy vs threshold)
3. Decides if retraining needed
4. Trains new model (simulated in development)
5. Validates new model (accuracy + A/B testing)
6. Deploys if validation passes
7. Notifies stakeholders

### Check Retraining History

```sql
SELECT 
  model_type,
  training_started_at,
  training_completed_at,
  validation_accuracy,
  status
FROM ml_model_training_runs
ORDER BY training_started_at DESC
LIMIT 10;
```

### View Active Models

```sql
SELECT 
  model_type,
  model_version,
  baseline_accuracy,
  deployed_at
FROM model_metadata
WHERE is_active = true;
```

### Test Member Portal

1. Navigate to: <http://localhost:3000/member/ai-portal>
2. Explore FAQ accordion (8 questions)
3. Submit feedback via form
4. Check API: <http://localhost:3000/api/member/ai-feedback>

### Test Monitoring APIs

```bash
# Get model metrics
curl http://localhost:3000/api/ml/monitoring/metrics

# Check data drift
curl http://localhost:3000/api/ml/monitoring/drift

# View alerts
curl http://localhost:3000/api/ml/monitoring/alerts

# Get usage stats (last 30 days)
curl http://localhost:3000/api/ml/monitoring/usage?days=30
```

---

## 🗂️ Project Structure

```
union-claims-standalone/
├── scripts/
│   ├── ml-retraining-pipeline.ts    # Automated retraining
│   ├── seed-full-platform.ts        # Comprehensive seeding
│   └── seed-test-claims.ts          # Simple claims seeding
├── app/
│   └── api/
│       ├── ml/
│       │   └── monitoring/
│       │       ├── metrics/route.ts     # Model performance API
│       │       ├── drift/route.ts       # Data drift API
│       │       ├── alerts/route.ts      # Alert management API
│       │       └── usage/route.ts       # Usage metrics API
│       └── member/
│           └── ai-feedback/route.ts     # Feedback API
├── src/
│   └── components/
│       ├── dashboard/
│       │   └── AIMonitoringDashboard.tsx  # Monitoring UI
│       └── member/
│           └── MemberAIPortal.tsx         # Member portal UI
├── database/
│   └── ml-retraining-schema.sql      # Database schema
└── docs/
    ├── ML_INFRASTRUCTURE_GUIDE.md    # Detailed guide
    └── Q1_2026_PROGRESS_REPORT.md    # Progress tracking
```

---

## 📊 Database Tables Reference

### ML Infrastructure Tables

- `ml_model_training_runs` - Training execution history
- `ml_retraining_notifications` - Stakeholder notifications
- `model_feature_baselines` - Baseline distributions for drift
- `model_metadata` - Active model versions
- `ml_predictions` - Historical prediction results
- `ml_alert_acknowledgments` - Alert tracking

### Platform Tables

- `tenants` - Multi-tenant organization data
- `profiles` - User profiles with roles
- `claims` - Member claims and cases
- `benchmark_data` - Analytics benchmarks
- `analytics_scheduled_reports` - Report scheduling
- `member_ai_feedback` - Member feedback

---

## 🧪 Testing Workflows

### Test Drift Detection

1. Seed platform: `pnpm seed:platform`
2. Run retraining: `pnpm ml:retrain:all`
3. Check output for PSI scores
4. Verify drift alerts in monitoring dashboard

### Test Performance Monitoring

1. Query current accuracy:

   ```sql
   SELECT model_type, AVG(CASE WHEN prediction_correct THEN 1.0 ELSE 0.0 END) as accuracy
   FROM ml_predictions
   WHERE predicted_at >= NOW() - INTERVAL '7 days'
   GROUP BY model_type;
   ```

2. Compare to thresholds (85% for claim_outcome, 78% for timeline, 85% for churn_risk, 70% for assignment)
3. Run retraining if below threshold: `pnpm ml:retrain <model_type>`

### Test Member Feedback Flow

1. Open member portal: <http://localhost:3000/member/ai-portal>
2. Fill feedback form (category: "concern", message: "Test feedback about data privacy")
3. Submit and verify success message
4. Check API: `curl http://localhost:3000/api/member/ai-feedback`
5. Verify feedback in database:

   ```sql
   SELECT * FROM member_ai_feedback ORDER BY submitted_at DESC LIMIT 5;
   ```

---

## 🛠️ Troubleshooting

### Error: "Database connection failed"

**Fix:** Check PostgreSQL is running and .env.local has correct DATABASE_URL

### Error: "Table does not exist"

**Fix:** Run migrations: `pnpm db:migrate` or `psql -f database/ml-retraining-schema.sql`

### Error: "Insufficient training samples"

**Fix:** Seed more data: `npx tsx scripts/seed-full-platform.ts --claims 500`

### Dashboard shows "No data"

**Fix:**

1. Verify database has data: `SELECT COUNT(*) FROM ml_predictions;`
2. Check API endpoints return data
3. Clear browser cache and reload

### Retraining pipeline fails

**Fix:**

1. Check logs for specific error
2. Verify model_metadata table has baseline entries
3. Verify ml_predictions table has recent data (last 7 days)
4. Check tenant_id matches between tables

---

## 📚 Key Documentation

- [ML Infrastructure Guide](docs/ML_INFRASTRUCTURE_GUIDE.md) - Comprehensive guide
- [Q1 2026 Progress Report](docs/Q1_2026_PROGRESS_REPORT.md) - Current status
- [90% Implementation Plan](docs/ai/90_PERCENT_IMPLEMENTATION_PLAN.md) - Roadmap
- [AI Monitoring Procedures](docs/ai/AI_MONITORING_PROCEDURES.md) - Operations guide

---

## 🎓 Learning Path

**For Developers:**

1. Read ML_INFRASTRUCTURE_GUIDE.md (20 min)
2. Run `pnpm seed:platform` and explore database (10 min)
3. Test monitoring APIs via curl (10 min)
4. Run `pnpm ml:retrain:all` and watch console output (5 min)
5. Open monitoring dashboard and explore 4 tabs (15 min)

**For Data Scientists:**

1. Study ml-retraining-pipeline.ts (30 min)
2. Understand drift detection (PSI calculation) (15 min)
3. Review model validation gates (15 min)
4. Customize MODEL_CONFIGS for new models (10 min)
5. Test retraining with custom thresholds (20 min)

**For Product Managers:**

1. Review Q1_2026_PROGRESS_REPORT.md (20 min)
2. Explore member portal UI at /member/ai-portal (10 min)
3. Check monitoring dashboard at /dashboard/ai-monitoring (10 min)
4. Review Board presentation BOARD_PRESENTATION_JAN_2026.md (30 min)

---

## 🚦 Ready to Deploy?

### Pre-Deployment Checklist

- [ ] Database migrations applied to production
- [ ] Environment variables configured (tenant IDs, Azure ML endpoints)
- [ ] Retraining pipeline scheduled (daily 2 AM recommended)
- [ ] Notification channels configured (email/Slack)
- [ ] Monitoring alerts set up for failed retraining
- [ ] Stakeholder notification list updated
- [ ] Backup and rollback procedures documented
- [ ] A/B testing validation gates enabled
- [ ] Performance benchmarks established

### Deploy Commands

```bash
# Production build
pnpm build

# Start production server
pnpm start

# Or deploy via Docker
docker-compose -f docker-compose.prod.yml up -d
```

---

## 💡 Pro Tips

1. **Use --reset sparingly** - It deletes ALL data. Always backup first.
2. **Customize seeding** - Adjust --tenants, --users, --claims for your needs
3. **Schedule retraining** - Use cron or Azure Functions for daily execution
4. **Monitor drift daily** - PSI > 0.25 needs immediate attention
5. **Track feedback** - Review member_ai_feedback weekly for patterns
6. **Test in staging** - Always test retraining in staging before production
7. **Keep baselines updated** - Refresh model_feature_baselines quarterly
8. **Document model changes** - Log all retraining in ml_model_training_runs

---

## 🤝 Getting Help

- **Technical Issues:** Check [ML_INFRASTRUCTURE_GUIDE.md](docs/ML_INFRASTRUCTURE_GUIDE.md)
- **Database Schema:** Review [ml-retraining-schema.sql](database/ml-retraining-schema.sql)
- **API Reference:** Test endpoints via curl/Postman
- **Progress Tracking:** Check [Q1_2026_PROGRESS_REPORT.md](docs/Q1_2026_PROGRESS_REPORT.md)

---

**Happy coding! 🚀**

*This guide is maintained by the Union Eyes development team and updated quarterly.*
