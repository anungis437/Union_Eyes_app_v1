# Union Eyes AI Incident Response Playbook

**Version:** 1.0 (Draft)  
**Effective Date:** February 1, 2026  
**Last Updated:** December 13, 2025  
**Owner:** AI Governance Committee  
**Review Cycle:** Semi-Annual  
**Status:** Pending AI Governance Committee Approval

---

## 1. Playbook Overview

### Purpose

This playbook provides step-by-step procedures for responding to AI-related incidents at Union Eyes. Quick, coordinated response minimizes harm and enables learning from incidents.

### Scope

**Applies to all AI-related incidents:**
- Prediction errors causing member harm
- Algorithmic bias or discrimination
- AI hallucinations (false information)
- Privacy breaches via AI systems
- Security incidents (AI system compromised)
- Ethical violations (prohibited AI use)
- System failures (downtime, performance degradation)

### Playbook Objectives

1. **Rapid Detection:** Identify incidents quickly before widespread harm
2. **Effective Containment:** Stop harm immediately
3. **Thorough Investigation:** Understand root cause
4. **Complete Remediation:** Fix issue permanently
5. **Organizational Learning:** Prevent recurrence

---

## 2. Incident Classification

### Incident Types

#### Type 1: Prediction Error

**Definition:** AI makes demonstrably incorrect prediction causing harm or bad decision.

**Examples:**
- Claim outcome prediction: AI predicts 85% win probability, grievance loses badly (actual merits indicated 20% win chance)
- Timeline forecast: AI predicts 30-day resolution, takes 120 days (no unusual circumstances)
- Settlement recommendation: AI suggests $5K, case worth $50K (member accepts lowball)

**Harm:** Member loses grievance, accepts inadequate settlement, or loses confidence in union

#### Type 2: Algorithmic Bias

**Definition:** AI systematically discriminates based on protected characteristics (race, gender, age, disability, etc.).

**Examples:**
- Churn prediction: AI overpredicts churn for women (disparate impact ratio 0.65)
- Steward assignment: AI consistently assigns minority members to less-experienced stewards
- Claim outcome: AI predicts lower win rates for older workers (age bias)

**Harm:** Members receive unequal service, loss of trust, potential legal liability

#### Type 3: Hallucination

**Definition:** AI generates false information presented as fact (fake case law, made-up statistics, non-existent precedents).

**Examples:**
- Legal precedent search: AI cites "Smith v. Acme Corp (2018)" which doesn't exist
- Contract analysis: AI claims "California law requires 30-day notice" (actually 7 days)
- Grievance drafting: AI invents contractual language not in actual CBA

**Harm:** Incorrect legal advice, bad strategy, embarrassment if filed with arbitrator

#### Type 4: Privacy Breach

**Definition:** Unauthorized access to member data via AI system or AI inadvertently leaks private information.

**Examples:**
- Prompt injection: User crafts query to extract PII from training data
- Access control failure: Steward accesses predictions for members outside their local
- Data leakage: AI response includes member SSN or medical information

**Harm:** GDPR/PIPEDA violation, member privacy compromised, regulatory fines

#### Type 5: Security Incident

**Definition:** AI system hacked, compromised, or subject to adversarial attack.

**Examples:**
- Model poisoning: Attacker manipulates training data to degrade AI
- Adversarial attack: Crafted inputs cause AI to make specific wrong predictions
- API breach: Unauthorized access to AI prediction API
- Denial of service: Attack overwhelms AI system (unavailable to users)

**Harm:** System integrity compromised, potential data breach, service disruption

#### Type 6: Ethical Violation

**Definition:** AI used in prohibited way (surveillance, discipline automation, union-busting, etc.).

**Examples:**
- Surveillance: AI used to monitor organizing activities or steward behavior
- Discipline automation: AI recommends disciplinary action for member without human review
- Coercion: AI used to pressure members into accepting unfavorable outcomes

**Harm:** Violation of [AI_ETHICS_POLICY.md](AI_ETHICS_POLICY.md), member harm, trust erosion

#### Type 7: System Failure

**Definition:** AI system down, slow, or degraded (not producing results).

**Examples:**
- Azure OpenAI outage: External provider unavailable (>1 hour)
- Database failure: Cannot retrieve data for predictions
- Performance degradation: Response times >10 seconds (normally <2 seconds)
- Integration failure: AI predictions not displaying in UI

**Harm:** Stewards cannot use AI tools, productivity impact, user frustration

### Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **P1 - Critical** | Major harm, widespread impact, privacy breach, discrimination | **<1 hour** | Data breach affecting 1000+ members, systematic bias (ratio <0.60), critical ethical violation |
| **P2 - High** | Significant harm, moderate impact, isolated bias | **<4 hours** | Prediction error causing member to lose grievance, bias affecting 50-100 members, hallucination used in arbitration |
| **P3 - Medium** | Moderate harm, limited impact, system degradation | **<24 hours** | Performance issues (slow response), isolated prediction error, minor hallucination (caught before use) |
| **P4 - Low** | Minor harm, individual impact, user inconvenience | **<7 days** | UI bug, minor accuracy drift (still above threshold), single user access issue |

