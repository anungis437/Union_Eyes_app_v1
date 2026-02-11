# ML Model Architecture & Implementation

## Overview

Union Eyes now uses **real machine learning models** powered by TensorFlow.js instead of rule-based heuristics. This document explains the ML architecture, model choices, and how to maintain and retrain models.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Model 1: Churn Risk Prediction](#model-1-churn-risk-prediction)
- [Model 2: Workload Forecasting](#model-2-workload-forecasting)
- [Model Training](#model-training)
- [Model Versioning](#model-versioning)
- [Feature Engineering](#feature-engineering)
- [Model Evaluation](#model-evaluation)
- [Production Deployment](#production-deployment)
- [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### Technology Stack

- **ML Framework**: TensorFlow.js (Node.js backend)
- **Model Type**: Feed-forward Neural Networks
- **Runtime**: Runs directly in Next.js API routes
- **Storage**: Models saved to disk in `lib/ml/models/saved/`
- **Metadata**: Stored in PostgreSQL `model_metadata` table

### Why TensorFlow.js?

1. **No separate microservice** - Runs directly in Next.js
2. **Easy deployment** - No Python runtime required
3. **Good performance** - Native CPU/GPU acceleration
4. **Type safety** - Full TypeScript support
5. **Low latency** - In-process predictions (< 50ms)

### Architecture Diagram

```
┌─────────────────┐
│  Next.js API    │
│   /api/ml/...   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌──────────────────┐
│  ML Model       │◄──────│ Training Scripts │
│  (TensorFlow.js)│       │  scripts/*.ts    │
└────────┬────────┘       └──────────────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌──────────────────┐
│  Saved Models   │       │   PostgreSQL     │
│  lib/ml/models/ │       │  (Metadata)      │
└─────────────────┘       └──────────────────┘
```

---

## Model 1: Churn Risk Prediction

### Problem Statement

Predict which union members are likely to churn (stop engaging) in the next 90 days.

### Model Architecture

```
Input Layer (5 features)
         ↓
Dense Layer (16 neurons, ReLU)
         ↓
Dropout (20%)
         ↓
Dense Layer (8 neurons, ReLU)
         ↓
Output Layer (1 neuron, Sigmoid)
         ↓
Churn Probability (0-1)
```

### Features (5 total)

| Feature | Description | Range | Importance |
|---------|-------------|-------|------------|
| daysSinceLastActivity | Days since member last interacted | 0-365+ | High |
| resolutionRate | % of cases resolved favorably | 0-100% | High |
| avgSatisfactionScore | Average satisfaction rating | 1-5 | High |
| totalCases | Total cases filed (lifetime) | 0-100+ | Medium |
| unionTenure | Years as union member | 0-50+ | Medium |

### Feature Normalization

All features are z-score normalized:

```typescript
normalized = (value - mean) / std

// Example:
daysSinceLastActivity: mean=45, std=30
resolutionRate: mean=70, std=20
```

### Output Interpretation

| Churn Probability | Risk Score | Risk Level | Action |
|-------------------|------------|------------|--------|
| 0.0 - 0.39 | 0-39 | Low | Monitor |
| 0.40 - 0.69 | 40-69 | Medium | Re-engagement email |
| 0.70 - 1.0 | 70-100 | High | Priority outreach call |

### Model Performance (Target)

- **Accuracy**: ≥85%
- **Precision**: ≥80%
- **Recall**: ≥75%
- **F1-Score**: ≥77%

### Training Data Requirements

- **Minimum**: 50 members with 6+ months history
- **Recommended**: 200+ members with 1+ year history
- **Label definition**: "Churned" = no activity for 90+ days

---

## Model 2: Workload Forecasting

### Problem Statement

Predict daily case volume for the next 30, 60, or 90 days to optimize staffing.

### Model Architecture

```
Input Layer (7 features)
         ↓
Dense Layer (32 neurons, ReLU)
         ↓
Dropout (20%)
         ↓
Dense Layer (16 neurons, ReLU)
         ↓
Dense Layer (8 neurons, ReLU)
         ↓
Output Layer (1 neuron, Linear)
         ↓
Predicted Case Volume (integer)
```

### Features (7 total)

| Feature | Description | Range | Importance |
|---------|-------------|-------|------------|
| dayOfWeek | Day of week (Sunday=0) | 0-6 | High |
| weekOfYear | Week number in year | 1-52 | Medium |
| monthOfYear | Month number | 1-12 | Medium |
| isHoliday | Major holiday flag | 0-1 | High |
| recentAvg | 7-day moving average | varies | High |
| recentTrend | Slope of recent trend | -1 to +1 | Medium |
| seasonalFactor | Historical seasonal multiplier | 0.5-1.5 | Medium |

### Pattern Recognition

The model learns:

1. **Weekly patterns**: Monday spikes, Friday drops
2. **Holiday effects**: 50% reduction on major holidays
3. **Seasonal trends**: Summer lulls, winter increases
4. **Growth trends**: Overall upward/downward momentum

### Output Interpretation

```typescript
{
  predictedVolume: 23,
  confidenceInterval: {
    lower: 18,   // 80% confidence lower bound
    upper: 27    // 80% confidence upper bound
  },
  confidence: 0.85  // Model confidence (0-1)
}
```

### Model Performance (Target)

- **Accuracy**: ≥80% (within ±15% of actual)
- **MAE**: ≤3 cases per day
- **RMSE**: ≤5 cases per day

### Training Data Requirements

- **Minimum**: 90 days of historical case data
- **Recommended**: 1+ year for seasonal patterns
- **Granularity**: Daily case counts

---

## Model Training

### Training Process

```bash
# Train churn risk model
pnpm ml:train:churn

# Train workload forecast model
pnpm ml:train:workload

# Train all models
pnpm ml:retrain:all
```

### Training Steps

1. **Data Extraction**: Pull features from PostgreSQL
2. **Data Preprocessing**: Normalize features, handle missing values
3. **Train/Test Split**: 80% training, 20% testing
4. **Model Training**: 50-100 epochs with early stopping
5. **Evaluation**: Calculate accuracy, precision, recall, F1
6. **Model Saving**: Save to disk with versioning
7. **Metadata Recording**: Log accuracy and config to DB

### Retraining Schedule

| Frequency | Reason |
|-----------|--------|
| Monthly | Incorporate new data patterns |
| After major events | Union contract changes, layoffs |
| When accuracy drops | Below 75% on validation set |
| Manual request | When improving features |

### Synthetic Pre-Training

When no real training data exists, models are initialized with synthetic data based on known patterns. This ensures better-than-random predictions immediately.

```typescript
// Example: High churn risk synthetic pattern
{
  daysSinceLastActivity: 90+,
  resolutionRate: <30%,
  avgSatisfactionScore: <2.5,
  totalCases: <3,
  unionTenure: <2 years
}
→ Label: Churned = true
```

---

## Model Versioning

### Version Format

`v{major}.{minor}.{patch}`

Example: `v1.0.0`

### Versioning Strategy

| Change | Version Bump | Example |
|--------|--------------|---------|
| Architecture change | Major | v1.0.0 → v2.0.0 |
| New features added | Minor | v1.0.0 → v1.1.0 |
| Retrain same model | Patch | v1.0.0 → v1.0.1 |

### Version Tracking

Every prediction includes:

```typescript
{
  modelVersion: "v1.0.0",
  modelMetadata: {
    trainedAt: "2025-02-10T14:23:00Z",
    accuracy: 0.87,
    features: [...],
    isPredictionFromML: true
  }
}
```

### Model Registry

Models are stored in:

```
lib/ml/models/saved/
├── churn-model/
│   ├── model.json       # Model architecture
│   └── weights.bin      # Trained weights
└── workload-model/
    ├── model.json
    └── weights.bin
```

Database tracking:

```sql
SELECT * FROM model_metadata
WHERE model_type = 'churn_risk'
ORDER BY trained_at DESC;
```

---

## Feature Engineering

### Best Practices

1. **Domain Knowledge**: Features should encode actual business logic
2. **Normalization**: Always normalize continuous features
3. **Missing Values**: Handle with sensible defaults (not zeros)
4. **Feature Correlation**: Check for multicollinearity
5. **Feature Importance**: Measure and document

### Adding New Features

```typescript
// 1. Update feature interface
export interface ChurnFeatures {
  // Existing features...
  newFeature: number;  // Add here
}

// 2. Update normalization params
const NORMALIZATION_PARAMS = {
  newFeature: { mean: X, std: Y }  // Calculate from data
};

// 3. Update model architecture if needed
// Input shape changes: [5] → [6]

// 4. Retrain model
pnpm ml:train:churn

// 5. Bump model version: v1.0.0 → v1.1.0
```

### Feature Importance Analysis

```typescript
import { explainPrediction } from '@/lib/ml/models/churn-prediction-model';

const importance = await explainPrediction(features);
// {
//   daysSinceLastActivity: 0.42,
//   resolutionRate: 0.28,
//   avgSatisfactionScore: 0.18,
//   totalCases: 0.08,
//   unionTenure: 0.04
// }
```

---

## Model Evaluation

### Metrics Explained

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Accuracy** | (TP + TN) / Total | Overall correctness |
| **Precision** | TP / (TP + FP) | "When we predict churn, how often is it right?" |
| **Recall** | TP / (TP + FN) | "Of actual churners, how many did we catch?" |
| **F1-Score** | 2·(P·R)/(P+R) | Harmonic mean of precision & recall |

### Confusion Matrix Example

```
                 Predicted
                 No    Yes
Actual  No      140    10     (TN=140, FP=10)
        Yes      8     42     (FN=8, TP=42)

Accuracy  = (140+42)/200 = 91%
Precision = 42/(42+10)   = 81%
Recall    = 42/(42+8)    = 84%
F1-Score  = 2×(0.81×0.84)/(0.81+0.84) = 82%
```

### Evaluation Checklist

- [ ] Accuracy ≥ target (85% for churn, 80% for workload)
- [ ] Balanced precision & recall (no severe bias)
- [ ] Good performance across risk levels (low/medium/high)
- [ ] Confidence intervals are reasonable
- [ ] No obvious overfitting (train vs test similar)

### Monitoring Predictions in Production

```sql
-- Check recent prediction accuracy
SELECT 
  model_type,
  COUNT(*) as prediction_count,
  AVG(confidence_score) as avg_confidence,
  AVG(response_time_ms) as avg_latency_ms
FROM ml_predictions
WHERE predicted_at > NOW() - INTERVAL '7 days'
GROUP BY model_type;

-- Find low-confidence predictions for review
SELECT * FROM ml_predictions
WHERE confidence_score < 0.6
ORDER BY predicted_at DESC
LIMIT 20;
```

---

## Production Deployment

### Model Loading

Models are lazy-loaded on first prediction:

```typescript
// First request to /api/ml/predictions/churn-risk
// → Loads model from disk (200-500ms)
// → Caches in memory
// → Future requests: <50ms
```

### Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| First prediction (cold start) | 200-500ms | Model loading |
| Subsequent predictions | <50ms | In-memory model |
| Batch prediction (10 items) | <100ms | Parallel inference |

### Memory Usage

- **Churn Model**: ~5 MB
- **Workload Model**: ~8 MB
- **Total ML Memory**: ~15 MB

### API Endpoint Integration

Endpoints now use ML models:

```typescript
// OLD (rule-based)
if (daysSinceLastActivity > 90) riskScore += 30;
if (resolutionRate < 50) riskScore += 20;
// ... more if/else

// NEW (ML-based)
const prediction = await predictChurnRisk({
  daysSinceLastActivity,
  resolutionRate,
  avgSatisfactionScore,
  totalCases,
  unionTenure
});
// → Returns actual probability from trained model
```

### Error Handling

```typescript
try {
  const prediction = await predictChurnRisk(features);
  // Use ML prediction
} catch (error) {
  console.error('ML prediction failed:', error);
  // Fallback: Use last known prediction or heuristic
  // Never fail the entire endpoint due to ML errors
}
```

---

## Future Enhancements

### Short-Term (Q2 2025)

- [ ] **SHAP explainability**: "Why did the model predict high churn?"
- [ ] **A/B testing framework**: Compare model versions
- [ ] **Automated retraining**: Trigger on accuracy drop
- [ ] **Web UI for model management**: View metrics, compare versions

### Medium-Term (Q3-Q4 2025)

- [ ] **Ensemble models**: Combine multiple models for better accuracy
- [ ] **Deep learning**: LSTM for time series forecasting
- [ ] **Transfer learning**: Pre-train on public union datasets
- [ ] **Federated learning**: Train across multiple unions without sharing data

### Long-Term (2026+)

- [ ] **Python microservice**: For advanced models (XGBoost, LightGBM)
- [ ] **Real-time learning**: Update models with streaming data
- [ ] **Causal inference**: "What intervention will reduce churn most?"
- [ ] **Multi-task learning**: One model for multiple predictions

### Migration to Python ML Service

If TensorFlow.js becomes limiting:

```
┌──────────────┐         ┌──────────────────┐
│  Next.js API │ ──HTTP─►│ FastAPI ML Service│
│  /api/ml/... │ ◄─JSON──│  (Python)         │
└──────────────┘         └──────────────────┘
                                 │
                                 ▼
                         ┌──────────────────┐
                         │ Scikit-learn     │
                         │ XGBoost          │
                         │ PyTorch          │
                         └──────────────────┘
```

**When to migrate:**

- Models exceed 100MB
- Need GPU acceleration
- Want to use scikit-learn ecosystem
- Advanced NLP/CV requirements

---

## Appendix

### Useful Commands

```bash
# View model files
ls -lah lib/ml/models/saved/

# Check model metadata
psql -d $DATABASE_URL -c "SELECT * FROM model_metadata;"

# Test prediction locally
node -e "require('./lib/ml/models/churn-prediction-model').predictChurnRisk({...})"

# Analyze prediction errors
psql -d $DATABASE_URL -c "
  SELECT features_used->>'riskLevel', COUNT(*)
  FROM ml_predictions
  WHERE model_type = 'churn_risk'
  GROUP BY 1;
"
```

### References

- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [Model Evaluation Best Practices](https://scikit-learn.org/stable/modules/model_evaluation.html)
- [Feature Engineering Guide](https://www.featuretools.com/guides/)
- [ML Monitoring](https://www.evidentlyai.com/blog/ml-monitoring-101)

---

**Last Updated**: February 11, 2026  
**Authors**: Union Eyes ML Team  
**Version**: 1.0
