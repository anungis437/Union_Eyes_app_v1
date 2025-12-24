# Union Eyes AI Monitoring Procedures

**Version:** 1.0 (Draft)  
**Effective Date:** February 1, 2026  
**Last Updated:** December 13, 2025  
**Owner:** Chief Technology Officer  
**Review Cycle:** Quarterly  
**Status:** Pending AI Governance Committee Approval

---

## 1. Monitoring Overview

### Purpose

This document establishes comprehensive procedures for monitoring AI model performance, accuracy, fairness, and system health at Union Eyes. Continuous monitoring ensures AI systems remain reliable, fair, and safe.

### Objectives

1. **Early Detection:** Identify issues before they cause harm
2. **Performance Assurance:** Maintain accuracy and quality standards
3. **Fairness Oversight:** Detect algorithmic bias quickly
4. **System Reliability:** Ensure uptime and performance
5. **Continuous Improvement:** Data-driven optimization

### Monitoring Layers

**Layer 1: Real-Time Automated Monitoring**
- Metrics calculated continuously (every 5 minutes)
- Automated alerts for threshold violations
- Dashboard visualization
- 24/7 operational monitoring

**Layer 2: Daily Reviews**
- CTO or Data Science Lead reviews dashboards
- Spot-check anomalies
- Identify emerging trends
- 15-minute daily review

**Layer 3: Weekly Deep Dives**
- Data Science team analyzes metrics
- Investigate anomalies
- Model performance trends
- 1-hour weekly meeting

**Layer 4: Monthly Reporting**
- Comprehensive metrics report to AI Governance Committee
- Comparisons to baselines and targets
- Incident summary
- Recommendation for actions

**Layer 5: Quarterly Audits**
- Full fairness audits (see [FAIRNESS_AUDIT_FRAMEWORK.md](FAIRNESS_AUDIT_FRAMEWORK.md))
- Third-party validation (annual)
- Deep-dive performance analysis

---

## 2. Monitored AI Models

### Production AI Models (as of Q4 2025)

| Model ID | Name | Use Case | Version | Deployed | Monitor Level |
|----------|------|----------|---------|----------|---------------|
| **UC-01** | Claim Outcome Predictor | Predict grievance win/lose | v2.3 | Nov 2025 | High |
| **UC-02** | Timeline Forecaster | Estimate resolution timeline | v1.8 | Nov 2025 | High |
| **UC-03** | Legal Precedent Search | Find relevant case law | v3.1 | Nov 2025 | Medium |
| **UC-04** | NLP Query Engine | Natural language to SQL | v2.0 | Nov 2025 | High |
| **UC-05** | Document Analyzer | Contract/document analysis | v1.5 | Nov 2025 | Medium |
| **UC-06** | Steward Recommender | Suggest steward assignments | v1.2 | Nov 2025 | Medium |

**Monitoring Priority:**
- **High:** High-stakes decisions (predictions affecting case strategy, member outcomes)
- **Medium:** Lower-stakes (research, informational features)
- **Low:** Non-critical (UI suggestions, search optimization)

**Future Models (2026+):**
- UC-07: Churn Risk Predictor (Q1 2026)
- UC-08: Workload Forecaster (Q1 2026)
- UC-09: Grievance Drafter (Q2 2026)
- UC-10: Negotiation Assistant (Q2 2026)
- UC-11: Dues Arrears Predictor (Q2 2026)
- UC-12: CBA Compliance Checker (Q3 2026)

---

## 3. Performance Metrics

### Accuracy Metrics

#### Classification Models (Win/Lose, Churn Risk)

**Primary Metric: Accuracy**
$$\text{Accuracy} = \frac{\text{Correct Predictions}}{\text{Total Predictions}}$$

**Baseline:** Established during model development (test set accuracy)  
**Target:** ≥85% for high-stakes models, ≥80% for medium-stakes  
**Alert Threshold:** <80% (5% drop from baseline)  
**Calculation Frequency:** Daily (rolling 7-day window)