**Severity Assessment Matrix:**

| Impact → <br> Likelihood ↓ | **Low** (Few users) | **Medium** (50-100 users) | **High** (100-500 users) | **Very High** (500+ users) |
|----------------------------|---------------------|---------------------------|--------------------------|---------------------------|
| **Very Likely** (>50% chance) | P3 | P2 | P1 | P1 |
| **Likely** (25-50%) | P3 | P2 | P2 | P1 |
| **Possible** (10-25%) | P4 | P3 | P2 | P2 |
| **Unlikely** (<10%) | P4 | P4 | P3 | P3 |

---

## 3. Incident Response Team

### Roles & Responsibilities

#### Incident Commander (IC)

**Who:** CTO (default), Data Science Lead (backup)

**Responsibilities:**
- Overall incident coordination
- Severity assessment
- Stakeholder communication (committee, Board, members)
- Go/no-go decisions (rollback, hotfix deployment)
- Post-incident review leadership

**On-Call:** 24/7 for P1/P2 incidents

#### Technical Lead

**Who:** Data Science Lead (default), Senior ML Engineer (backup)

**Responsibilities:**
- Technical investigation (root cause analysis)
- Remediation implementation (model retraining, code fixes)
- Validation testing (verify fix works)
- Technical documentation

#### Communications Lead

**Who:** Union Communications Director or designated staff

**Responsibilities:**
- Member communication (if affected)
- Internal communication (staff, stewards)
- External communication (media, regulators if required)
- FAQ development

#### Legal Advisor

**Who:** Union Legal Counsel

**Responsibilities:**
- Regulatory obligations (breach notification, GDPR/PIPEDA)
- Liability assessment
- Public statement review
- Documentation for potential litigation

#### Member Advocate

**Who:** Senior Steward or Union Officer

**Responsibilities:**
- Member perspective (how are members affected?)
- Remediation fairness assessment
- Member communication review (clarity, empathy)
- Trust rebuilding recommendations

### Escalation Chain

**P4 (Low):**
→ Technical Lead handles (no escalation unless not resolved in 7 days)

**P3 (Medium):**
→ Technical Lead → Incident Commander (CTO)

**P2 (High):**
→ Incident Commander → AI Governance Committee (within 4 hours)

**P1 (Critical):**
→ Incident Commander → AI Governance Committee (within 1 hour) → Union Executive Board (within 24 hours) → Regulators (if required by law)

---

## 4. Incident Response Phases

### Phase 1: Detection & Triage (0-2 hours)

#### Detection Channels

**Automated Alerts:**
- Model accuracy drops >5% from baseline
- Disparate impact ratio <0.75 (bias detection)
- Error rate >2% (quality threshold)
- Security anomalies (failed logins, unusual queries)
- System downtime (health checks fail)

**User Reports:**
- "Report Incorrect Information" button in UI
- Support ticket submission
- Email to [ai-incidents@unioneyes.org](mailto:ai-incidents@unioneyes.org)
- Escalation from steward or supervisor

**Audit Findings:**
- Fairness audit identifies bias
- Security audit reveals vulnerability
- Compliance audit finds policy violation

#### Initial Response Checklist

**When incident detected:**

1. **Log Incident** (Immediately)
   - [ ] Create incident ticket (ID: INC-2026-001)
   - [ ] Document: Date/time, detection method, initial description
   - [ ] Assign: Technical Lead
   - [ ] Set: Preliminary severity (may change after assessment)

2. **Assess Severity** (0-15 minutes)
   - [ ] How many members affected? (1, 10, 100, 1000+)
   - [ ] What harm occurred? (lost grievance, privacy breach, etc.)
   - [ ] Is harm ongoing? (active attack vs. one-time error)
   - [ ] Protected attributes involved? (bias or general issue)
   - [ ] Regulatory obligations? (breach notification laws)
   - **Decision:** Assign P1/P2/P3/P4 severity

3. **Notify Stakeholders** (0-30 minutes)
   - [ ] P1/P2: Page Incident Commander (SMS/call)
   - [ ] P1: Notify AI Governance Committee Chair
   - [ ] P1: Brief Union Executive Director
   - [ ] All: Post to #ai-incidents Slack channel

4. **Immediate Containment** (0-60 minutes)
   - [ ] **P1 Option 1:** Disable affected AI feature (emergency kill switch)
   - [ ] **P1 Option 2:** Rollback to previous model version
   - [ ] **P2:** Add human review gate (all predictions flagged)
   - [ ] **P3/P4:** Enhanced monitoring (watch for recurrence)
   - **Goal:** Stop harm immediately, even if feature unavailable

**Triage Meeting (P1/P2 only):**
- Convene: Incident Commander, Technical Lead, Legal Advisor
- Duration: 15-30 minutes
- Outcome: Confirmed severity, containment plan, investigation plan, communication plan

**Deliverable:** Incident Triage Report (1 page summary)

### Phase 2: Investigation (2-24 hours)

