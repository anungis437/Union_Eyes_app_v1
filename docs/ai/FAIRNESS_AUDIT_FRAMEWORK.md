# Union Eyes AI Fairness Audit Framework

**Version:** 1.0 (Draft)  
**Effective Date:** February 1, 2026  
**Last Updated:** December 13, 2025  
**Owner:** AI Governance Committee  
**Review Cycle:** Annual  
**Status:** Pending AI Governance Committee Approval

---

## 1. Framework Overview

### Purpose

This Fairness Audit Framework establishes standardized procedures for detecting, measuring, and mitigating bias in AI systems at Union Eyes. Regular fairness audits ensure AI treats all members equitably regardless of protected characteristics.

### Objectives

1. **Detect Bias:** Identify algorithmic bias before it causes harm
2. **Measure Impact:** Quantify disparities across demographic groups
3. **Remediate Issues:** Implement corrective actions when bias is found
4. **Prevent Future Bias:** Establish monitoring to catch emerging bias
5. **Build Trust:** Demonstrate commitment to fairness through transparency

### Scope

**Applies to:**
- All AI/ML models in production
- AI features in pilot testing (before full deployment)
- Third-party AI services integrated into Union Eyes

**Audit Frequency:**
- **Quarterly:** All production AI models
- **Pre-Deployment:** New AI features (before general availability)
- **Ad-Hoc:** Following bias incidents or member complaints

---

## 2. Protected Attributes

### Demographic Categories Monitored

Per [AI_PRINCIPLES.md](AI_PRINCIPLES.md), we monitor fairness across:

| Protected Attribute | Categories | Data Source |
|---------------------|------------|-------------|
| **Race/Ethnicity** | White, Black/African American, Hispanic/Latino, Asian, Native American, Pacific Islander, Multi-racial, Other | Member profile (optional self-identification) |
| **Gender** | Male, Female, Non-binary, Other | Member profile (optional self-identification) |
| **Age Group** | <25, 25-34, 35-44, 45-54, 55-64, 65+ | Calculated from birth date |
| **Disability Status** | Disabled, Not Disabled | Member profile (optional self-identification) |
| **Union Seniority** | <1 year, 1-3 years, 3-5 years, 5-10 years, 10+ years | Calculated from join date |
| **Union Local** | Local 100, Local 200, Local 300, etc. | Member organization |
| **Employment Status** | Full-time, Part-time, Temporary, Laid-off | Member profile |
| **Language Preference** | English, Spanish, French, Other | Member profile |
| **Geographic Region** | Northeast, Southeast, Midwest, Southwest, West, Canada | Derived from address |
| **Industry/Sector** | Healthcare, Education, Manufacturing, Service, Transportation, Public Sector, Other | Employer classification |

### Intersectional Analysis

**We also analyze intersections:**
- Gender × Race (e.g., Black women vs. White men)
- Age × Disability (e.g., Older workers with disabilities)
- Seniority × Union Local (e.g., New members in small locals)

**Minimum Group Size:** Groups with <30 members excluded from statistical tests (insufficient sample size)

---

## 3. Fairness Metrics

### Fairness Definitions

We use three complementary definitions of fairness:

#### 1. Demographic Parity (Group Fairness)

**Definition:** AI predictions should be distributed similarly across demographic groups.

**Formula:** 
$$\text{Selection Rate Ratio} = \frac{\text{Positive Prediction Rate (Group A)}}{\text{Positive Prediction Rate (Group B)}}$$

**Pass Criteria:** Ratio ≥ 0.80 (4/5ths rule from employment law)

**Example:** 
- AI predicts 60% of male-led grievances will win
- AI predicts 45% of female-led grievances will win
- Ratio: 45/60 = 0.75 ❌ **FAIL** (below 0.80 threshold)

**When to Use:** Classification tasks (win/lose predictions, churn risk, steward assignment acceptance)

#### 2. Equalized Odds (Error Rate Parity)

**Definition:** AI should make errors at similar rates across groups.

