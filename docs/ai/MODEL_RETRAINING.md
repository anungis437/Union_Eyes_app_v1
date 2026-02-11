# Model Retraining Guide

## Overview

ML models degrade over time as data patterns change. This guide covers when and how to retrain models to maintain prediction accuracy.

## Why Retrain?

### Concept Drift
- **Definition**: The relationship between features and target changes over time
- **Example**: During pandemic, member engagement patterns shifted dramatically
- **Impact**: Model trained on pre-pandemic data performs poorly post-pandemic

### Data Drift  
- **Definition**: The distribution of input features changes
- **Example**: Demographic shift as younger members join
- **Impact**: Model sees feature values outside its training range

### Performance Degradation
- **Signs**: Accuracy drops below threshold, confidence scores decrease
- **Causes**: New patterns not in training data, external events (strikes, policy changes)

## When to Retrain

### Scheduled Retraining

| Frequency | Model | Reason |
|-----------|-------|--------|
| **Weekly** | Workload Forecast | Capture recent trends, seasonal shifts |
| **Monthly** | Churn Risk | Sufficient new data accumulated |
| **Quarterly** | All Models | Deep evaluation and architecture review |

### Event-Triggered Retraining

| Event | Action | Example |
|-------|--------|---------|
| **Accuracy drop >5%** | Immediate retrain | Model accuracy 87% → 82% |
| **New feature added** | Retrain with new inputs | Add "shift_percentage" feature |
| **External shock** | Emergency retrain | Strike, layoffs, policy change |
| **Data quality issues** | Fix data, then retrain | Missing values discovered |

### Manual Retraining

Retrain when:
- Model architecture improved
- Hyperparameters tuned
- Feature engineering enhanced
- Testing new algorithms

## How to Retrain

### Basic Retraining (Recommended Path)

```bash
# 1. Check current model performance
psql $DATABASE_URL -c "
  SELECT model_type, version, accuracy, trained_at
  FROM model_metadata
  WHERE is_active = true
  ORDER BY trained_at DESC;
"

# 2. Backup current model
cp -r lib/ml/models/saved/churn-model lib/ml/models/saved/churn-model.backup

# 3. Retrain
pnpm ml:train:churn

# 4. Compare performance
# Review training logs for accuracy metrics

# 5. Test new model
curl -X POST http://localhost:3000/api/ml/predictions/churn-risk \
  -H "Content-Type: application/json" \
  -d '{"memberId":"user_test"}'

# 6. If satisfied, deploy
# Model is already saved and will be used by API
# If not satisfied, restore backup
# cp -r lib/ml/models/saved/churn-model.backup lib/ml/models/saved/churn-model
```

### Automated Retraining Pipeline

```typescript
// scripts/scheduled-retraining.ts
import { exec } from 'child_process';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function shouldRetrain(modelType: string): Promise<boolean> {
  // Check accuracy over last 7 days
  const result = await db.execute(sql`
    SELECT AVG(confidence_score) as avg_confidence
    FROM ml_predictions
    WHERE model_type = ${modelType}
      AND predicted_at > NOW() - INTERVAL '7 days'
  `);
  
  const avgConfidence = parseFloat(result[0]?.avg_confidence || '0.8');
  
  // Retrain if confidence drops below 70%
  return avgConfidence < 0.7;
}

async function retrain(modelType: string) {
  const command = modelType === 'churn_risk' 
    ? 'pnpm ml:train:churn'
    : 'pnpm ml:train:workload';
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Retraining failed:`, stderr);
        reject(error);
      } else {
        console.log(`Retraining complete:`, stdout);
        resolve(stdout);
      }
    });
  });
}

// Run daily
const checkAndRetrain = async () => {
  for (const modelType of ['churn_risk', 'workload_forecast']) {
    if (await shouldRetrain(modelType)) {
      console.log(`🔄 Retraining ${modelType} due to performance degradation`);
      await retrain(modelType);
      
      // Alert team
      await sendSlackNotification({
        message: `✅ ${modelType} model retrained successfully`,
        accuracy: '...' // Extract from logs
      });
    }
  }
};

// Schedule with cron or cloud scheduler
cron.schedule('0 3 * * *', checkAndRetrain); // Daily at 3 AM
```

## Retraining Best Practices

### 1. Data Quality Checks

Before retraining, validate data:

```typescript
async function validateTrainingData() {
  // Check sufficient data
  const memberCount = await db.execute(sql`
    SELECT COUNT(*) FROM profiles WHERE role = 'member'
  `);
  
  if (memberCount < 100) {
    throw new Error('Insufficient members for training (need 100+)');
  }
  
  // Check for missing values
  const missingData = await db.execute(sql`
    SELECT COUNT(*) FROM profiles
    WHERE union_tenure_years IS NULL OR member_age IS NULL
  `);
  
  if (missingData > memberCount * 0.1) {
    console.warn('⚠️ >10% missing data - imputation may affect model');
  }
  
  // Check for outliers
  const outliers = await db.execute(sql`
    SELECT COUNT(*) FROM profiles
    WHERE union_tenure_years > 50 OR member_age > 100
  `);
  
  if (outliers > 0) {
    console.warn(`⚠️ ${outliers} outlier records detected`);
  }
}
```

### 2. Train/Test Split Strategy

```typescript
// Use temporal split for time series (more realistic)
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 30); // Last 30 days = test

const trainData = allData.filter(d => d.date < cutoffDate);
const testData = allData.filter(d => d.date >= cutoffDate);

// NOT: Random split (can leak future info into training)
```

### 3. Version Control

```typescript
// Save model with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');
const modelPath = `lib/ml/models/saved/churn-model-${timestamp}`;

