# ML Models Quick Start Guide

## 🚀 Getting Started with ML Predictions

This guide will help you start using the actual ML models in Union Eyes.

## Prerequisites

- ✅ TensorFlow.js installed (`@tensorflow/tfjs-node` in package.json)
- ✅ Database with historical data (run `pnpm seed:platform` if needed)
- ✅ PostgreSQL with `ml_predictions` and `model_metadata` tables

## Step 1: Train Your First Model (5 minutes)

### Option A: Train Churn Risk Model

```bash
# Train the churn prediction model
pnpm ml:train:churn
```

**Expected output:**
```
🎯 UC-07: Churn Risk Prediction Model Training
===============================================

📊 Extracting features for tenant default-tenant-id as of 2025-11-13...
   ✓ Extracted features for 150 members
   ✓ Churn rate: 23.3%

🤖 Training churn risk model with TensorFlow.js...
   Training set: 120 members
   Test set: 30 members

   Creating neural network model...
   Training model (this may take a minute)...
   Epoch 0: loss=0.6423, accuracy=0.6500
   Epoch 20: loss=0.4123, accuracy=0.8000
   ...
   Epoch 100: loss=0.2145, accuracy=0.8750

   Evaluating model on test set...

📊 Model Performance:
   Accuracy:  87.5%
   Precision: 82.3%
   Recall:    89.1%
   F1 Score:  85.5%

📈 Risk Distribution:
   Low Risk:    12 members (40.0%)
   Medium Risk: 10 members (33.3%)
   High Risk:   8 members (26.7%)

✅ Model meets 85% accuracy target!
✅ Saved churn model to lib/ml/models/saved/churn-model

💾 Saving model metadata...
   ✓ Model metadata saved

===============================================
✅ Churn risk model training complete!
```

### Option B: Train Workload Forecast Model

```bash
# Train the workload forecasting model
pnpm ml:train:workload
```

## Step 2: Test Predictions via API

### Test Churn Risk Prediction