**Formulas:**
- **False Positive Rate (FPR):** % of actual negatives incorrectly predicted as positive
- **False Negative Rate (FNR):** % of actual positives incorrectly predicted as negative

**Pass Criteria:** 
- FPR difference ≤ 10 percentage points across groups
- FNR difference ≤ 10 percentage points across groups

**Example:**
- Black members: FPR = 12%, FNR = 8%
- White members: FPR = 10%, FNR = 6%
- FPR difference: 2 percentage points ✅ **PASS**
- FNR difference: 2 percentage points ✅ **PASS**

**When to Use:** High-stakes predictions (claim outcomes, churn risk, settlement recommendations)

#### 3. Calibration (Predictive Parity)

**Definition:** Predicted probabilities should match actual outcomes across groups.

**Formula:** For predictions at confidence level X%, actual outcome rate should be ~X% for all groups.

**Pass Criteria:** ±5 percentage point calibration error per group

**Example:**
- AI predicts 80% win probability for 100 grievances led by women → 75 actually win (75%) ✅ **PASS** (within ±5%)
- AI predicts 80% win probability for 100 grievances led by men → 85 actually win (85%) ✅ **PASS** (within ±5%)

**When to Use:** Probabilistic predictions (confidence scores, risk estimates)

### Statistical Significance Testing

**Chi-Square Test (Categorical Outcomes):**
- Tests whether prediction distribution differs significantly across groups
- p-value < 0.05 indicates statistically significant difference
- Used for: Demographic parity analysis

**Two-Sample T-Test (Continuous Outcomes):**
- Tests whether average predictions differ significantly across groups
- p-value < 0.05 indicates statistically significant difference
- Used for: Timeline predictions, settlement amounts

**Logistic Regression (Multivariate Analysis):**
- Tests whether protected attributes have significant effect on predictions after controlling for legitimate factors
- p-value < 0.05 for protected attribute coefficient indicates potential bias
- Used for: Isolating bias from confounding variables

---

## 4. Audit Procedures

### Phase 1: Planning (Week 1)

#### 1.1 Define Audit Scope

**Audit Lead:** Data Privacy Officer or designated auditor

**Scope Definition:**
- [ ] Identify AI models to audit (all production models quarterly)
- [ ] Determine audit period (typically last 90 days of predictions)
- [ ] Define success criteria (fairness thresholds)
- [ ] Assign audit team (Data Scientist, Legal, Steward Representative)

**Deliverable:** Audit Plan Document

#### 1.2 Data Collection Requirements

**Required Data:**
- All predictions made by AI model in audit period
- Actual outcomes (for accuracy validation)
- Member demographic attributes (protected categories)
- Input features used by model (to identify proxies)

**Data Privacy:**
- Use pseudonymized member IDs (not names)
- Restrict access to audit team only
- Data deleted after audit completion (30 days)

**Data Quality Checks:**
- [ ] Missing demographic data ≤10% (otherwise cannot conduct audit)
- [ ] Outcome data available (can verify predictions)
- [ ] Data completeness (no corrupted records)

**Deliverable:** Audit Dataset (cleaned and validated)

### Phase 2: Data Analysis (Week 2)

#### 2.1 Descriptive Statistics

**Generate summary statistics:**

**Overall Prediction Distribution:**
- Total predictions: N
- Positive predictions: X (Y%)
- Negative predictions: Z (W%)
- Average confidence: C

**Demographic Breakdown:**
- Group sizes (ensure ≥30 members per group)
- Prediction rates by group
- Confidence scores by group

**Sample Report Table:**

| Demographic Group | N | Positive Prediction Rate | Avg Confidence | Actual Positive Rate |
|-------------------|---|--------------------------|----------------|----------------------|
| Male | 500 | 62% | 0.74 | 60% |
| Female | 400 | 48% | 0.71 | 50% |
| Non-binary | 15 | 53% | 0.69 | — (sample too small) |
| White | 600 | 58% | 0.73 | 57% |
| Black | 200 | 52% | 0.72 | 54% |
| Hispanic | 150 | 50% | 0.70 | 48% |
| Asian | 50 | 64% | 0.75 | 62% |