#### Root Cause Analysis

**Objective:** Understand WHY incident occurred (not just WHAT happened).

**Investigation Steps:**

**Step 1: Reproduce Incident (if possible)**
- [ ] Collect example cases where AI failed
- [ ] Re-run predictions to see if error persists
- [ ] Document: Input data, AI output, expected output

**Step 2: Examine System Logs**
- [ ] AI prediction logs (timestamps, user, input, output, confidence)
- [ ] Application logs (errors, warnings, stack traces)
- [ ] Database logs (queries, data accessed)
- [ ] Security logs (authentication, authorization, anomalies)

**Step 3: Data Analysis**
- [ ] Training data audit (is bias or error in training data?)
- [ ] Model drift analysis (has data distribution changed?)
- [ ] Feature correlation (proxy attributes for protected classes?)
- [ ] Statistical tests (is error systematic or random?)

**Step 4: Model Inspection**
- [ ] Model version (which version was deployed?)
- [ ] Model performance metrics (accuracy on test set vs. production)
- [ ] Feature importance (which features drive predictions?)
- [ ] Decision boundaries (visualize how model makes decisions)

**Step 5: Code Review**
- [ ] Recent code changes (bug introduced in recent deployment?)
- [ ] Integration points (error in API call, data pipeline?)
- [ ] Configuration (incorrect thresholds, API keys, endpoints?)

**Step 6: Stakeholder Interviews**
- [ ] User who reported incident (what did they observe?)
- [ ] Affected members (what harm did they experience?)
- [ ] Stewards (have they noticed similar issues?)
- [ ] Data Science team (any known issues or risks?)

**Root Cause Categories:**

| Category | Examples | Typical Remediation |
|----------|----------|---------------------|
| **Data Quality** | Missing values, outliers, mislabeled training data | Data cleaning, retraining |
| **Model Defect** | Bug in code, overfitting, incorrect algorithm | Code fix, model redesign |
| **Deployment Error** | Wrong model version deployed, configuration error | Rollback, deploy correct version |
| **Concept Drift** | World changed, model assumptions no longer valid | Model retraining with new data |
| **Adversarial Attack** | Malicious user exploited vulnerability | Security patch, input validation |
| **Human Error** | User misinterpreted AI output, used incorrectly | Training, UX improvement |

**Deliverable:** Root Cause Analysis Report

#### Scope Assessment

**Determine full extent of impact:**

- [ ] **How many predictions affected?** Query database for all predictions in affected time period
- [ ] **How many members affected?** Deduplicate member IDs
- [ ] **What decisions made based on bad predictions?** (grievances filed, settlements accepted, etc.)
- [ ] **Can harm be reversed?** (e.g., refile grievance vs. settlement already paid)
- [ ] **Are there ongoing harms?** (member still at risk due to bad prediction)

**Deliverable:** Impact Assessment Report (member count, harm description)

### Phase 3: Remediation (1-7 days)

#### Technical Fix Implementation

**Fix Types:**

**1. Hotfix (P1/P2, <24 hours)**
- **When:** Critical issue, must fix immediately
- **How:** Minimal code change to stop harm (may not be perfect long-term solution)
- **Example:** Add validation to reject prompt injection patterns
- **Process:** Code → Review → Test → Deploy → Validate
- **Approval:** Incident Commander (no committee approval due to urgency)

**2. Code Patch (P3, <7 days)**
- **When:** Bug in application code (not model itself)
- **How:** Fix bug, test thoroughly, deploy via standard pipeline
- **Example:** Fix integration error between AI service and UI
- **Process:** Code → Review → Test → Deploy → Monitor
- **Approval:** CTO approval

**3. Model Retraining (P2/P3, 7-14 days)**
- **When:** Issue in model itself (bias, drift, data quality)
- **How:** Apply bias mitigation, collect better data, retrain model, validate
- **Example:** Rebalance training data to fix gender bias
- **Process:** Data prep → Training → Validation → Fairness audit → Deploy
- **Approval:** AI Governance Committee (for bias fixes)

**4. Feature Redesign (P3/P4, 14-30 days)**
- **When:** Fundamental flaw in AI feature design
- **How:** Redesign approach, develop new model, thorough testing
- **Example:** Replace single model with ensemble to improve accuracy
- **Process:** Design → Develop → Test → Pilot → Deploy
- **Approval:** AI Governance Committee

**Remediation Checklist:**

- [ ] **Develop Fix:** Code, data, or model change
- [ ] **Test Fix:** Unit tests, integration tests, end-to-end tests
- [ ] **Validate Fix:** Verify incident would not recur with fix in place
- [ ] **Performance Check:** Ensure fix doesn't degrade accuracy or performance
- [ ] **Fairness Check:** Verify fix doesn't introduce new bias
- [ ] **Security Check:** No new vulnerabilities introduced
- [ ] **Documentation:** Update code comments, technical docs, user docs
- [ ] **Approval:** Obtain required approvals (IC, CTO, or Committee)
- [ ] **Deployment:** Deploy to production (phased if P1/P2)
- [ ] **Monitoring:** Enhanced monitoring first 48 hours post-deployment