await saveChurnModel(model, modelPath);

// Keep last 5 versions
const versions = fs.readdirSync('lib/ml/models/saved/')
  .filter(dir => dir.startsWith('churn-model-'))
  .sort()
  .reverse();

// Delete old versions beyond 5
versions.slice(5).forEach(dir => {
  fs.rmSync(`lib/ml/models/saved/${dir}`, { recursive: true });
});
```

### 4. A/B Testing New Models

```typescript
// Route 10% of traffic to new model
const useNewModel = Math.random() < 0.10;

const prediction = useNewModel
  ? await predictChurnRiskV2(features)  // New model
  : await predictChurnRisk(features);    // Current model

// Log for comparison
await db.execute(sql`
  INSERT INTO ml_predictions (
    ...,
    model_version,
    is_ab_test
  ) VALUES (
    ...,
    ${useNewModel ? 'v2.0.0' : 'v1.0.0'},
    true
  )
`);
```

### 5. Rollback Plan

```bash
# If new model performs worse, rollback:

# 1. Stop API (or just don't deploy new model)
# 2. Restore backup
cp -r lib/ml/models/saved/churn-model.backup \
      lib/ml/models/saved/churn-model

# 3. Update metadata
psql $DATABASE_URL -c "
  UPDATE model_metadata
  SET is_active = false
  WHERE version = 'v2.0.0' AND model_type = 'churn_risk';
  
  UPDATE model_metadata
  SET is_active = true
  WHERE version = 'v1.0.0' AND model_type = 'churn_risk';
"

# 4. Restart API
# 5. Verify predictions use old model
```

## Monitoring Post-Retraining

### Key Metrics to Track

| Metric | Threshold | Action if Violated |
|--------|-----------|-------------------|
| Accuracy | ≥85% (churn), ≥80% (workload) | Investigate features, collect more data |
| Confidence | ≥70% average | Retrain with more epochs, check data quality |
| Latency | <100ms (95th percentile) | Optimize model architecture, use quantization |
| Memory | <50MB per model | Prune unnecessary weights, reduce layer sizes |

### Monitoring Dashboard

```typescript
// Generate daily report
async function generateRetrainingReport() {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  
  const metrics = await db.execute(sql`
    SELECT 
      model_type,
      model_version,
      AVG(confidence_score) as avg_confidence,
      AVG(response_time_ms) as avg_latency,
      COUNT(*) as prediction_count,
      COUNT(DISTINCT user_id) as unique_users
    FROM ml_predictions
    WHERE predicted_at > ${since.toISOString()}
    GROUP BY model_type, model_version
  `);
  
  console.table(metrics);
  
  // Alert if anomalies
  metrics.forEach(m => {
    if (m.avg_confidence < 0.7) {
      sendAlert({
        severity: 'warning',
        message: `${m.model_type} confidence dropped to ${m.avg_confidence.toFixed(2)}`
      });
    }
  });
}
```

## Troubleshooting Retraining Issues

### Issue: Training fails with "Insufficient data"

**Solutions:**
1. Lower minimum data threshold (currently 50 members)
2. Run `pnpm seed:platform --users 200` to generate more data
3. Collect more real user data before retraining

### Issue: Accuracy worse after retraining

**Possible Causes:**
- **Overfitting**: Reduce model complexity, add more dropout
- **Bad data**: Check for recent data quality issues
- **Wrong split**: Use temporal split, not random split
- **Label leakage**: Future data leaked into training

**Solutions:**
```typescript
// Increase dropout
tf.layers.dropout({ rate: 0.3 })  // From 0.2

// Add L2 regularization
tf.layers.dense({
  units: 16,
  kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
})

// Early stopping
await model.fit(xs, ys, {
  callbacks: {
    onEpochEnd: (epoch, logs) => {
      if (logs.val_loss > bestValLoss) {
        earlyStopCount++;
        if (earlyStopCount >= 5) {
          model.stopTraining = true; // Stop training
        }
      }
    }
  }
});
```

### Issue: Model not loading after retrain

**Solutions:**
1. Check file permissions on saved model
2. Verify model.json is valid JSON
3. Ensure weights.bin is not corrupted
4. Restart Node.js server to clear cache

```bash
# Verify model files
cat lib/ml/models/saved/churn-model/model.json | python -m json.tool

# Check file sizes
ls -lh lib/ml/models/saved/churn-model/
# model.json should be ~5-20KB
# weights.bin should be ~500KB-5MB
```

## Retraining Checklist

Before retraining:
- [ ] Current model performance documented
- [ ] Backup of current model created
- [ ] Training data validated (no missing values, outliers handled)
- [ ] Sufficient data available (100+ members, 90+ days)
- [ ] Test plan prepared (what to test after retraining)

During retraining:
- [ ] Training logs captured
- [ ] Validation metrics monitored
- [ ] No errors or warnings

After retraining:
- [ ] New model performance compared to old
- [ ] Accuracy meets or exceeds target
- [ ] Sample predictions tested
- [ ] Model artifacts saved with version
- [ ] Metadata updated in database
- [ ] Team notified of changes

---

## Appendix: Retraining Commands

```bash
# Train individual models
pnpm ml:train:churn
pnpm ml:train:workload

# Train all models
pnpm ml:retrain:all

# Train with custom parameters
MODEL_EPOCHS=150 MODEL_BATCH_SIZE=64 pnpm ml:train:churn

# Dry run (validate data without training)
DRY_RUN=true pnpm ml:train:churn

# Verbose logging
DEBUG=true pnpm ml:train:churn
```

---

**Last Updated**: February 11, 2026  
**Version**: 1.0
