# ML Infrastructure & Seeding Tools

This document covers the automated ML retraining pipeline and comprehensive platform seeding capabilities added to Union Eyes.

## 🤖 Automated Model Retraining Pipeline

**Location:** `scripts/ml-retraining-pipeline.ts`

### Purpose

Monitors data drift and model performance, automatically triggering retraining when thresholds are exceeded. Implements validation gates before deployment to ensure quality and safety.

### Features

- **Drift Detection**: PSI (Population Stability Index) monitoring triggers retraining when > 0.25
- **Performance Monitoring**: Accuracy degradation below thresholds triggers retraining
- **Automated Training**: Prepares data and trains models via Azure ML integration
- **Validation Gates**: A/B testing and accuracy validation before deployment
- **Stakeholder Notifications**: Automated alerts on retraining success/failure
- **Multi-Model Support**: Handles all 4 production models simultaneously

### Models Supported

1. **Claim Outcome Prediction** - 85% accuracy threshold, 1000 min samples
2. **Timeline Forecasting** - 78% accuracy threshold, 800 min samples
3. **Churn Risk Prediction** - 85% accuracy threshold, 500 min samples
4. **Smart Assignment** - 70% accuracy threshold, 600 min samples

### Usage

**Retrain all models:**

```bash
pnpm ml:retrain:all
```

**Retrain specific model:**

```bash
pnpm ml:retrain claim_outcome
pnpm ml:retrain timeline
pnpm ml:retrain churn_risk
pnpm ml:retrain assignment
```

**Direct script execution:**

```bash
npx tsx scripts/ml-retraining-pipeline.ts [modelType]
```

### Pipeline Steps

1. **Check Drift**: Calculate PSI scores for key features (member age, case complexity, union tenure)
2. **Check Performance**: Query 7-day accuracy vs baseline thresholds
3. **Prepare Data**: Validate sufficient training samples (12 months history)
4. **Train Model**: Execute training via Azure ML (simulated in development)
5. **Validate Model**: Run accuracy checks and A/B testing
6. **Deploy Model**: Mark new version as active, deactivate old version
7. **Notify**: Alert stakeholders via email/Slack/in-app

### Configuration

Edit `MODEL_CONFIGS` in script to adjust:

- `accuracyThreshold`: Minimum acceptable accuracy
- `driftThreshold`: PSI threshold triggering retraining
- `minTrainingSamples`: Required training data size
- `validationSplit`: Train/validation split ratio (default 20%)

### Database Schema

Run schema migration before first use:

```bash
psql -U your_user -d your_database -f database/ml-retraining-schema.sql
```

**Tables Created:**

- `ml_model_training_runs` - Training execution history
- `ml_retraining_notifications` - Stakeholder notification log
- `model_feature_baselines` - Baseline distributions for drift detection
- `model_metadata` - Active model versions and configurations
- `ml_predictions` - Historical prediction results
- `ml_alert_acknowledgments` - Alert acknowledgment tracking

### Scheduling

For production deployment, schedule via cron or Azure Functions:

**Daily at 2 AM (cron):**

```cron
0 2 * * * cd /path/to/union-eyes && npx tsx scripts/ml-retraining-pipeline.ts
```

**Azure Functions (time trigger):**

```json
{
  "bindings": [{
    "name": "timer",
    "type": "timerTrigger",
    "direction": "in",
    "schedule": "0 0 2 * * *"
  }]
}
```

---

## 🌱 Comprehensive Platform Seeding

**Location:** `scripts/seed-full-platform.ts`

### Purpose

Seeds the entire Union Eyes platform with realistic data for development, testing, and demo environments. No external dependencies (faker.js) required.

### What Gets Seeded

- ✅ Multi-tenant setup (configurable count)
- ✅ Users and profiles (members 70%, stewards 25%, admins 5%)
- ✅ Claims across all types and statuses
- ✅ ML predictions historical data (60% of claims, 4 model types)
- ✅ Model metadata and baselines
- ✅ Feature baselines for PSI calculations
- ✅ Analytics benchmarks (resolution time, volume, satisfaction)
- ✅ Scheduled reports configuration
- ✅ Member AI feedback samples (10 per tenant)

### Usage

**Default seeding (3 tenants, 50 users, 200 claims per tenant):**

```bash
pnpm seed:platform
```

**Custom configuration:**

```bash
npx tsx scripts/seed-full-platform.ts --tenants 5 --users 100 --claims 500
```

**Reset database before seeding:**

```bash
npx tsx scripts/seed-full-platform.ts --reset --tenants 3 --users 50 --claims 200
```

### Command Line Options

- `--tenants <number>` - Number of tenants to create (default: 3)
- `--users <number>` - Users per tenant (default: 50)
- `--claims <number>` - Claims per tenant (default: 200)
- `--reset` - Drop all existing data before seeding (⚠️ destructive!)

### Data Generation Details

**Realistic Data (No faker.js):**

- **Names**: 36 first names, 35 last names (1,260 combinations)
- **Union Locals**: 6 realistic union local names
- **Departments**: 7 common workplace departments
- **Claim Types**: 11 types covering grievances, safety, discrimination, harassment
- **Statuses**: 8 claim lifecycle statuses
- **Descriptions**: Context-aware claim descriptions based on type

**User Distribution:**

- 70% members (regular union members)
- 25% stewards (case handlers)
- 5% admins (system administrators)

**ML Predictions:**

- Generated for 60% of claims
- 4 model types per claim (claim_outcome, timeline, churn_risk, assignment)
- 70-95% confidence scores
- 80% prediction accuracy rate