**Secondary Metrics:**

**Precision:** Of predictions we said "positive", how many were correct?
$$\text{Precision} = \frac{\text{True Positives}}{\text{True Positives + False Positives}}$$
- **Target:** ≥80%
- **Alert:** <75%

**Recall:** Of actual positives, how many did we catch?
$$\text{Recall} = \frac{\text{True Positives}}{\text{True Positives + False Negatives}}$$
- **Target:** ≥80%
- **Alert:** <75%

**F1-Score:** Harmonic mean of precision and recall
$$\text{F1} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision + Recall}}$$
- **Target:** ≥0.80
- **Alert:** <0.75

**Example Dashboard Visualization:**
```
Claim Outcome Predictor (UC-01) - Last 7 Days
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Accuracy:    87.2% ✅ (Target: ≥85%)
Precision:   85.1% ✅ (Target: ≥80%)
Recall:      89.3% ✅ (Target: ≥80%)
F1-Score:    0.871 ✅ (Target: ≥0.80)

Predictions: 1,247
Correct:     1,088
Incorrect:   159
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Regression Models (Timeline Forecasting, Settlement Amounts)

**Primary Metric: Mean Absolute Error (MAE)**
$$\text{MAE} = \frac{1}{n}\sum_{i=1}^{n}|\text{Predicted}_i - \text{Actual}_i|$$

**For Timeline Forecaster:**
- **Baseline:** ±10 days MAE (test set)
- **Target:** ±7 days MAE
- **Alert:** >12 days MAE
- **Frequency:** Daily (rolling 7-day window)

**Secondary Metrics:**

**Root Mean Squared Error (RMSE):** Penalizes large errors more
$$\text{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(\text{Predicted}_i - \text{Actual}_i)^2}$$

**R-Squared:** How much variance explained by model?
- **Target:** ≥0.75 (75% of variance explained)
- **Alert:** <0.70

**Percentage Within Acceptable Range:**
- **Definition:** % of predictions within ±7 days (or ±10% for dollar amounts)
- **Target:** ≥80%
- **Alert:** <75%

#### Ranking/Retrieval Models (Precedent Search, Steward Recommender)

**Primary Metric: Mean Reciprocal Rank (MRR)**
$$\text{MRR} = \frac{1}{n}\sum_{i=1}^{n}\frac{1}{\text{rank of first relevant result}_i}$$

**For Precedent Search:**
- **Target:** MRR ≥0.85 (relevant result in top 2 on average)
- **Alert:** MRR <0.75

**Secondary Metrics:**

**Precision@K:** Of top K results, how many are relevant?
- **Target:** Precision@5 ≥0.80 (4 of top 5 results relevant)
- **Alert:** <0.70

**Normalized Discounted Cumulative Gain (NDCG):** Relevance-weighted ranking quality
- **Target:** NDCG@10 ≥0.85
- **Alert:** <0.75

### Confidence Calibration

**Purpose:** Ensure predicted confidence scores match actual probabilities.

**Metric: Expected Calibration Error (ECE)**
- Divide predictions into bins by confidence (0-10%, 10-20%, ..., 90-100%)
- For each bin, compare average predicted confidence to actual accuracy
- ECE = weighted average of differences

**Example:**
- Bin 80-90%: Average predicted confidence = 85%, actual accuracy = 82%
- Difference: |85% - 82%| = 3%
- Repeat for all bins, average weighted by bin size

**Target:** ECE ≤5% (well-calibrated)  
**Alert:** ECE >10% (poorly calibrated)  
**Frequency:** Weekly

**Visualization: Calibration Curve**
```
Claim Outcome Predictor - Calibration Curve
100% ┤                                      •
     │                                   •
  A  │                                •
  c  │                             •
  t  │                          •
  u  │                       •
  a  │                    •
  l  │                 •
     │              •
  A  │           •
  c  │        •
  c  │     •
  u  │  •
  r 0% ┼─────────────────────────────────────
       0%  10% 20% 30% 40% 50% 60% 70% 80% 90% 100%
                  Predicted Confidence