**Deliverable:** Descriptive Statistics Report

#### 2.2 Fairness Metric Calculations

**For Each Protected Attribute:**

**Step 1: Calculate Demographic Parity Ratios**

```python
# Example calculation (pseudocode)
for each demographic_attribute in [race, gender, age, etc.]:
    groups = demographic_attribute.unique_values
    baseline_group = groups.max_prediction_rate()  # Highest rate group
    
    for group in groups:
        ratio = group.positive_rate / baseline_group.positive_rate
        
        if ratio < 0.80:
            FLAG as POTENTIAL BIAS
```

**Step 2: Calculate Error Rate Parity**

```python
for each group:
    FPR = false_positives / (false_positives + true_negatives)
    FNR = false_negatives / (false_negatives + true_positives)
    
    compare FPR and FNR across groups
    
    if max(FPR) - min(FPR) > 0.10:
        FLAG as ERROR RATE DISPARITY
```

**Step 3: Test Calibration**

```python
for each group:
    for confidence_bucket in [0-10%, 10-20%, ..., 90-100%]:
        predicted_rate = avg(predictions in bucket)
        actual_rate = sum(outcomes in bucket) / count(bucket)
        
        calibration_error = abs(predicted_rate - actual_rate)
        
        if calibration_error > 0.05:
            FLAG as CALIBRATION ISSUE
```

**Deliverable:** Fairness Metrics Report (ratios, error rates, calibration for each group)

#### 2.3 Statistical Significance Tests

**Chi-Square Test for Demographic Parity:**

```python
from scipy.stats import chi2_contingency

# Contingency table: [positive_predictions, negative_predictions] x groups
observed = [[group1_positive, group1_negative],
            [group2_positive, group2_negative]]

chi2, p_value, dof, expected = chi2_contingency(observed)

if p_value < 0.05:
    print("Statistically significant disparity detected")
```

**T-Test for Mean Differences:**

```python
from scipy.stats import ttest_ind

group1_predictions = [0.8, 0.7, 0.9, ...]  # Confidence scores
group2_predictions = [0.6, 0.5, 0.7, ...]

t_stat, p_value = ttest_ind(group1_predictions, group2_predictions)

if p_value < 0.05:
    print("Statistically significant difference in predictions")
```

**Logistic Regression for Bias Isolation:**

```python
from sklearn.linear_model import LogisticRegression

# Model: prediction ~ legitimate_factors + protected_attribute
X = [legitimate_factors, protected_attribute_encoded]
y = predictions

model = LogisticRegression().fit(X, y)

protected_attr_coeff = model.coef_[index_of_protected_attr]
p_value = compute_p_value(protected_attr_coeff)

if p_value < 0.05:
    print("Protected attribute has significant effect (potential bias)")
```

**Deliverable:** Statistical Test Results (p-values, effect sizes)

#### 2.4 Intersectional Analysis

**Analyze combinations of protected attributes:**

**Example: Gender × Race**

| Intersection | N | Positive Prediction Rate | Disparity Ratio |
|--------------|---|--------------------------|-----------------|
| White Male | 300 | 65% | 1.00 (baseline) |
| White Female | 280 | 60% | 0.92 ✅ |
| Black Male | 120 | 52% | 0.80 ✅ |
| Black Female | 80 | 42% | 0.65 ❌ **FAIL** |
| Hispanic Male | 90 | 50% | 0.77 ❌ **FAIL** |
| Hispanic Female | 60 | 45% | 0.69 ❌ **FAIL** |

**Findings:** Black women and Hispanic members experience compounded bias

**Deliverable:** Intersectional Analysis Report

### Phase 3: Root Cause Analysis (Week 3)

#### 3.1 Identify Bias Sources

**Potential Causes:**