**Model Metadata:**

- 4 models per tenant with baseline accuracy/confidence
- Version 1 deployed 90 days ago
- Active models marked for production use

### Database Requirements

Ensure these tables exist before seeding:

- `tenants` - Multi-tenant organization data
- `profiles` - User profiles with roles
- `claims` - Member claims and cases
- `ml_predictions` - AI prediction history
- `model_metadata` - Model version tracking
- `model_feature_baselines` - Drift detection baselines
- `benchmark_data` - Analytics benchmarks
- `analytics_scheduled_reports` - Automated report scheduling
- `member_ai_feedback` - Member feedback submissions

Run migrations if needed:

```bash
pnpm db:migrate
```

### Example Output

```
🌱 Union Eyes - Comprehensive Platform Seeding
===============================================

Configuration:
  Tenants: 3
  Users per tenant: 50
  Claims per tenant: 200
  Reset database: false

🏢 Creating 3 tenants...
   ✓ Created tenant: Local 101 (tenant_1234567890_0)
   ✓ Created tenant: Local 212 (tenant_1234567890_1)
   ✓ Created tenant: Local 345 (tenant_1234567890_2)
✅ 3 tenants created

👥 Seeding users for tenant tenant_1234567890_0...
   ✓ Created 35 members, 12 stewards, 3 admins

📋 Creating claims for tenant tenant_1234567890_0...
   ✓ 200 claims created

🤖 Seeding ML data for tenant tenant_1234567890_0...
  🤖 Generating ML predictions...
     ✓ 480 predictions generated
  📊 Creating model metadata...
     ✓ 4 models initialized
  📈 Creating feature baselines...
     ✓ Baselines created for 4 models

📊 Seeding analytics for tenant tenant_1234567890_0...
     ✓ Analytics benchmarks and scheduled reports created

💬 Seeding feedback for tenant tenant_1234567890_0...
     ✓ 10 feedback samples created

... (repeat for other tenants)

===============================================
✅ Platform seeding complete!

📊 Summary:
   Tenants: 3
   Users: 150
   Claims: 600
   ML Predictions: 1440
   Model Metadata: 12
   Feedback Samples: 30
```

### Safety Notes

- ⚠️ **`--reset` flag is destructive** - deletes ALL data from seeded tables
- Always backup production databases before running with `--reset`
- Use separate development/staging databases for seeding
- Seed data uses mock Clerk user IDs (not real authentication)

### Integration with CI/CD

Add to GitHub Actions for automated test data setup:

```yaml
- name: Seed test database
  run: |
    pnpm db:migrate
    pnpm seed:platform --tenants 2 --users 30 --claims 100
```

---

## 📦 Package.json Scripts

All tools accessible via convenient npm scripts:

```json
{
  "seed:platform": "npx tsx scripts/seed-full-platform.ts",
  "seed:claims": "npx tsx scripts/seed-test-claims.ts",
  "ml:retrain": "npx tsx scripts/ml-retraining-pipeline.ts",
  "ml:retrain:all": "npx tsx scripts/ml-retraining-pipeline.ts"
}
```

---

## 🛠️ Development Workflow

### Initial Setup

1. Run database migrations: `pnpm db:migrate`
2. Seed platform: `pnpm seed:platform`
3. Start development server: `pnpm dev`

### Daily Development

1. Pull latest changes
2. Run migrations if needed: `pnpm db:migrate`
3. Reseed if schema changed: `pnpm seed:platform --reset`

### Testing ML Pipeline

1. Seed platform with data: `pnpm seed:platform`
2. Run retraining: `pnpm ml:retrain:all`
3. Check logs for drift detection and training results
4. Verify model_metadata table for new versions

---

## 📊 Monitoring & Observability

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

### Check Active Models

```sql
SELECT 
  model_type,
  model_version,
  baseline_accuracy,
  deployed_at
FROM model_metadata
WHERE is_active = true;
```

### Check Drift Status

```sql
SELECT 
  model_type,
  baseline_value,
  baseline_complexity,
  created_at
FROM model_feature_baselines
WHERE is_active = true;
```

### Check Feedback Volume

```sql
SELECT 
  feedback_category,
  COUNT(*) as count,
  AVG(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) * 100 as resolution_rate
FROM member_ai_feedback
GROUP BY feedback_category
ORDER BY count DESC;
```

---

## 🚀 Production Deployment Checklist

- [ ] Database migrations applied to production
- [ ] Environment variables configured (tenant IDs, Azure ML endpoints)
- [ ] Retraining pipeline scheduled (daily 2 AM recommended)
- [ ] Notification channels configured (email/Slack)
- [ ] Monitoring alerts set up for failed retraining
- [ ] Stakeholder notification list updated
- [ ] Backup and rollback procedures documented
- [ ] A/B testing validation gates enabled
- [ ] Fairness audit integration tested
- [ ] Performance benchmarks established

---

## 📖 Related Documentation

- [AI Implementation Status](docs/ai/AI_IMPLEMENTATION_STATUS.md)
- [AI Monitoring Procedures](docs/ai/AI_MONITORING_PROCEDURES.md)
- [90% Implementation Plan](docs/ai/90_PERCENT_IMPLEMENTATION_PLAN.md)
- [Board Presentation Jan 2026](docs/ai/BOARD_PRESENTATION_JAN_2026.md)

---

**Last Updated:** January 2026  
**Maintainer:** CTO / AI Governance Committee