Perfect Calibration: Diagonal line (45°)
Actual: ••• (close to diagonal = well-calibrated)
```

### User Behavior Metrics

**Override Rate:** How often users disagree with AI?
$$\text{Override Rate} = \frac{\text{# of AI Recommendations Overridden}}{\text{Total AI Recommendations}}$$

**Interpretation:**
- Low override (5-10%): Users generally trust AI ✅
- Moderate override (10-20%): Some skepticism, investigate patterns ⚠️
- High override (>20%): Users don't trust AI, significant issue ❌

**Alert Threshold:** >20% override rate

**Acceptance Rate:** For recommender systems (steward assignment)
$$\text{Acceptance Rate} = \frac{\text{# of Recommendations Accepted}}{\text{Total Recommendations}}$$

**Target:** ≥70%  
**Alert:** <60%

**User Feedback Scores:**
- Thumbs up/down on predictions
- **Target:** ≥70% thumbs up
- **Alert:** <60% thumbs up

**NPS (Net Promoter Score):** "How likely are you to recommend AI features to other stewards?"
- Scale: 0-10 (Detractors: 0-6, Passives: 7-8, Promoters: 9-10)
- **NPS = % Promoters - % Detractors**
- **Target:** NPS ≥50
- **Alert:** NPS <30
- **Frequency:** Quarterly survey

---

## 4. Fairness Metrics

### Real-Time Fairness Monitoring

**Purpose:** Detect algorithmic bias quickly (between quarterly audits).

**Primary Metric: Disparate Impact Ratio (Daily)**

$$\text{Disparate Impact Ratio} = \frac{\text{Positive Prediction Rate (Protected Group)}}{\text{Positive Prediction Rate (Reference Group)}}$$

**Calculated For:**
- Gender: Female vs. Male
- Race: Each minority group vs. White
- Age: Each age group vs. 35-44 (middle age)
- Disability: Disabled vs. Not Disabled
- Union Seniority: <1 year vs. 5-10 years

**Target:** Ratio ≥0.85 (better than regulatory 0.80 threshold)  
**Warning:** Ratio 0.75-0.84 (investigate)  
**Alert:** Ratio <0.75 (immediate investigation)  
**Frequency:** Daily calculation, alert if < 0.75

**Dashboard Example:**
```
Fairness Monitoring - Claim Outcome Predictor
Last 7 Days (N=1,247 predictions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Protected Attribute | Ratio  | Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gender (F vs M)     | 0.92   | ✅ PASS
Race (Black vs W)   | 0.87   | ✅ PASS
Race (Hispanic vs W)| 0.83   | ⚠️ WARNING
Race (Asian vs W)   | 1.05   | ✅ PASS
Age (<25 vs 35-44)  | 0.81   | ✅ PASS
Age (55+ vs 35-44)  | 0.88   | ✅ PASS
Disability (Y vs N) | 0.79   | ⚠️ WARNING
Seniority (<1 vs 5-10) | 0.91 | ✅ PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Status: ⚠️ 2 Warnings (Monitor Closely)
```

**Alert Actions:**
- Ratio <0.75: Automated email/Slack to Data Science Lead + CTO
- Ratio <0.70: PagerDuty alert (off-hours)
- Ratio <0.60: Emergency AI Governance Committee meeting

### Weekly Fairness Analysis

**Trend Analysis:**
- Plot disparate impact ratios over time (last 30 days)
- Identify: Is bias increasing, stable, or decreasing?

**Subgroup Analysis:**
- Intersectional fairness (Gender × Race, Age × Disability)
- Identify compounded bias

**Feature Correlation:**
- Monitor correlation between input features and protected attributes
- Alert if correlation increases (proxy features emerging)

---

## 5. Model Drift Detection

### What is Model Drift?

**Model Drift:** Model performance degrades over time because:
1. **Data Drift:** Input data distribution changes (world changes)
2. **Concept Drift:** Relationship between inputs and outputs changes (patterns evolve)

**Example:**
- Training data: 60% grievances win (2020-2023)
- Production data: 40% grievances win (2024+) → employers getting tougher
- Model predicts based on old 60% win rate → overestimates current win probability

### Data Drift Detection

**Metric: Population Stability Index (PSI)**

**How it Works:**
1. Compare current data distribution to training data distribution
2. For each feature, calculate how much distribution shifted
3. PSI score indicates magnitude of shift

$$\text{PSI} = \sum_{i=1}^{n}(\text{Actual}_i - \text{Expected}_i) \times \ln\left(\frac{\text{Actual}_i}{\text{Expected}_i}\right)$$

**Interpretation:**
- PSI < 0.10: No significant shift ✅
- PSI 0.10-0.25: Moderate shift, monitor ⚠️
- PSI > 0.25: Significant shift, retrain model ❌

**Alert Threshold:** PSI > 0.25  
**Frequency:** Weekly calculation

**Example:**
```
Data Drift Analysis - Claim Outcome Predictor
Feature: Average Claim Duration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Training Data (2020-2023):
Mean = 45 days, Std = 12 days

Production Data (Last 30 days):
Mean = 38 days, Std = 15 days

PSI = 0.28 ❌ SIGNIFICANT SHIFT
Recommendation: Retrain model with recent data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Other Drift Metrics:**

**Kolmogorov-Smirnov (KS) Test:**
- Statistical test: Are two distributions different?
- p-value < 0.05 → distributions differ significantly
- Alert if p < 0.01 (strong evidence of drift)

**Chi-Square Test (for categorical features):**
- Test if category frequencies changed
- p-value < 0.05 → significant shift
- Alert if p < 0.01

### Concept Drift Detection

**Metric: Accuracy Trend Analysis**

**How it Works:**
- Plot accuracy over time (daily)
- Identify: Is accuracy declining?
- Statistical test: Is decline significant?

**Example:**
```
Accuracy Trend - Claim Outcome Predictor
Last 90 Days

90% ┤ ••••
    │     •••
  A │        •••
  c │           ••
  c │             •••
  u │                •••
  r │                   ••• ← Declining trend
  a │                      •••
  c │                         ••
  y │                           •••
80% ┼──────────────────────────────────────
    Day 1                            Day 90

Trend: -0.08% per day (statistically significant, p<0.01)
Diagnosis: Concept drift detected
Action: Schedule model retraining
```

**Alert Triggers:**
- Accuracy drops >5% from baseline
- Statistically significant declining trend (p < 0.05)
- Accuracy below target threshold 3 consecutive days

### Drift Response Procedure

**When Drift Detected:**

1. **Investigate (1-2 days):**
   - Which features drifted?
   - Why did distribution change? (external event, data quality issue, natural evolution)
   - Is drift expected or anomalous?

2. **Assess Impact (1 day):**
   - Is accuracy degraded?
   - Are fairness metrics affected?
   - How many users impacted?

3. **Decide Action:**
   - **No Action:** Minor drift, accuracy still good → continue monitoring
   - **Feature Engineering:** Add new features to capture changed patterns
   - **Model Retraining:** Retrain with recent data (last 6-12 months)
   - **Model Redesign:** Fundamental change requires new approach

4. **Retrain Model (1-2 weeks):**
   - Collect recent data
   - Retrain model
   - Validate on holdout test set
   - Compare to previous version
   - Deploy if better (or similar with drift correction)

5. **Monitor Post-Deployment (2-4 weeks):**
   - Enhanced monitoring first 30 days
   - Verify drift issue resolved
   - Check for new issues

---

## 6. System Health Metrics

### API Performance

**Response Time:**
- **Metric:** 95th percentile response time (milliseconds)
- **Target:** <2000 ms (2 seconds)
- **Warning:** >3000 ms
- **Alert:** >5000 ms
- **Frequency:** Real-time (every 5 minutes)

**Throughput:**
- **Metric:** Requests per minute
- **Target:** Handle expected load (500 req/min peak)
- **Alert:** Error rate >1% or response time degradation under load

**Error Rate:**
- **Metric:** % of API calls resulting in error (5xx, 4xx excluding 401/403)
- **Target:** <0.5%
- **Alert:** >1%
- **Frequency:** Real-time

**Dashboard:**
```
AI API Health - Last Hour
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Response Time (P95):  1,847 ms  ✅ (<2000 ms)
Requests/Min (Avg):   387 req   ✅ (<500 peak)
Error Rate:           0.3%      ✅ (<0.5%)
Success Rate:         99.7%     ✅

Status: ✅ HEALTHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### System Uptime

**Metric: Availability (% uptime)**
- **Target:** 99.5% monthly (≈3.6 hours downtime/month allowed)
- **Alert:** <99.0% (>7 hours downtime)
- **Frequency:** Continuous health checks (every 1 minute)

**Health Check Endpoints:**
- `/health` - Basic liveness check (server responding?)
- `/health/db` - Database connectivity
- `/health/ai` - AI models loaded and functional
- `/health/integrations` - External dependencies (Azure OpenAI)

**Incident Tracking:**
- All downtime incidents logged (start time, end time, root cause)
- Monthly uptime report to AI Governance Committee

### Resource Utilization

**CPU Usage:**
- **Target:** <70% average
- **Alert:** >85% sustained (>5 min)

**Memory Usage:**
- **Target:** <80%
- **Alert:** >90%

**Disk Space:**
- **Target:** <70% used
- **Alert:** >85% used

**Azure OpenAI API Quota:**
- **Limit:** 40,000 tokens/minute (production), 10,000 tokens/min (staging)
- **Alert:** >80% quota usage (approaching limit)
- **Action:** Request quota increase or throttle non-critical requests

---

## 7. Alerting Configuration

### Alert Channels

**Slack:**
- Channel: #ai-monitoring
- All alerts posted (P4, P3, P2, P1)
- Categorized by severity (emojis: 🟢 🟡 🟠 🔴)

**Email:**
- P3+: Data Science Lead, CTO
- P1: + AI Governance Committee Chair

**PagerDuty (Critical Alerts Only):**
- P1 only (off-hours, weekends)
- On-call: CTO (primary), Data Science Lead (backup)

**Dashboard:**
- Real-time dashboard accessible 24/7
- URL: [monitoring.unioneyes.internal/ai-dashboard]
- Access: AI team, CTO, AI Governance Committee

### Alert Severity & Escalation

| Metric | Warning (P3) | Alert (P2) | Critical (P1) |
|--------|--------------|------------|---------------|
| **Accuracy** | <82% | <80% | <75% |
| **Disparate Impact** | 0.75-0.84 | <0.75 | <0.60 |
| **Response Time** | >3 sec | >5 sec | >10 sec |
| **Error Rate** | >1% | >2% | >5% |
| **Uptime** | <99.5% | <99.0% | <95.0% |
| **Data Drift (PSI)** | 0.10-0.25 | >0.25 | N/A |

**Escalation Timeline:**
- P3: Review within 24 hours
- P2: Investigate within 4 hours
- P1: Immediate response (<1 hour), page on-call

### Alert Fatigue Prevention

**Problem:** Too many alerts → team ignores them.

**Solutions:**

1. **Tune Thresholds:** Set thresholds to catch real issues, not noise
   - Review monthly: Are alerts actionable?
   - Adjust if >50% alerts are false positives

2. **Alert Grouping:** Combine related alerts
   - Example: If accuracy drops, also expect calibration alerts → group into one

3. **Snooze Non-Critical:** Temporary issues (known maintenance)
   - Snooze alerts during planned downtime

4. **Alert On-Call Schedule:** Rotate on-call duty (not same person 24/7)
   - Prevents burnout

5. **Weekly Alert Review:** Assess alert quality
   - Which alerts led to action vs. ignored?
   - Adjust or disable low-value alerts

---

## 8. Dashboard Specifications

### Real-Time Operational Dashboard

**Purpose:** Monitor system health and performance continuously.

**Audience:** AI/Data Science team, CTO, on-call engineer

**Update Frequency:** Every 5 minutes (real-time)

**Key Widgets:**

**1. Overall System Status**
- Traffic light: 🟢 Healthy | 🟡 Degraded | 🔴 Down
- Current status for each AI model

**2. API Performance**
- Response time chart (last 24 hours)
- Error rate gauge
- Requests/min timeline

**3. Model Accuracy**
- Accuracy for each model (last 7 days)
- Trend arrow (↑ improving, → stable, ↓ declining)

**4. Fairness Snapshot**
- Disparate impact ratios (latest)
- Color-coded: Green (≥0.85), Yellow (0.75-0.84), Red (<0.75)

**5. Active Alerts**
- List of unresolved alerts (severity, time, description)

**6. Recent Incidents**
- Last 5 incidents (ID, type, status, time)

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│  Union Eyes AI Monitoring Dashboard    🟢 ALL SYSTEMS GO    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  SYSTEM STATUS                        API PERFORMANCE        │
│  ━━━━━━━━━━━━━                        ━━━━━━━━━━━━━━━━       │
│  UC-01 Claim Outcome      🟢          Response Time (P95)    │
│  UC-02 Timeline          🟢          2000 ms ┤ ••••         │
│  UC-03 Precedent Search  🟢          1000 ms │   •••••      │
│  UC-04 NLP Query         🟢             0 ms └──────────────  │
│  UC-05 Document Analysis 🟡 (Slow)           0h  6h 12h 18h  │
│  UC-06 Steward Recomm.   🟢                                  │
│                                       Error Rate: 0.3% ✅    │
│  MODEL ACCURACY (7d)                  Requests: 387/min ✅   │
│  ━━━━━━━━━━━━━━━━━━                                          │
│  UC-01: 87.2% ↗ (Target: ≥85%) ✅                           │
│  UC-02: 82.1% → (Target: ≥80%) ✅                           │
│  UC-04: 89.5% ↗ (Target: ≥88%) ✅                           │
│                                                               │
│  FAIRNESS (Disparate Impact Ratios)   ACTIVE ALERTS (2)     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     ━━━━━━━━━━━━━━━━━━━  │
│  Gender (F vs M):     0.92 ✅         🟡 P3: UC-05 Slow      │
│  Race (Black vs W):   0.87 ✅            Response >3 sec     │
│  Race (Hispanic vs W): 0.83 ⚠️        🟡 P3: Fairness       │
│  Disability (Y vs N): 0.79 ⚠️            Hispanic ratio 0.83│
│                                                               │
│  RECENT INCIDENTS                      Last Updated: 2:35 PM │
│  ━━━━━━━━━━━━━━━━━                    Dec 13, 2025          │
│  INC-2026-001 (P2) - Closed                                  │
│  INC-2026-002 (P3) - In Progress                             │
└─────────────────────────────────────────────────────────────┘
```

### Weekly Performance Dashboard

**Purpose:** Analyze trends and identify issues for weekly team review.

**Audience:** Data Science team, CTO

**Update Frequency:** Weekly (Monday morning, covers previous 7 days)

**Key Sections:**

**1. Accuracy Trends**
- Line chart: Accuracy over last 30 days for each model
- Comparison to baseline and target

**2. Fairness Trends**
- Disparate impact ratios over last 30 days
- Identify: Improving, stable, or worsening?

**3. Drift Analysis**
- PSI scores for key features
- Recommendation: Retrain? Monitor? No action?

**4. User Behavior**
- Override rates
- Thumbs up/down feedback
- Most common user complaints

**5. System Performance**
- Uptime %
- Average response time
- Peak load handled

**6. Incidents Summary**
- Number of incidents (by severity)
- Resolution time
- Recurring issues?

### Monthly AI Governance Dashboard

**Purpose:** High-level summary for AI Governance Committee review.

**Audience:** AI Governance Committee, Union Executive Board

**Update Frequency:** Monthly (first week of each month)

**Key Sections:**

**1. Executive Summary**
- Overall AI system health: 🟢 Healthy | 🟡 Needs Attention | 🔴 Critical Issues
- Key achievements (new features, improvements)
- Key concerns (incidents, risks)

**2. Model Performance**
- Accuracy for each model (current vs. target)
- Models meeting SLAs? (Yes/No)

**3. Fairness & Bias**
- Fairness audit summary (if conducted this month)
- Any bias incidents? (details)
- Trend: Improving or worsening?

**4. Incidents**
- Total incidents (P1, P2, P3, P4)
- Average resolution time
- Lessons learned

**5. User Adoption**
- Active users (stewards using AI features)
- Adoption rate (% of stewards)
- User satisfaction (NPS)

**6. Compliance**
- Privacy incidents? (breaches, complaints)
- Regulatory inquiries?
- Policy adherence (audits passed?)

**7. Recommendations**
- Actions needed (e.g., model retraining, policy update)
- Approvals required (new use cases, budget)

---

## 9. Review Cadences

### Daily Review (15 minutes)

**Who:** CTO or Data Science Lead

**When:** 9:00 AM daily

**Review:**
- Check real-time dashboard
- Any active alerts?
- Any new incidents overnight?
- System uptime status

**Actions:**
- Acknowledge/snooze non-critical alerts
- Escalate issues if needed
- Brief team if necessary

### Weekly Team Meeting (1 hour)

**Who:** Data Science team, CTO, ML Engineers

**When:** Monday 10:00 AM

**Agenda:**
1. Review weekly dashboard (15 min)
2. Accuracy trends analysis (10 min)
3. Fairness review (10 min)
4. Drift analysis and retraining decisions (10 min)
5. Incident retrospective (10 min)
6. Action items (5 min)

**Deliverable:** Weekly meeting notes, action items assigned

### Monthly AI Governance Committee Meeting

**Who:** AI Governance Committee (7 members)

**When:** First Wednesday of each month, 2:00 PM

**Agenda:**
1. CTO presents monthly dashboard (20 min)
2. Fairness audit review (if conducted) (15 min)
3. Incident review (10 min)
4. Policy compliance (5 min)
5. New use case approvals (20 min)
6. Member feedback discussion (10 min)
7. Action items and votes (10 min)

**Deliverable:** Meeting minutes, committee decisions

### Quarterly Deep Dive (4 hours)

**Who:** Data Science team, CTO, AI Governance Committee, External Advisor (optional)

**When:** End of each quarter (March, June, Sept, Dec)

**Agenda:**
1. Comprehensive fairness audit presentation (45 min)
2. Model performance deep dive (45 min)
3. User adoption analysis (30 min)
4. Risk register review (30 min)
5. Strategic planning (next quarter priorities) (60 min)
6. Lessons learned (30 min)

**Deliverable:** Quarterly AI report (published internally and publicly)

---

## 10. Monitoring Tools & Infrastructure

### Monitoring Stack

**Application Performance Monitoring (APM):**
- **Tool:** Azure Application Insights or equivalent
- **Metrics:** Response time, error rate, throughput, dependencies
- **Alerts:** Integrated with Slack and PagerDuty

**Custom AI Metrics:**
- **Tool:** Python scripts + PostgreSQL/ClickHouse (time-series DB)
- **Metrics:** Accuracy, fairness, drift, calibration
- **Dashboard:** Grafana or Metabase

**Log Aggregation:**
- **Tool:** Azure Log Analytics or ELK Stack (Elasticsearch, Logstash, Kibana)
- **Logs:** AI prediction logs, application logs, audit logs
- **Retention:** 90 days hot, 1 year warm, 7 years cold (archived)

**Alerting:**
- **Tool:** PagerDuty (critical alerts), Slack (all alerts), Email
- **Configuration:** Alert rules defined in monitoring tool, escalation policies

### Data Pipeline

**Prediction Logging:**
- Every AI prediction logged to database:
  - Timestamp
  - User ID (pseudonymized)
  - Model ID and version
  - Input features (sanitized, no PII)
  - Prediction output
  - Confidence score
  - User action (accepted, overridden, ignored)

**Daily Metrics Calculation:**
- Scheduled job (runs 2:00 AM daily)
- Calculates: Accuracy, precision, recall, F1, fairness ratios, drift metrics
- Stores results in metrics database

**Dashboard Data Refresh:**
- Real-time dashboard: Every 5 minutes
- Weekly dashboard: Every Monday 7:00 AM
- Monthly dashboard: First of month 8:00 AM

---

## 11. Continuous Improvement

### Monthly Monitoring Review

**Purpose:** Optimize monitoring effectiveness.

**Questions:**
1. Did we catch all issues before they caused harm? (effectiveness)
2. Were alerts actionable? (alert quality)
3. Did we get too many false positives? (alert fatigue)
4. Are thresholds still appropriate? (threshold tuning)
5. Do we need new metrics? (coverage gaps)

**Actions:**
- Adjust alert thresholds
- Add/remove metrics
- Improve dashboards

### Quarterly Monitoring Roadmap

**Q1 2026:**
- Implement real-time fairness monitoring (currently daily)
- Automate drift detection alerts
- Expand dashboard to include UC-07, UC-08 (new models)

**Q2 2026:**
- Add model explainability metrics (SHAP value consistency over time)
- Implement A/B testing dashboard (compare model versions)
- Enhanced user feedback analytics (NLP on comments)

**Q3 2026:**
- Predictive monitoring (forecast when retraining needed)
- Anomaly detection (ML for monitoring ML - meta!)
- Multi-tenancy monitoring (per-union metrics)

**Q4 2026:**
- Third-party monitoring validation (audit our monitoring)
- Industry benchmarking (compare to peers)
- Public transparency dashboard (member-facing metrics)

---

## 12. Related Documents

- [AI_PRINCIPLES.md](AI_PRINCIPLES.md) - Validity & Reliability principle (accuracy standards)
- [RESPONSIBLE_AI_POLICY.md](RESPONSIBLE_AI_POLICY.md) - Monitoring requirements for deployed models
- [FAIRNESS_AUDIT_FRAMEWORK.md](FAIRNESS_AUDIT_FRAMEWORK.md) - Quarterly fairness audit procedures
- [AI_INCIDENT_RESPONSE_PLAYBOOK.md](AI_INCIDENT_RESPONSE_PLAYBOOK.md) - Alert escalation and incident response
- [AI_RISK_MANAGEMENT.md](AI_RISK_MANAGEMENT.md) - Model drift and performance risks

---

## 13. Conclusion

Continuous monitoring is essential for responsible AI. By tracking performance, fairness, and system health in real-time, we can detect issues early, maintain high quality, and build trust with members.

**Key Principles:**
- **Proactive:** Catch issues before harm (real-time alerts)
- **Comprehensive:** Monitor accuracy, fairness, drift, and system health
- **Actionable:** Alerts lead to investigation and remediation
- **Transparent:** Dashboards accessible, metrics shared with committee and members

**Monitoring is not a one-time setup — it's an ongoing commitment to excellence.**

---

**Questions or Monitoring Issues?**  
Contact: [ai-monitoring@unioneyes.org](mailto:ai-monitoring@unioneyes.org)

---

**Document Control:**
- **Version:** 1.0 (Draft)
- **Status:** Pending AI Governance Committee Approval (Q1 2026)
- **Next Review:** May 2026 (Quarterly)
- **Owner:** Chief Technology Officer
- **Custodian:** Data Science Lead