**1. Training Data Bias:**
- Historical data reflects past discrimination
- Example: Women historically underrepresented in successful grievances → AI learns to predict lower win rates for women

**2. Proxy Discrimination:**
- Model uses features correlated with protected attributes
- Example: "Union local" may be proxy for race if locals are segregated

**3. Measurement Bias:**
- Outcome data systematically biased
- Example: Arbitrators may rule differently based on steward gender → AI learns biased pattern

**4. Aggregation Bias:**
- One model for all groups ignores group-specific patterns
- Example: Timeline predictions based on men's average timelines don't fit women's patterns

**5. Evaluation Bias:**
- Model optimized for majority group, underperforms for minorities
- Example: Training data 80% White → AI optimizes for White members

**Investigation Steps:**

**Step 1: Feature Importance Analysis**
- Which features drive predictions?
- Are any correlated with protected attributes? (proxy test)

```python
# Calculate correlation between features and protected attributes
for feature in model.features:
    correlation = corr(feature, protected_attribute)
    if abs(correlation) > 0.5:
        FLAG as POTENTIAL PROXY
```

**Step 2: Training Data Audit**
- Is historical data balanced across groups?
- Do outcomes differ by group in training data?

**Step 3: Model Inspection**
- Does model have separate decision boundaries for groups?
- Visualize predictions by group (scatter plots, histograms)

**Step 4: Stakeholder Interviews**
- Ask stewards: Do predictions "feel" biased?
- Review member complaints or feedback

**Deliverable:** Root Cause Analysis Report

### Phase 4: Remediation Recommendations (Week 3)

#### 4.1 Bias Mitigation Strategies

**Choose appropriate strategy based on root cause:**

**Strategy 1: Data Rebalancing**
- **When:** Training data imbalanced across groups
- **How:** Oversample minority groups or undersample majority groups
- **Example:** If 80% White, 20% minority in training data → balance to 50/50

**Strategy 2: Feature Engineering**
- **When:** Proxy features identified
- **How:** Remove or transform correlated features
- **Example:** Remove "union local" if proxy for race; replace with "local size" (less correlated)

**Strategy 3: Fairness Constraints**
- **When:** Model optimizes accuracy over fairness
- **How:** Add fairness penalty to loss function during training
- **Example:** Penalize model if demographic parity ratio < 0.85

```python
# Fairness-aware training (simplified)
loss = accuracy_loss + lambda * fairness_penalty

fairness_penalty = max(0, 0.85 - demographic_parity_ratio)
```

**Strategy 4: Post-Processing Calibration**
- **When:** Calibration differs across groups
- **How:** Adjust prediction thresholds per group to equalize outcomes
- **Example:** Threshold 0.5 for majority, 0.45 for minority (increase their positive rate)

**Strategy 5: Separate Models per Group**
- **When:** Groups have fundamentally different patterns
- **How:** Train distinct models for each group
- **Risk:** May violate fairness if models have different accuracy (consult legal)

**Strategy 6: Human Review Override**
- **When:** Bias persists despite technical fixes
- **How:** Flag predictions for disadvantaged groups for human review
- **Example:** All predictions for Black women reviewed by supervisor before use

**Deliverable:** Remediation Plan (strategy, implementation timeline, success criteria)

#### 4.2 Remediation Timeline

**Immediate (0-7 days):**
- Notify AI Governance Committee
- Implement temporary mitigation (e.g., human review override)
- Communicate to affected users (if material impact)

**Short-Term (7-30 days):**
- Implement technical fixes (data rebalancing, feature engineering, fairness constraints)
- Retrain model with bias mitigation
- Validate fixes (re-run fairness audit)
- Deploy updated model

**Long-Term (30-90 days):**
- Monitor for bias recurrence (monthly checks)
- Establish ongoing fairness controls (automated alerts)
- Policy updates if needed (e.g., stricter thresholds)
- Training for team (prevent future bias)

**Deliverable:** Remediation Implementation Plan with Dates