**Rollback Capability:**
- Always have ability to rollback if fix causes new issues
- Test rollback procedure before deployment
- Monitor key metrics first 2 hours after deployment (can quickly rollback if problems)

#### Member Notification (If Required)

**Notification Criteria:**

**Must Notify if:**
- Privacy breach (member data accessed/leaked)
- Prediction error caused material harm (lost grievance, bad settlement)
- Bias incident affected member's outcomes
- Regulatory requirement (GDPR, PIPEDA breach notification)

**May Notify if:**
- Error detected and fixed before member affected
- System outage (explain service interruption)
- Transparency commitment (proactive communication)

**Notification Timeline:**

| Incident Type | Notification Deadline | Notification Method |
|---------------|----------------------|---------------------|
| **Privacy Breach (GDPR)** | 72 hours | Email + letter |
| **Privacy Breach (PIPEDA)** | ASAP (no specific deadline) | Email + letter |
| **Material Harm (P1/P2)** | 7 days | Email + phone call |
| **System Outage** | 24 hours | Email + app notification |
| **Bias Incident** | 14 days (after remediation) | Email |

**Notification Template:**

```
Subject: Important Notice: AI Prediction Issue Resolved

Dear [Member Name],

We are writing to inform you about an issue with our AI prediction system that may have affected you.

WHAT HAPPENED:
Between [Date] and [Date], our AI claim outcome predictor experienced [brief description of issue, e.g., "a technical error that caused it to underestimate win probabilities for certain cases"].

IMPACT ON YOU:
Our records show you received a prediction for [Case Name/Number] during this period. The prediction may have been [lower/higher/inaccurate] than it should have been.

WHAT WE DID:
We detected the issue on [Date], immediately [containment action, e.g., "disabled the feature"], investigated the root cause, and deployed a fix on [Date]. The issue has been resolved.

WHAT YOU SHOULD DO:
- If you made decisions based on this prediction, please contact your steward to reassess your case strategy.
- If you accepted a settlement based on this prediction, we may be able to [options if any, e.g., "renegotiate" or "refile"].
- You can request a new prediction at any time using the Union Eyes app.

YOUR RIGHTS:
You have the right to access all AI predictions made about you, request corrections, or opt out of AI features entirely. Contact us at [email/phone] to exercise these rights.

WE'RE SORRY:
We sincerely apologize for this error. We take the accuracy and fairness of our AI systems extremely seriously. We have implemented additional safeguards to prevent this from happening again.

QUESTIONS?
Contact: [ai-support@unioneyes.org] or call [phone number]

For more information about our AI systems and your rights, visit: [unioneyes.org/ai-transparency]

In solidarity,
[Union Leadership Name]
[Title]
```

**Notification Approval:**
- Communications Lead drafts
- Legal Advisor reviews (compliance, liability)
- Incident Commander approves
- Union Executive Director signs (for P1 incidents)

**Deliverable:** Member Notification (if applicable)

### Phase 4: Review & Learning (7-30 days)

#### Post-Incident Review (PIR)

**Timing:** Within 7 days of incident closure (fix deployed and validated)

**Participants:**
- Incident Commander (facilitator)
- Technical Lead
- Incident Response Team members
- AI Governance Committee representative
- External observer (optional, for P1 incidents)

**Duration:** 90-120 minutes

**PIR Agenda:**

**1. Timeline Review (15 min)**
- Walk through incident from detection to resolution
- Note: When was it detected? Contained? Fixed? Validated?

**2. What Went Well (15 min)**
- What worked in our response?
- Example: "Automated alert caught bias within 2 hours" or "Rollback executed smoothly"

**3. What Went Wrong (30 min)**
- What didn't work?
- What took longer than expected?
- What did we miss?
- Be honest and blameless (focus on systems, not individuals)