```bash
# PowerShell
$body = @{
  memberId = "user_abc123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/ml/predictions/churn-risk" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Expected response:**
```json
{
  "prediction": {
    "memberId": "user_abc123",
    "memberName": "John Smith",
    "riskScore": 67,
    "riskLevel": "medium",
    "churnProbability": 0.67,
    "contributingFactors": [
      "Inactive for 75 days",
      "Below-average resolution rate (62%)"
    ],
    "recommendedInterventions": [
      "📧 Send re-engagement email",
      "🎉 Invite to member appreciation event"
    ],
    "lastActivity": "2025-11-28T00:00:00.000Z",
    "unionTenure": 4.2,
    "totalCases": 8,
    "predictedAt": "2026-02-11T14:23:45.123Z"
  }
}
```

### Test Workload Forecast

```bash
# PowerShell
$body = @{
  startDate = "2026-02-12"
  endDate = "2026-03-14"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/ml/predictions/workload-forecast" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Expected response:**
```json
{
  "organizationId": "org_123",
  "forecastHorizon": 30,
  "predictions": [
    {
      "date": "2026-02-12",
      "predictedVolume": 23,
      "confidenceInterval": {
        "lower": 18,
        "upper": 27
      },
      "trend": "stable",
      "seasonalFactor": 1.1
    },
    // ... more days
  ],
  "trend": "stable",
  "accuracy": 82,
  "averageVolume": 21,
  "peakDates": ["2026-02-18", "2026-02-25"],
  "resourceRecommendations": [
    "🤖 ML model predictions (TensorFlow.js)",
    "⚠️ 2 high-volume days detected - consider increasing staffing by 20-30%",
    "➡️ Stable volume expected - ideal time for steward development"
  ],
  "modelVersion": "v1.0.0"
}
```

## Step 3: Verify Models Are Working

### Check Model Files

```bash
# PowerShell
Get-ChildItem -Recurse lib\ml\models\saved\
```

**You should see:**
```
lib\ml\models\saved\
├── churn-model\
│   ├── model.json       (architecture)
│   └── weights.bin      (trained weights)
└── workload-model\
    ├── model.json
    └── weights.bin
```

### Check Database Metadata

```sql
-- View model metadata
SELECT 
  model_type,
  version,
  accuracy,
  trained_at
FROM model_metadata
ORDER BY trained_at DESC;
```

### Check Recent Predictions

```sql
-- View recent ML predictions
SELECT 
  user_id,
  model_type,
  model_version,
  confidence_score,
  features_used->>'riskScore' as risk_score,
  predicted_at
FROM ml_predictions
WHERE predicted_at > NOW() - INTERVAL '1 day'
ORDER BY predicted_at DESC
LIMIT 10;
```

## Common Issues & Solutions

### ❌ Issue: "No trained model found"

**Solution:** Train the model first:
```bash
pnpm ml:train:churn
# or
pnpm ml:train:workload
```

### ❌ Issue: "Insufficient training data"

**Solution:** Seed the database:
```bash
pnpm seed:platform --users 100 --claims 300
```

### ❌ Issue: "Model accuracy too low"

**Solutions:**
1. Collect more training data (need 100+ members)
2. Check data quality (missing values?)
3. Adjust features in model definition
4. Tune hyperparameters (learning rate, epochs)

### ❌ Issue: "Prediction taking too long"

**Cause:** Cold start (model loading on first request)

**Solution:** This is normal. Subsequent predictions will be <50ms.

### ❌ Issue: "Cannot find module '@tensorflow/tfjs-node'"

**Solution:** Reinstall dependencies:
```bash
pnpm install
```

## Performance Benchmarks

| Operation | Expected Time |
|-----------|---------------|
| Model training | 1-3 minutes |
| Model loading (cold start) | 200-500ms |
| Single prediction | <50ms |
| Batch prediction (30 days) | <100ms |

## Next Steps

### 1. Integrate with UI

```typescript
// In your React component
const predictChurn = async (memberId: string) => {
  const response = await fetch('/api/ml/predictions/churn-risk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId })
  });
  
  const data = await response.json();
  return data.prediction;
};
```

### 2. Schedule Automated Retraining

```typescript
// In a cron job or scheduled function
import { exec } from 'child_process';

// Retrain weekly
cron.schedule('0 2 * * 0', () => {
  console.log('Starting scheduled model retraining...');
  exec('pnpm ml:retrain:all', (error, stdout) => {
    if (error) {
      console.error('Retraining failed:', error);
      // Alert team
    } else {
      console.log('Retraining complete:', stdout);
    }
  });
});
```

### 3. Monitor Model Performance

```typescript
// Track prediction accuracy over time
const monitorAccuracy = async () => {
  const result = await db.execute(sql`
    SELECT 
      DATE(predicted_at) as date,
      model_type,
      AVG(confidence_score) as avg_confidence,
      COUNT(*) as prediction_count
    FROM ml_predictions
    WHERE predicted_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(predicted_at), model_type
    ORDER BY date DESC
  `);
  
  // Alert if confidence drops below threshold
  const lowConfidence = result.filter(r => r.avg_confidence < 0.6);
  if (lowConfidence.length > 3) {
    console.warn('⚠️ Model confidence declining - consider retraining');
  }
};
```

### 4. Implement Feature Importance Dashboard

```typescript
import { explainPrediction } from '@/lib/ml/models/churn-prediction-model';

// Show why a member is predicted to churn
const explanation = await explainPrediction({
  daysSinceLastActivity: 90,
  resolutionRate: 45,
  avgSatisfactionScore: 2.8,
  totalCases: 3,
  unionTenure: 1.5
});

console.log('Feature Importance:');
// {
//   daysSinceLastActivity: 0.42,  // Most important
//   resolutionRate: 0.28,
//   avgSatisfactionScore: 0.18,
//   totalCases: 0.08,
//   unionTenure: 0.04              // Least important
// }
```

## Advanced Usage

### Custom Model Training

```typescript
import * as tf from '@tensorflow/tfjs-node';
import { createChurnModel, saveChurnModel } from '@/lib/ml/models/churn-prediction-model';

// Create custom architecture
const customModel = tf.sequential({
  layers: [
    tf.layers.dense({ inputShape: [5], units: 32, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.3 }),
    tf.layers.dense({ units: 16, activation: 'relu' }),
    tf.layers.dense({ units: 1, activation: 'sigmoid' })
  ]
});

customModel.compile({
  optimizer: tf.train.adam(0.0005),
  loss: 'binaryCrossentropy',
  metrics: ['accuracy']
});

// Train with your data
await customModel.fit(trainX, trainY, {
  epochs: 150,
  batchSize: 64
});

// Save
await saveChurnModel(customModel);
```

### Batch Prediction Optimization

```typescript
import { predictWorkloadBatch } from '@/lib/ml/models/workload-forecast-model';

// Predict 90 days at once (more efficient than 90 individual calls)
const features = generate90DayFeatures(); // Your feature generation
const predictions = await predictWorkloadBatch(features);

// Process all 90 predictions
predictions.forEach((pred, idx) => {
  console.log(`Day ${idx + 1}: ${pred.predictedVolume} cases`);
});
```

## Resources

- 📖 [Full ML Architecture Documentation](./ML_ARCHITECTURE.md)
- 🎓 [TensorFlow.js Guide](https://www.tensorflow.org/js/guide)
- 💡 [Feature Engineering Best Practices](./FEATURE_ENGINEERING.md)
- 🔧 [Model Training Scripts](../../scripts/train-*.ts)

## Support

**Questions?** Check:
1. [ML Architecture Docs](./ML_ARCHITECTURE.md)
2. Training script source code in `scripts/`
3. Model implementation in `lib/ml/models/`

**Found a bug?** Open an issue with:
- Model version
- Training logs
- Prediction example that failed

---

**Status**: ✅ Production Ready  
**Last Updated**: February 11, 2026  
**Version**: 1.0