### Phase 5: Reporting (Week 4)

#### 5.1 Audit Report Structure

**Executive Summary (1 page):**
- Audit scope and period
- Key findings (bias detected or not)
- Severity assessment (Critical, High, Medium, Low, None)
- Recommended actions
- Timeline for resolution

**Detailed Findings (10-20 pages):**
1. **Introduction:** Purpose, scope, methodology
2. **Data Overview:** Sample size, demographic distribution, audit period
3. **Fairness Metrics Results:** Tables and charts for each protected attribute
4. **Statistical Tests:** Chi-square, t-tests, regression analysis results
5. **Intersectional Analysis:** Combined protected attributes
6. **Root Cause Analysis:** Why bias exists (if detected)
7. **Recommendations:** Specific mitigation strategies
8. **Conclusion:** Overall fairness assessment

**Appendices:**
- Raw data tables
- Statistical test outputs
- Code used for analysis (reproducibility)
- Glossary of terms

**Deliverable:** Comprehensive Audit Report

#### 5.2 Report Distribution

**Internal:**
- AI Governance Committee (full report)
- CTO and Data Science Lead (full report)
- Union Executive Board (executive summary)
- Audit team (full report)

**External (if required):**
- Third-party auditor (for validation)
- Regulators (if compliance audit)
- Members (anonymized public summary if transparency commitment)

**Timing:**
- Draft report: 3 weeks after audit start
- Final report: 4 weeks after audit start (after committee review)

#### 5.3 Public Transparency

**Per [AI_GOVERNANCE_CHARTER.md](AI_GOVERNANCE_CHARTER.md), we commit to transparency:**

**Quarterly Fairness Summary (Public):**
- Total AI predictions audited
- Number of fairness tests conducted
- Pass/fail rate (% of tests passed)
- Any bias incidents identified
- Remediation actions taken

**What We DON'T Publish:**
- Member-level data (privacy protected)
- Detailed model internals (security risk)
- Ongoing investigations (until resolved)