**4. Root Cause (15 min)**
- Technical root cause (why did incident occur?)
- Process root cause (why didn't we prevent it?)
- Example: "Bias in training data" (technical) + "No pre-deployment fairness audit" (process)

**5. Action Items (20 min)**
- What will we change to prevent recurrence?
- Assign owners and deadlines
- Example: "Implement mandatory pre-deployment fairness audit (Owner: Data Science Lead, Due: Jan 31)"

**6. Lessons Learned (10 min)**
- What did we learn?
- How will we share learnings with broader team?

**PIR Report Template:**

```
POST-INCIDENT REVIEW REPORT

Incident ID: INC-2026-001
Date: January 20, 2026
Facilitator: [Incident Commander]

INCIDENT SUMMARY:
- Type: Algorithmic Bias
- Severity: P2 (High)
- Detection: Quarterly fairness audit
- Impact: 200 female stewards received lower claim win predictions
- Root Cause: Training data imbalance (65% male-led grievances)

TIMELINE:
- Jan 15, 9:00 AM: Bias detected in fairness audit
- Jan 15, 10:30 AM: Incident logged, IC notified
- Jan 15, 11:00 AM: Human review override activated (containment)
- Jan 15, 2:00 PM: Root cause investigation began
- Jan 18, 5:00 PM: Fix deployed (data rebalancing + fairness constraints)
- Jan 20, 9:00 AM: Validation complete, incident closed

WHAT WENT WELL:
✅ Fairness audit caught bias before widespread harm
✅ Human review override implemented within 1 hour
✅ Root cause identified quickly (training data imbalance)
✅ Fix deployed and validated within 72 hours
✅ Transparent communication to affected stewards

WHAT WENT WRONG:
❌ Bias existed for 2 months before quarterly audit (should have been caught sooner)
❌ No pre-deployment fairness audit when model initially launched
❌ Data imbalance not noticed during training (no diversity metrics tracked)
❌ Member notification took 7 days (could have been faster)

ROOT CAUSE:
- Technical: Training data imbalance (65% male, 35% female grievances)
- Process: No mandatory pre-deployment fairness audit, no real-time fairness monitoring

ACTION ITEMS:
1. Implement real-time fairness monitoring (alerts if disparity ratio <0.75)
   - Owner: Data Science Lead
   - Due: Feb 15, 2026
   - Status: In Progress

2. Mandatory pre-deployment fairness audit for all AI features
   - Owner: CTO
   - Due: Feb 1, 2026 (policy update)
   - Status: Not Started

3. Track training data diversity metrics during model development
   - Owner: ML Engineer
   - Due: Feb 28, 2026
   - Status: Not Started

4. Faster member notification process (template pre-approved, send within 48 hours)
   - Owner: Communications Lead
   - Due: Feb 1, 2026
   - Status: Not Started

LESSONS LEARNED:
- Quarterly audits are not sufficient; need real-time monitoring
- Diversity in training data must be actively managed, not assumed
- Member notification can cause anxiety; include clear remediation steps
- Human review override is effective temporary mitigation

NEXT STEPS:
- Track action items to completion
- Share lessons learned with full team (all-hands meeting)
- Update [AI_INCIDENT_RESPONSE_PLAYBOOK.md] if needed
```

**Deliverable:** Post-Incident Review Report

#### Process Improvements

**Policy Updates:**
- Does incident reveal gap in [AI_ETHICS_POLICY.md](AI_ETHICS_POLICY.md), [RESPONSIBLE_AI_POLICY.md](RESPONSIBLE_AI_POLICY.md), or other policies?
- Propose policy amendments to AI Governance Committee

**Tool Enhancements:**
- Do we need better monitoring, alerting, or dashboards?
- Request features from engineering team

**Training Needs:**
- Does team need additional training (fairness, security, etc.)?
- Schedule workshops or external training

**Documentation:**
- Update [AI_INCIDENT_RESPONSE_PLAYBOOK.md] with new procedures
- Add to incident case library (anonymized examples for training)

### Phase 5: Transparency & Closure (30-60 days)

#### Public Transparency

**Per [AI_GOVERNANCE_CHARTER.md](AI_GOVERNANCE_CHARTER.md), we commit to transparency.**

**Incident Transparency Requirements:**

**P1/P2 Incidents:**
- [ ] Incident summary published within 30 days
- [ ] Includes: What happened, why, how we fixed it, what we learned
- [ ] Anonymized (no member names or case details)
- [ ] Published: Union Eyes website [unioneyes.org/ai-transparency](https://unioneyes.org/ai-transparency)

**P3/P4 Incidents:**
- [ ] Aggregated in quarterly report
- [ ] No individual incident summaries (unless significant learning)

**Annual AI Transparency Report:**
- [ ] All incidents summarized (anonymized)
- [ ] Lessons learned
- [ ] Process improvements implemented
- [ ] Published: December each year

**Public Incident Summary Template:**

```
AI INCIDENT SUMMARY

Incident ID: INC-2026-001 (Public Summary)
Date: January 2026
Type: Algorithmic Bias

WHAT HAPPENED:
During a routine fairness audit, we discovered our claim outcome prediction model was predicting lower win rates for grievances led by female stewards compared to male stewards (disparity ratio: 0.72, below our 0.80 threshold).

WHY IT HAPPENED:
Our training data was imbalanced (65% male-led grievances, 35% female-led), and we did not have real-time fairness monitoring to detect the issue sooner.

IMPACT:
Approximately 200 female stewards may have received less optimistic predictions over a 2-month period. We immediately notified affected members and offered to reassess their cases.

HOW WE FIXED IT:
We rebalanced our training data to 50/50 representation and added fairness constraints to our model training process. The updated model now meets all fairness thresholds (disparity ratio: 0.87).

WHAT WE LEARNED:
Quarterly fairness audits are not sufficient. We now have real-time fairness monitoring that alerts us within 24 hours if bias emerges. We also made pre-deployment fairness audits mandatory for all AI features.

PREVENTION:
We implemented four process improvements (real-time monitoring, mandatory pre-deployment audits, training data diversity tracking, faster member notification). These changes ensure this type of incident is caught much earlier or prevented entirely.

For questions or to report AI concerns: [ai-transparency@unioneyes.org]
```

**Deliverable:** Public Incident Summary (if P1/P2)

#### Incident Closure

**Closure Criteria:**

- [ ] Technical fix deployed and validated (issue resolved)
- [ ] Members notified (if applicable)
- [ ] Post-incident review completed
- [ ] Action items assigned with owners and deadlines
- [ ] Public summary published (if P1/P2)
- [ ] Documentation complete (incident report, PIR, public summary)
- [ ] Lessons learned shared with team

**Closure Approval:**
- Incident Commander declares incident closed
- AI Governance Committee acknowledges closure (P1/P2 only)

**Incident Archive:**
- All incident documentation stored in secure repository
- Accessible to: AI Governance Committee, CTO, Legal, Auditors
- Retention: 7 years (legal requirement for labor disputes)

---

## 5. Incident-Specific Procedures

### Prediction Error Incident

**Detection:**
- User reports incorrect prediction ("Report Incorrect Information" button)
- Accuracy monitoring alert (accuracy drops >5%)
- Member complaint (bad outcome attributed to AI prediction)

**Immediate Actions:**
1. Validate error: Re-run prediction, compare to ground truth
2. Check scope: Is this isolated or systematic?
3. Containment: If systematic, disable feature or add human review gate

**Investigation:**
- Root cause: Data quality? Model drift? Code bug?
- Historical analysis: Have similar errors occurred?
- Impact: How many members affected?

**Remediation:**
- Fix and redeploy (hours to days depending on severity)
- Notify affected members if harm occurred
- Offer remedy (e.g., refile grievance, reassess case)

### Bias Incident

**Detection:**
- Fairness audit identifies disparate impact ratio <0.80
- User reports bias perception ("This seems unfair")
- Statistical anomaly (one group has much worse outcomes)

**Immediate Actions:**
1. Confirm bias: Run statistical tests (chi-square, t-test)
2. Assess severity: Critical (<0.60), High (0.60-0.79), Medium (0.80-0.84)
3. Containment: P1: Disable feature, P2: Human review gate

**Investigation:**
- Root cause: Training data imbalance? Proxy features? Historical bias?
- Intersectional analysis: Multiple protected attributes?
- Legal consultation: Potential discrimination liability?

**Remediation:**
- Apply bias mitigation (data rebalancing, fairness constraints, etc.)
- Retrain model and validate (re-run fairness audit)
- Deploy and monitor closely
- Transparent communication (why it happened, how we fixed it)

**Special Considerations:**
- Legal sensitivity (potential discrimination lawsuit)
- Member trust impact (transparency critical)
- Regulatory notification (if EEOC, OFCCP, or Canadian HRC inquiry)

### Hallucination Incident

**Detection:**
- User reports false information ("This case law doesn't exist")
- Fact-checking pipeline flags inconsistency
- Attorney or legal expert catches error

**Immediate Actions:**
1. Validate: Is information actually false?
2. Containment: Retract information, correct any filed documents
3. Notify users: "Do not rely on this information"

**Investigation:**
- Root cause: LLM hallucination (common in generative AI)
- Scope: What other hallucinations may have occurred?
- Impact: Were decisions made based on false info?

**Remediation:**
- Implement hallucination detection (citations required, fact-checking)
- Add confidence thresholds (low confidence = flag for human review)
- User training (how to verify AI-provided info)
- Consider human-in-the-loop for all legal research (AI suggests, human verifies)

**Special Considerations:**
- Legal malpractice risk (if false legal advice provided)
- Embarrassment risk (if filed with arbitrator or court)
- Trust impact (members may lose confidence in all AI features)

### Privacy Breach Incident

**Detection:**
- Security alert (unauthorized access attempt)
- User reports PII in AI response (shouldn't be there)
- Audit discovers access control violation

**Immediate Actions:**
1. Contain breach: Disable feature, revoke access, isolate compromised system
2. Assess scope: What data was accessed? By whom? When?
3. Legal notification: Inform Legal Counsel immediately (regulatory obligations)

**Investigation:**
- Root cause: Security vulnerability? Prompt injection? Access control failure?
- Affected members: Who's data was compromised?
- Regulatory requirements: GDPR (72 hours), PIPEDA (ASAP), state laws

**Remediation:**
- Fix security vulnerability (patch, access controls, input validation)
- Member notification (required by law)
- Credit monitoring if SSNs or financial data compromised
- Regulatory notification (if required)

**Special Considerations:**
- **URGENT:** Regulatory deadlines (GDPR: 72 hours to notify)
- Legal liability (fines, lawsuits)
- Reputation damage (media attention likely)
- Member trust (serious erosion)

**Regulatory Notification Template:**

```
GDPR Data Breach Notification (to Data Protection Authority)

Union Eyes (Data Controller)
[Address]
DPO: [Name, Email, Phone]

Date of Breach: [Date]
Date of Discovery: [Date]
Date of Notification: [Date] (within 72 hours of discovery)

NATURE OF BREACH:
[Describe what happened: unauthorized access, prompt injection, etc.]

DATA COMPROMISED:
- Categories: [Name, email, case information, etc.]
- Number of Affected Individuals: [X members]
- Special Categories: [Health data, union membership, etc.]

CONSEQUENCES:
[Potential harm to members: identity theft, discrimination, etc.]

MEASURES TAKEN:
[Containment, remediation, member notification, ongoing monitoring]

CONTACT:
Data Privacy Officer: [Name, Email, Phone]
```

### Security Incident

**Detection:**
- Intrusion detection system alert
- Anomalous API traffic (DDoS, scraping)
- Failed login attempts (brute force attack)
- Vulnerability scan finding

**Immediate Actions:**
1. Contain attack: Block IP, disable service, isolate system
2. Assess: Active attack or past breach?
3. Notify: CISO, CTO, Legal (if data compromised)

**Investigation:**
- Attacker: Who? Why? How did they gain access?
- Scope: What systems compromised? Data accessed?
- Vulnerability: What weakness did they exploit?

**Remediation:**
- Patch vulnerability
- Implement security controls (MFA, rate limiting, WAF)
- Penetration testing (ensure no other vulnerabilities)
- Monitor for recurrence

**Special Considerations:**
- May overlap with privacy breach (if data accessed)
- Law enforcement (FBI, local police if criminal activity)
- Insurance (cyber insurance claim)

### Ethical Violation Incident

**Detection:**
- Whistleblower report
- Audit discovers prohibited use
- Member complaint

**Immediate Actions:**
1. Stop prohibited activity immediately
2. Preserve evidence (logs, communications)
3. Notify AI Governance Committee and Legal

**Investigation:**
- Who authorized? (intentional or mistake?)
- Scope: How long? How many members affected?
- Harm: What damage caused?

**Remediation:**
- Disciplinary action (if intentional violation)
- Policy reinforcement (training, audits)
- Member communication (apologize, explain corrective actions)

**Special Considerations:**
- Whistleblower protection (no retaliation)
- Union values (ethical violations undermine trust)
- Potential litigation (if member harmed)

### System Failure Incident

**Detection:**
- Health check fails (AI service down)
- User reports ("AI not working")
- Performance monitoring alert (response time >10 seconds)

**Immediate Actions:**
1. Triage: Severity? (Complete outage vs. degraded performance)
2. Containment: Failover to backup? Scale up resources?
3. Communication: Notify users (expected restoration time)

**Investigation:**
- Root cause: Azure outage? Database issue? Code bug? Traffic spike?
- Scope: Which features affected? All users or subset?

**Remediation:**
- Fix and restore service
- Post-mortem (why did it fail? How to prevent?)
- Infrastructure improvements (redundancy, scaling)

**Special Considerations:**
- Lower urgency than other incident types (inconvenience vs. harm)
- Communicate transparently (users appreciate honesty)
- Opportunity to test disaster recovery procedures

---

## 6. Communication Templates

### Internal Alert (Slack/Email)

```
🚨 AI INCIDENT ALERT - P1 CRITICAL 🚨

Incident ID: INC-2026-001
Type: Algorithmic Bias
Severity: P1 (Critical)
Detected: Jan 15, 2026 09:00 AM

SUMMARY:
Claim outcome predictor showing systematic bias against female stewards (disparity ratio: 0.65).

IMPACT:
~200 female stewards affected over past 2 months.

CONTAINMENT:
Feature DISABLED as of 09:30 AM. All predictions now require human review.

NEXT STEPS:
- Incident Commander: CTO (paged)
- Triage meeting: 10:00 AM (conference room A)
- Investigation: Data Science Lead
- Updates: Every 2 hours via #ai-incidents

DO NOT communicate externally until approved by IC.
```

### User Notification (System Outage)

```
Subject: AI Features Temporarily Unavailable

Dear Stewards,

Our AI prediction features are temporarily unavailable due to a technical issue. We are working to restore service as quickly as possible.

WHAT'S AFFECTED:
- Claim outcome predictions
- Timeline forecasts
- Natural language queries

EXPECTED RESTORATION:
We expect to restore service within 2-4 hours (by 2:00 PM today).

WORKAROUND:
You can still access all other Union Eyes features. For urgent prediction needs, contact your supervisor for manual analysis.

UPDATES:
Check [unioneyes.org/status] for real-time updates.

We apologize for the inconvenience.

Union Eyes Support Team
[ai-support@unioneyes.org]
```

### Member Notification (Harm)

(See template in Phase 3: Member Notification section)

### Public Statement (Media)

```
FOR IMMEDIATE RELEASE

Union Eyes Addresses AI Prediction Issue

[City, Date] – Union Eyes, the leading grievance management platform for labor unions, today announced it has resolved a technical issue affecting its AI claim outcome prediction feature.

WHAT HAPPENED:
Between [Date] and [Date], our AI prediction system experienced a technical error that caused it to underestimate win probabilities for certain grievances. The issue was detected during a routine audit and has been fully resolved.

IMPACT:
Approximately [X] members may have received less optimistic predictions during this period. All affected members have been notified and offered support to reassess their cases.

RESPONSE:
Upon discovery, we immediately disabled the affected feature, investigated the root cause, and deployed a fix. We have implemented additional safeguards to prevent recurrence.

COMMITMENT:
At Union Eyes, we are committed to fairness, transparency, and accountability in all our AI systems. We conduct regular audits and maintain the highest standards for AI accuracy and ethics.

For more information: [unioneyes.org/ai-transparency]

Contact: [Communications Director Name, Email, Phone]
```

---

## 7. Tools & Resources

### Incident Management Tools

**Incident Tracking:**
- Jira or equivalent (incident tickets, workflow, assignments)
- Slack channel: #ai-incidents (real-time coordination)

**On-Call:**
- PagerDuty or equivalent (IC and Technical Lead paging)
- 24/7 coverage for P1/P2 incidents

**Communication:**
- Email templates (see section 6)
- Member notification tool (bulk email + tracking)

**Monitoring:**
- AI monitoring dashboard (accuracy, fairness, performance)
- Security monitoring (SIEM, intrusion detection)

### External Resources

**Regulatory Guidance:**
- GDPR Breach Notification: [https://gdpr-info.eu/art-33-gdpr/](https://gdpr-info.eu/art-33-gdpr/)
- PIPEDA Breach Reporting: [https://www.priv.gc.ca/en/privacy-topics/business-privacy/safeguards-and-breaches/privacy-breaches/respond-to-a-privacy-breach-at-your-business/gd_pb_201810/](https://www.priv.gc.ca/en/privacy-topics/business-privacy/safeguards-and-breaches/privacy-breaches/respond-to-a-privacy-breach-at-your-business/gd_pb_201810/)

**Incident Response Frameworks:**
- NIST Incident Response Guide: [https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf)
- SANS Incident Handler's Handbook: [https://www.sans.org/white-papers/33901/](https://www.sans.org/white-papers/33901/)

**AI-Specific:**
- AI Incident Database: [https://incidentdatabase.ai/](https://incidentdatabase.ai/)
- Partnership on AI Incident Response: [https://partnershiponai.org/](https://partnershiponai.org/)

---

## 8. Training Requirements

**Incident Response Training (8 hours, annual):**
- Who: Incident Response Team, AI/Data Science team, AI Governance Committee
- Topics: Incident classification, response phases, communication, PIR facilitation
- Format: Workshop with tabletop exercises (simulate incidents)

**Tabletop Exercise Scenarios:**
1. Bias incident (claim outcome predictor favors one demographic)
2. Privacy breach (prompt injection extracts PII)
3. Hallucination (AI cites non-existent case law used in arbitration)
4. System outage (Azure OpenAI unavailable for 4 hours)

**User Training (included in 4-hour "Understanding AI" workshop):**
- How to report AI issues ("Report Incorrect Information" button)
- When to escalate (immediate harm vs. minor inconvenience)
- What to expect (timeline, communication, remediation)

---

## 9. Related Documents

- [AI_ETHICS_POLICY.md](AI_ETHICS_POLICY.md) - Prohibited AI uses (ethical violations)
- [AI_PRINCIPLES.md](AI_PRINCIPLES.md) - Fairness standards, safety requirements
- [AI_GOVERNANCE_CHARTER.md](AI_GOVERNANCE_CHARTER.md) - Committee incident investigation authority
- [AI_RISK_MANAGEMENT.md](AI_RISK_MANAGEMENT.md) - Risk identification and mitigation
- [RESPONSIBLE_AI_POLICY.md](RESPONSIBLE_AI_POLICY.md) - Deployment standards, testing requirements
- [FAIRNESS_AUDIT_FRAMEWORK.md](FAIRNESS_AUDIT_FRAMEWORK.md) - Bias detection procedures
- [AI_MONITORING_PROCEDURES.md](AI_MONITORING_PROCEDURES.md) - Real-time monitoring and alerting

---

## 10. Conclusion

Effective incident response requires preparation, coordination, and continuous learning. This playbook provides structured procedures to minimize harm, restore service quickly, and prevent recurrence.

**Key Principles:**
- **Speed:** Rapid detection and containment (stop harm immediately)
- **Transparency:** Honest communication with members, committee, and public
- **Learning:** Every incident is an opportunity to improve
- **Accountability:** Clear roles, responsibilities, and escalation paths

**Be Prepared:** Review this playbook regularly, conduct tabletop exercises, and update procedures based on lessons learned.

---

**Report an AI Incident:**  
Email: [ai-incidents@unioneyes.org](mailto:ai-incidents@unioneyes.org)  
Slack: #ai-incidents  
Phone: 1-800-XXX-XXXX (24/7 for P1/P2)

---

**Document Control:**
- **Version:** 1.0 (Draft)
- **Status:** Pending AI Governance Committee Approval (Q1 2026)
- **Next Review:** August 2026 (6 months)
- **Owner:** AI Governance Committee
- **Custodian:** Chief Technology Officer