**Where Published:**
- Union Eyes public website: [unioneyes.org/ai-fairness](https://unioneyes.org/ai-fairness)
- Annual AI Transparency Report (comprehensive)

**Deliverable:** Public Fairness Summary (1-2 pages, member-friendly language)

---

## 5. Remediation Procedures

### Severity Classification

**Critical Bias:**
- Disparate impact ratio <0.60 (severe discrimination)
- Affects >100 members
- High-stakes decisions (settlements, discipline advice)
- **Action:** Immediate model suspension, emergency committee meeting, notify Board within 24 hours

**High Bias:**
- Disparate impact ratio 0.60-0.79
- Affects 50-100 members
- Moderate-stakes decisions (claim predictions, steward assignment)
- **Action:** Enhanced human review override, remediation within 30 days, committee notification within 48 hours

**Medium Bias:**
- Disparate impact ratio 0.80-0.84 (borderline)
- Affects 20-50 members
- Lower-stakes decisions (precedent search, document summaries)
- **Action:** Remediation within 60 days, include in quarterly committee report

**Low Bias:**
- Disparate impact ratio 0.85-0.89 (near-pass)
- Affects <20 members
- Informational features (no decisions)
- **Action:** Remediation within 90 days, monitor for trends

**No Bias Detected:**
- Disparate impact ratio ≥0.90
- All fairness tests passed
- **Action:** Continue quarterly monitoring, no immediate action needed

### Remediation Process

**Step 1: Bias Confirmation (0-7 days)**
- Validate findings (ensure not data error or statistical fluke)
- Determine severity
- Notify stakeholders (committee, affected teams)

**Step 2: Immediate Containment (0-7 days)**
- Critical/High: Suspend model or add human review gate
- Medium: Enhanced monitoring, flag affected predictions
- Low: Document and schedule fix

**Step 3: Root Cause Investigation (7-14 days)**
- Analyze training data for imbalance
- Check for proxy features
- Review model architecture for bias amplification
- Interview stewards (qualitative insights)

**Step 4: Implement Mitigation (14-30 days)**
- Apply chosen bias mitigation strategy (see Phase 4)
- Retrain model with fixes
- Validate on test set (ensure bias reduced)
- A/B test if possible (compare biased vs. unbiased model)

**Step 5: Re-Audit (30-45 days)**
- Re-run fairness audit on updated model
- Confirm bias eliminated (disparity ratio ≥0.80)
- Compare accuracy (ensure mitigation didn't degrade performance excessively)

**Step 6: Deployment (45-60 days)**
- Deploy updated model to production
- Monitor closely first 30 days (weekly fairness checks)
- Communicate resolution to committee and affected users

**Step 7: Post-Remediation Monitoring (Ongoing)**
- Monthly fairness spot-checks first 90 days
- Resume quarterly audit schedule
- Lessons learned documented (prevent recurrence)

### Escalation Path

**Normal Process:**
Data Science Lead → CTO → AI Governance Committee

**Escalation Triggers:**
- Critical bias detected
- Remediation plan not implemented on time
- Bias recurs after remediation
- Legal or regulatory concern

**Escalation Chain:**
1. CTO (immediate)
2. AI Governance Committee (24 hours)
3. Union Executive Board (48 hours for Critical)
4. Legal Counsel (if regulatory/litigation risk)
5. External third-party auditor (if internal remediation insufficient)

---

## 6. Monitoring & Prevention

### Automated Bias Detection

**Real-Time Monitoring:**
- Calculate demographic parity ratio daily (production AI models)
- Alert if ratio drops below 0.75 (early warning)
- Dashboard with fairness metrics (accessible to committee)

**Monthly Spot Checks:**
- Random sample (500 predictions)
- Quick fairness analysis (demographic parity only)
- Identify trends before quarterly audit

**Quarterly Full Audits:**
- Comprehensive audit per procedures above
- All fairness metrics, statistical tests, root cause analysis

### Bias Prevention Best Practices

**During Development:**
- [ ] Diverse training data (balanced across demographics)
- [ ] Remove proxy features (test correlation with protected attributes)
- [ ] Add fairness constraints to model training
- [ ] Pre-deployment fairness audit (before general availability)

**During Operations:**
- [ ] Real-time fairness monitoring
- [ ] User feedback channels ("Report Bias" button)
- [ ] Regular retraining with updated data
- [ ] Diversity in AI team (reduce blind spots)

**Organizational Culture:**
- [ ] Fairness training for all AI developers (mandatory)
- [ ] Fairness champion on each AI project team
- [ ] Fairness requirements in performance reviews
- [ ] Celebrate fairness wins (recognize teams that improve bias metrics)

---

## 7. Third-Party Audits

### Annual Independent Audit

**Per [AI_GOVERNANCE_CHARTER.md](AI_GOVERNANCE_CHARTER.md), we conduct annual third-party audits.**

**Third-Party Auditor Selection:**
- [ ] Independent firm (no conflicts of interest)
- [ ] Expertise in AI fairness and bias detection
- [ ] Experience with labor/union context
- [ ] References from similar organizations

**Audit Scope:**
- Validate internal fairness audits (accurate and complete?)
- Test fairness of all production AI models
- Review audit procedures (industry best practices?)
- Assess organizational fairness culture

**Deliverables:**
- Audit report to AI Governance Committee and Union Board
- Findings: Bias detected, process gaps, recommendations
- Comparison to industry benchmarks (how does Union Eyes compare?)

**Timeline:**
- Annual audit: Q4 each year (October-November)
- Report delivered: December
- Remediation plan: January of following year

**Cost:**
- Estimated $40,000/year
- Budgeted in AI_STRATEGY_ROADMAP.md

---

## 8. Training & Resources

### Auditor Training

**Fairness Audit Certification (16 hours):**
- Module 1: AI fairness concepts (demographic parity, equalized odds, calibration)
- Module 2: Statistical testing (chi-square, t-tests, regression)
- Module 3: Audit procedures (planning, data analysis, reporting)
- Module 4: Bias mitigation strategies
- Module 5: Hands-on audit practice (sample dataset)
- Certification: Pass exam (≥85%)

**Who Needs Training:**
- Data Science team (all members)
- Data Privacy Officer
- AI Governance Committee members (optional but recommended)
- Third-party auditor validation team

### Tools & Resources

**Software:**
- **Python Libraries:** `scikit-learn`, `fairlearn`, `aif360` (IBM), `pandas`, `numpy`, `scipy`
- **Visualization:** `matplotlib`, `seaborn`, `plotly`
- **Statistical Tools:** R (alternative to Python)

**Templates:**
- Audit Plan Template (see Appendix A)
- Audit Report Template (see Appendix B)
- Remediation Plan Template (see Appendix C)

**External Resources:**
- NIST AI Risk Management Framework: [https://www.nist.gov/itl/ai-risk-management-framework](https://www.nist.gov/itl/ai-risk-management-framework)
- Google PAIR: People + AI Guidebook: [https://pair.withgoogle.com/guidebook](https://pair.withgoogle.com/guidebook)
- Microsoft Fairlearn Toolkit: [https://fairlearn.org/](https://fairlearn.org/)
- IBM AI Fairness 360: [https://aif360.mybluemix.net/](https://aif360.mybluemix.net/)

---

## 9. Appendices

### Appendix A: Audit Plan Template

```
AI FAIRNESS AUDIT PLAN

Audit ID: FA-2026-Q1-001
Date: January 15, 2026
Audit Lead: [Name], Data Privacy Officer

SCOPE:
- AI Models: [List models, e.g., Claim Outcome Predictor v2.3, Churn Risk Predictor v1.5]
- Audit Period: October 1 - December 31, 2025
- Protected Attributes: Race, Gender, Age, Disability, Union Seniority

AUDIT TEAM:
- Lead Auditor: [Name]
- Data Scientist: [Name]
- Legal Advisor: [Name]
- Steward Representative: [Name]

TIMELINE:
- Week 1: Data collection and validation
- Week 2: Statistical analysis
- Week 3: Root cause analysis and recommendations
- Week 4: Report finalization and presentation

SUCCESS CRITERIA:
- Disparate impact ratio ≥0.80 for all protected attributes
- FPR/FNR difference ≤10 percentage points
- Calibration error ≤5 percentage points

DATA REQUIREMENTS:
- Predictions: [Database table, date range]
- Outcomes: [Database table, date range]
- Demographics: [Database table, protected attributes]
- Features: [Model input features for proxy analysis]

DELIVERABLES:
- Descriptive statistics report (Week 2)
- Fairness metrics report (Week 2)
- Root cause analysis (Week 3)
- Final audit report (Week 4)
- Public summary (Week 4)

APPROVAL:
Approved by: _______________________ Date: __________
             AI Governance Committee Chair
```

### Appendix B: Audit Report Template

```
AI FAIRNESS AUDIT REPORT

Executive Summary:
- Audit ID and date
- Models audited
- Key findings (pass/fail)
- Severity of any bias detected
- Recommended actions

1. Introduction
   - Purpose and scope
   - Audit methodology
   - Audit team

2. Data Overview
   - Sample size and demographics
   - Audit period
   - Data quality assessment

3. Fairness Metrics Results
   - Demographic parity ratios (table)
   - Error rate parity (FPR/FNR by group)
   - Calibration analysis
   - Statistical significance tests

4. Intersectional Analysis
   - Combined protected attributes (Gender × Race, etc.)
   - Compounded bias identification

5. Root Cause Analysis
   - Potential bias sources (training data, proxies, etc.)
   - Feature importance analysis
   - Stakeholder feedback

6. Recommendations
   - Bias mitigation strategies
   - Implementation timeline
   - Success criteria for remediation

7. Conclusion
   - Overall fairness assessment
   - Next steps

Appendices:
- Raw data tables
- Statistical test outputs
- Code for reproducibility
```

### Appendix C: Remediation Plan Template

```
BIAS REMEDIATION PLAN

Incident ID: BR-2026-001
Date Detected: January 20, 2026
Detected By: Quarterly fairness audit

BIAS DESCRIPTION:
- AI Model: Claim Outcome Predictor v2.3
- Protected Attribute: Gender (Female)
- Metric: Demographic parity ratio
- Value: 0.72 (below 0.80 threshold)
- Severity: High (affects ~200 female stewards)

ROOT CAUSE:
- Training data imbalance: 65% male-led grievances, 35% female-led
- Historical bias: Women underrepresented in historical wins due to past discrimination

MITIGATION STRATEGY:
Strategy: Data rebalancing + fairness constraints
- Oversample female-led grievances to 50% of training data
- Add demographic parity constraint (penalty if ratio <0.85)
- Retrain model with fairness-aware loss function

IMPLEMENTATION TIMELINE:
- Week 1: Data rebalancing (collect additional female grievance data)
- Week 2: Model retraining with fairness constraints
- Week 3: Validation and re-audit
- Week 4: Deployment and monitoring

IMMEDIATE ACTIONS (0-7 days):
- Human review override for all predictions involving female stewards
- Notify AI Governance Committee (completed 1/21/26)
- Communicate to affected stewards (email sent 1/22/26)

SUCCESS CRITERIA:
- Demographic parity ratio ≥0.80 (target: ≥0.85)
- Accuracy maintained ≥85% (no significant degradation)
- FPR/FNR difference ≤10 percentage points

POST-REMEDIATION MONITORING:
- Weekly fairness checks first 4 weeks
- Monthly checks for 90 days
- Resume quarterly audit schedule

RESPONSIBLE PARTIES:
- Lead: [Data Science Lead]
- Support: [ML Engineer, Data Privacy Officer]
- Approval: AI Governance Committee

BUDGET:
- Staff time: 80 hours ($8,000)
- Additional data collection: $2,000
- Testing and validation: $1,000
- Total: $11,000

STATUS: [In Progress / Completed / On Hold]
```

---

## 10. Related Documents

- [AI_PRINCIPLES.md](AI_PRINCIPLES.md) - Fairness & Bias Detection Principle (Section 3)
- [AI_GOVERNANCE_CHARTER.md](AI_GOVERNANCE_CHARTER.md) - Committee fairness oversight responsibilities
- [AI_RISK_MANAGEMENT.md](AI_RISK_MANAGEMENT.md) - Algorithmic Bias Risk (Risk #6)
- [RESPONSIBLE_AI_POLICY.md](RESPONSIBLE_AI_POLICY.md) - Pre-deployment fairness testing requirements
- [AI_INCIDENT_RESPONSE_PLAYBOOK.md](AI_INCIDENT_RESPONSE_PLAYBOOK.md) - Bias incident response procedures

---

## Conclusion

Regular, rigorous fairness audits are essential to ensure AI serves all members equitably. This framework provides a systematic approach to detect, measure, and mitigate bias, building trust through transparency and accountability.

**Key Principles:**
- **Proactive:** Audit before harm occurs (quarterly + pre-deployment)
- **Comprehensive:** Multiple fairness definitions, statistical rigor, intersectional analysis
- **Actionable:** Clear remediation procedures, timeline, success criteria
- **Transparent:** Public reporting, member communication, lessons learned

**Fairness is not a one-time check — it's an ongoing commitment.**

---

**Questions or to Report Bias?**  
Contact: [ai-fairness@unioneyes.org](mailto:ai-fairness@unioneyes.org)

---

**Document Control:**
- **Version:** 1.0 (Draft)
- **Status:** Pending AI Governance Committee Approval (Q1 2026)
- **Next Review:** February 2027 (Annual)
- **Owner:** AI Governance Committee
- **Custodian:** Data Privacy Officer
