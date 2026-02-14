# Union Eyes: Growth Engine Architecture

## Overview

This document outlines the comprehensive marketing and growth engine architecture for Union Eyes - a human-centered, union-first platform that positions the product as movement infrastructure, not just software.

## Core Philosophy

- **Human dignity first**: Technology serves people, never replaces labor
- **Organizer-centric**: Organizers are the primary actors
- **Transparency as selling point**: Governance, immutability, and RLS are trust infrastructure
- **Anti-extractive**: No surveillance, no dark patterns, no data monetization
- **Democratic by design**: FSM enforcement = fairness protection

---

## Architecture Map

```
Union Eyes Growth Engine
├── 1. Narrative Layer (Story/Impact)
│   ├── /app/story
│   ├── /app/impact
│   └── /app/why-union-eyes
│
├── 2. Trust Infrastructure (Institutional Confidence)
│   ├── /app/trust
│   └── /app/ethics
│
├── 3. Social Proof System
│   ├── /app/case-studies
│   ├── /app/pilots
│   └── /app/testimonials
│
├── 4. Member Experience (Wow Engine)
│   ├── lib/member-experience/
│   ├── Human explainers
│   └── Timeline visualizations
│
├── 5. Pilot Conversion Funnel
│   ├── /app/pilot-request
│   ├── /app/pilot-dashboard
│   └── /app/pilot-toolkit
│
├── 6. Organizer Empowerment
│   ├── Recognition system
│   ├── Impact summaries
│   └── Democratic participation metrics
│
└── 7. Movement Amplification
    ├── /app/movement-insights
    └── Cross-union trend analytics
```

---

## Route Structure

### Public/Marketing Routes

| Route | Purpose | Audience |
|-------|---------|----------|
| `/story` | Origin story, organizer testimonials | All visitors |
| `/impact` | Real case outcomes, metrics dashboard | Union leadership |
| `/why-union-eyes` | Philosophy, mission, values | Skeptical organizers |
| `/trust` | Technical transparency dashboard | CIOs, risk officers |
| `/ethics` | Data governance, privacy guarantees | Members, leadership |
| `/case-studies` | CLC/CAPE pilot stories | Decision makers |
| `/pilots` | Pilot program overview | New unions |
| `/pilot-request` | Intake form for pilot program | Union executives |
| `/testimonials` | Organizer and member quotes | All stakeholders |

### Authenticated Routes

| Route | Purpose | Audience |
|-------|---------|----------|
| `/dashboard/member/timeline` | Grievance journey visualization | Members |
| `/dashboard/organizer/impact` | Organizer impact summary | Stewards, organizers |
| `/dashboard/organizer/recognition` | Recognition and case wins | Stewards |
| `/dashboard/pilot` | Pilot health and metrics | Pilot participants |
| `/dashboard/movement-insights` | Cross-union trends (opt-in) | CLC, leadership |
| `/dashboard/trust/audit-log` | Personal audit log access | All authenticated users |

---

## Data Models

### Marketing Schema

```typescript
// Impact Metrics
interface ImpactMetric {
  id: string;
  organizationId: string;
  metricType: 'time-to-resolution' | 'escalation-rate' | 'member-satisfaction' | 'organizer-workload';
  value: number;
  comparisonValue?: number; // Before Union Eyes
  period: string; // ISO date range
  visibility: 'public' | 'pilot-only' | 'internal';
  anonymized: boolean;
  createdAt: Date;
}

// Case Studies
interface CaseStudy {
  id: string;
  title: string;
  organizationId?: string; // Optional for anonymized
  organizationType: 'clc' | 'local' | 'federation';
  category: 'pilot' | 'success-story' | 'before-after';
  summary: string;
  challenge: string;
  solution: string;
  outcome: string;
  metrics: {
    label: string;
    before: number;
    after: number;
    unit: string;
  }[];
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
  visibility: 'public' | 'authenticated';
  publishedAt: Date;
}

// Pilot Program
interface PilotApplication {
  id: string;
  organizationName: string;
  organizationType: 'local' | 'regional' | 'national';
  contactName: string;
  contactEmail: string;
  memberCount: number;
  jurisdictions: string[];
  readinessScore?: number;
  status: 'submitted' | 'review' | 'approved' | 'active' | 'completed';
  submittedAt: Date;
  responses: Record<string, any>;
}

interface PilotMetrics {
  pilotId: string;
  organizationId: string;
  enrollmentDate: Date;
  daysActive: number;
  organizerAdoption: number; // percentage
  memberEngagement: number; // percentage
  casesManaged: number;
  avgTimeToResolution: number; // hours
  healthScore: number; // 0-100
  milestones: {
    name: string;
    completedAt?: Date;
    status: 'pending' | 'complete';
  }[];
}

// Organizer Recognition
interface OrganizerImpact {
  userId: string;
  organizationId: string;
  casesHandled: number;
  avgResolutionTime: number;
  memberSatisfaction: number;
  escalationsAvoided: number;
  democraticParticipation: number;
  recognitionEvents: {
    type: 'case-win' | 'member-feedback' | 'peer-recognition';
    description: string;
    date: Date;
  }[];
}

// Movement Insights (Aggregated, Anonymized)
interface MovementTrend {
  id: string;
  category: 'grievance-type' | 'resolution-pattern' | 'systemic-issue';
  dimension: string; // e.g., 'harassment', 'scheduling', 'safety'
  aggregatedCount: number;
  organizationsContributing: number; // count, not list
  timeframe: string;
  insights: string;
  legislativeBriefRelevance: boolean;
}
```

---

## Component Architecture

### Reusable UI Primitives

```tsx
// Human-Centered Callout
<HumanCenteredCallout
  icon={<Heart />}
  title="Built with organizers, not for organizers"
  description="Every feature co-designed with union stewards"
  variant="solidarity" | "trust" | "transparency"
/>

// Impact Metric Card
<ImpactMetricCard
  label="Average time to resolution"
  before={45}
  after={18}
  unit="days"
  improvement="-60%"
  context="CLC Pilot (6 months)"
/>

// System Status Badge
<SystemStatusBadge
  system="RLS Enforcement"
  status="active"
  auditUrl="/trust#rls"
/>

// Timeline Visualization
<GrievanceTimeline
  stages={claimFSM}
  currentStage="investigation"
  humanExplainer={getHumanExplainer}
/>

// Pilot Health Dashboard
<PilotHealthMetric
  score={87}
  metrics={pilotMetrics}
  milestones={milestones}
/>

// Organizer Impact Summary
<OrganizerImpactCard
  casesHandled={42}
  avgResolution={22}
  memberSatisfaction={4.6}
  recognitions={recognitionEvents}
/>

// Movement Insight Card
<MovementInsightCard
  category="Systemic Pattern Detected"
  description="Scheduling grievances up 35% in retail sector"
  organizationsAffected={8}
  actionable={true}
/>
```

### Design System Extension

```css
/* Union-First Color Palette */
:root {
  --union-blue: 210 50% 35%;
  --union-blue-light: 210 50% 45%;
  --solidarity-red: 0 65% 45%;
  --solidarity-red-light: 0 65% 55%;
  --trust-green: 145 40% 40%;
  --trust-green-light: 145 40% 50%;
  --institutional-gray: 220 10% 30%;
  --warm-neutral: 30 10% 50%;
}

.human-centered-card {
  @apply border-l-4 border-union-blue bg-white p-6 shadow-sm;
}

.solidarity-callout {
  @apply bg-solidarity-red/5 border-solidarity-red/20 border rounded-lg p-4;
}

.trust-badge {
  @apply inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trust-green/10 text-trust-green border border-trust-green/20;
}

.institutional-section {
  @apply bg-slate-50 border-slate-200 rounded-lg p-8;
}
```

---

## FSM Integration

### Human Explainer System

The Member Wow Engine translates FSM states into compassionate, human language:

```typescript
// lib/member-experience/human-explainers.ts
export function getHumanExplainer(
  status: ClaimStatus,
  priority: ClaimPriority,
  daysInState: number
): HumanExplanation {
  const explainers: Record<ClaimStatus, HumanExplanation> = {
    submitted: {
      title: "Your grievance has been received",
      explanation: "Your case is now in our system. A steward will review it within 48 hours.",
      nextSteps: ["A steward will be assigned to your case", "You'll receive an email when review begins"],
      expectedTimeline: "Review typically starts within 1-2 business days",
      empathyMessage: "We take your concerns seriously and will keep you informed every step of the way.",
    },
    under_review: {
      title: "Your case is being carefully reviewed",
      explanation: "A dedicated steward is examining the details of your situation and gathering relevant information.",
      nextSteps: ["Steward may reach out for additional details", "Case will move to investigation if evidence supports your claim"],
      expectedTimeline: "Review process takes 3-7 business days",
      empathyMessage: "We understand this is a difficult time. Your steward is your advocate throughout this process.",
    },
    investigation: {
      title: "Active investigation in progress",
      explanation: "Your steward is conducting a thorough investigation, which may include interviewing witnesses and reviewing documents.",
      nextSteps: ["Investigation findings will be documented", "You'll be notified of the outcome"],
      expectedTimeline: "Investigations typically conclude within 2-3 weeks",
      empathyMessage: "This step ensures we have all the facts to support your case.",
    },
    // ... additional states
  };

  return {
    ...explainers[status],
    daysInThisStage: daysInState,
    priorityContext: getPriorityContext(priority),
  };
}
```

---

## Governance Integration

### Trust Dashboard Data Sources

The Trust Dashboard displays real-time verification of institutional safeguards:

```typescript
// lib/trust/system-metrics.ts
export async function getTrustMetrics(): Promise<TrustMetrics> {
  return {
    immutability: {
      status: 'enforced',
      verification: await verifyImmutabilityTriggers(),
      lastAudit: new Date(),
      description: 'Database triggers prevent modification of historical records (Migration 0064)',
    },
    rlsEnforcement: {
      status: 'active',
      verification: await verifyRLSPolicies(),
      tenantIsolation: '100%',
      description: 'Row-Level Security ensures complete tenant data isolation',
    },
    fsmValidation: {
      status: 'active',
      verification: await verifyFSMEnforcement(),
      invalidTransitionsBlocked: await getBlockedTransitionCount(),
      description: 'Finite State Machine prevents invalid workflow transitions',
    },
    governance: {
      goldenShareStatus: await getGoldenShareStatus(),
      reservedMattersProtection: 'active',
      councilElectionDate: await getLastElectionDate(),
      description: 'Democratic oversight with Class B voting rights',
    },
    auditLog: {
      status: 'active',
      eventsLogged: await getAuditLogCount(),
      retentionPolicy: '7 years',
      description: 'Comprehensive audit trail of all system actions',
    },
  };
}
```

---

## Pilot Conversion Funnel

### Onboarding Journey

```
1. Pilot Request Form → /app/pilot-request
   - Organization details
   - Readiness self-assessment
   - Risk disclosure acknowledgment

2. Review & Approval
   - Automated readiness scoring
   - Manual review for edge cases
   - Risk/compliance check

3. Pilot Activation → /app/pilot-dashboard
   - Sandbox environment provisioned
   - Initial organizer training
   - Milestone roadmap generated

4. Active Pilot
   - Weekly health checks
   - Organizer adoption tracking
   - Member engagement monitoring

5. Success Evaluation
   - Impact metrics comparison
   - Organizer feedback collection
   - Full platform migration decision
```

### Pilot Health Score Algorithm

```typescript
function calculatePilotHealth(metrics: PilotMetrics): number {
  const weights = {
    organizerAdoption: 0.30,  // 30% - critical
    memberEngagement: 0.25,   // 25% - key indicator
    casesManaged: 0.15,       // 15% - usage
    avgResolutionTime: 0.20,  // 20% - effectiveness
    milestonesCompleted: 0.10, // 10% - progress
  };

  const scores = {
    organizerAdoption: Math.min(metrics.organizerAdoption / 80, 100), // 80% target
    memberEngagement: Math.min(metrics.memberEngagement / 40, 100),   // 40% target
    casesManaged: Math.min(metrics.casesManaged / 50, 100),           // 50 cases target
    avgResolutionTime: Math.max(0, 100 - (metrics.avgResolutionTime / 30) * 100), // < 30 days ideal
    milestonesCompleted: (metrics.milestones.filter(m => m.status === 'complete').length / metrics.milestones.length) * 100,
  };

  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key as keyof typeof scores] * weight);
  }, 0);
}
```

---

## Movement Amplification

### Privacy-Preserving Aggregation

```typescript
// lib/movement-insights/aggregation.ts

// Only aggregate data from organizations that have explicitly opted in
export async function generateMovementInsights(
  dimension: 'grievance-type' | 'resolution-pattern' | 'systemic-issue'
): Promise<MovementTrend[]> {
  // Consent check
  const optedInOrgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.dataAggregationConsent, true));

  if (optedInOrgs.length < 5) {
    throw new Error('Minimum 5 organizations required for aggregation');
  }

  // Aggregate without revealing individual organization data
  const trends = await db
    .select({
      category: grievances.category,
      count: sql<number>`count(*)`,
      avgResolution: sql<number>`avg(resolution_days)`,
    })
    .from(grievances)
    .where(
      and(
        inArray(grievances.organizationId, optedInOrgs.map(o => o.id)),
        gte(grievances.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Last 90 days
      )
    )
    .groupBy(grievances.category)
    .having(sql`count(*) >= 10`); // Minimum threshold for privacy

  return trends.map(trend => ({
    id: generateId(),
    category: dimension,
    dimension: trend.category,
    aggregatedCount: trend.count,
    organizationsContributing: optedInOrgs.length,
    timeframe: 'last_90_days',
    insights: generateInsight(trend),
    legislativeBriefRelevance: assessLegislativeRelevance(trend),
  }));
}
```

---

## Metrics Engine

### Tracked Metrics (Ethical, Non-Surveillance)

```typescript
// No individual behavioral scoring
// No "productivity" metrics that could be weaponized
// Focus on system health, not people surveillance

interface EthicalMetrics {
  // System effectiveness
  avgTimeToResolution: number;           // How fast is the system?
  escalationRate: number;                 // Are cases being handled well?
  
  // Organizer workload (not "performance")
  avgCasesPerOrganizer: number;           // Fair distribution?
  organizerUtilization: number;           // Overburdened indicator
  
  // Democratic health
  governanceVoteParticipation: number;    // Member engagement
  electionTurnout: number;                // Democratic vitality
  
  // Member trust
  memberSatisfactionSignals: number;      // Opt-in feedback
  platformUsageConsistency: number;       // System reliability indicator
  
  // Process integrity
  fsmComplianceRate: number;              // Rules followed
  auditLogCompleteness: number;           // Transparency maintained
  rlsEnforcementUptime: number;           // Security active
  immutabilityViolations: number;         // Should always be 0
}
```

---

## Release Contract Integration

### Growth Engine CI Gate

Add to release contract:

```yaml
# .github/workflows/release-contract.yml

growth_engine_validation:
  - name: Verify Trust Dashboard
    run: |
      pnpm test:integration -- __tests__/marketing/trust-dashboard.test.ts
  
  - name: Verify Human Explainers
    run: |
      pnpm test:unit -- __tests__/lib/member-experience/human-explainers.test.ts
  
  - name: Verify Privacy-Preserving Aggregation
    run: |
      pnpm test:unit -- __tests__/lib/movement-insights/aggregation.test.ts
  
  - name: Verify No Surveillance Metrics
    run: |
      pnpm lint:surveillance-check
```

---

## Implementation Sprint Plan

### Sprint 1: Foundation (1 week)
- [ ] Type definitions for all new models
- [ ] Database schema migrations
- [ ] Reusable UI components
- [ ] Design system extension (colors, patterns)

### Sprint 2: Trust Infrastructure (1 week)
- [ ] Trust Dashboard `/app/trust`
- [ ] Ethics page `/app/ethics`
- [ ] System status verification functions
- [ ] PDF export capability

### Sprint 3: Narrative Layer (1 week)
- [ ] Story pages (`/story`, `/impact`, `/why-union-eyes`)
- [ ] Organizer testimonial system
- [ ] Impact visualization components
- [ ] Human-centered callout system

### Sprint 4: Member Wow Engine (1 week)
- [ ] Human explainer service
- [ ] Grievance timeline visualization
- [ ] Member dashboard enhancements
- [ ] Empathy language system

### Sprint 5: Social Proof (1 week)
- [ ] Case studies CMS
- [ ] Pilot stories system
- [ ] Impact metric cards
- [ ] Testimonial management

### Sprint 6: Pilot Funnel (1 week)
- [ ] Pilot request form
- [ ] Readiness assessment
- [ ] Pilot dashboard
- [ ] Health scoring system

### Sprint 7: Organizer Empowerment (1 week)
- [ ] Recognition system
- [ ] Impact summaries
- [ ] Case wins visualization
- [ ] Democratic participation metrics

### Sprint 8: Movement Amplification (1 week)
- [ ] Movement insights aggregation
- [ ] Privacy-preserving analytics
- [ ] Legislative brief export
- [ ] Consent framework

### Sprint 9: Integration & Polish (1 week)
- [ ] CI/CD integration
- [ ] Documentation
- [ ] Investor deck updates
- [ ] CLC presentation materials

---

## File Structure

```
Union_Eyes_app_v1/
├── app/
│   ├── story/
│   │   └── page.tsx
│   ├── impact/
│   │   └── page.tsx
│   ├── why-union-eyes/
│   │   └── page.tsx
│   ├── trust/
│   │   └── page.tsx
│   ├── ethics/
│   │   └── page.tsx
│   ├── case-studies/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── pilots/
│   │   └── page.tsx
│   ├── pilot-request/
│   │   └── page.tsx
│   ├── testimonials/
│   │   └── page.tsx
│   └── [locale]/
│       └── dashboard/
│           ├── member/
│           │   └── timeline/
│           │       └── page.tsx
│           ├── organizer/
│           │   ├── impact/
│           │   │   └── page.tsx
│           │   └── recognition/
│           │       └── page.tsx
│           ├── pilot/
│           │   └── page.tsx
│           └── movement-insights/
│               └── page.tsx
│
├── components/
│   ├── marketing/
│   │   ├── human-centered-callout.tsx
│   │   ├── impact-metric-card.tsx
│   │   ├── system-status-badge.tsx
│   │   ├── grievance-timeline.tsx
│   │   ├── pilot-health-metric.tsx
│   │   ├── organizer-impact-card.tsx
│   │   ├── movement-insight-card.tsx
│   │   ├── testimonial-card.tsx
│   │   └── case-study-card.tsx
│   └── trust/
│       ├── trust-metric.tsx
│       ├── immutability-status.tsx
│       ├── rls-status.tsx
│       ├── fsm-status.tsx
│       └── governance-status.tsx
│
├── lib/
│   ├── member-experience/
│   │   ├── human-explainers.ts
│   │   ├── timeline-builder.ts
│   │   └── empathy-language.ts
│   ├── trust/
│   │   ├── system-metrics.ts
│   │   ├── verification.ts
│   │   └── pdf-export.ts
│   ├── movement-insights/
│   │   ├── aggregation.ts
│   │   ├── consent-manager.ts
│   │   └── legislative-brief.ts
│   ├── pilot/
│   │   ├── health-scoring.ts
│   │   ├── readiness-assessment.ts
│   │   └── milestone-tracker.ts
│   └── marketing/
│       ├── impact-calculator.ts
│       ├── case-study-generator.ts
│       └── testimonial-manager.ts
│
├── db/
│   └── schema/
│       └── domains/
│           ├── marketing.ts
│           ├── pilot-program.ts
│           ├── organizer-recognition.ts
│           └── movement-insights.ts
│
├── __tests__/
│   ├── marketing/
│   │   ├── trust-dashboard.test.ts
│   │   ├── human-explainers.test.ts
│   │   ├── pilot-health.test.ts
│   │   └── case-studies.test.ts
│   └── lib/
│       └── movement-insights/
│           └── aggregation.test.ts
│
└── docs/
    └── marketing/
        ├── GROWTH_ENGINE_ARCHITECTURE.md (this file)
        ├── PILOT_PROGRAM_GUIDE.md
        ├── TRUST_METRICS_SPECIFICATION.md
        └── MOVEMENT_INSIGHTS_PRIVACY.md
```

---

## Success Criteria

### For CLC Partnership Discussion
- ✅ Trust Dashboard showing live system status
- ✅ Case study from pilot (even if simulated/projected)
- ✅ Governance transparency visible
- ✅ Movement amplification value proposition clear

### For CAPE Pilot
- ✅ Pilot request form live
- ✅ Readiness assessment automated
- ✅ Pilot health dashboard functional
- ✅ Organizer impact tracking ready

### For Institutional Scrutiny
- ✅ Trust metrics verifiable
- ✅ Immutability enforcement documented
- ✅ RLS isolation demonstrated
- ✅ FSM integrity provable
- ✅ Governance structure transparent

### For Skeptical Union Leadership
- ✅ Human-centered language throughout
- ✅ Organizer testimonials prominent
- ✅ No surveillance language anywhere
- ✅ Democratic values visible
- ✅ Transparency prioritized over marketing spin

---

## Anti-Patterns to Avoid

### ❌ DON'T
- Use "growth hacking" language
- Add leaderboards or competitive mechanics
- Track individual performance metrics
- Use dark patterns or FOMO tactics
- Gamify union work
- Hide governance complexity
- Use Silicon Valley aesthetic
- Frame as "efficiency tool"
- Measure "productivity"
- Add behavioral nudges

### ✅ DO
- Use "movement building" language
- Recognize collective achievements
- Track system effectiveness metrics
- Use honest transparency
- Respect the seriousness of union work
- Make governance understandable
- Use institutional aesthetic
- Frame as "democratic infrastructure"
- Measure "system reliability"
- Provide clear information

---

## Maintenance & Evolution

This growth engine is living infrastructure. As Union Eyes grows:

1. **Quarterly review** of trust metrics
2. **Annual update** of case studies
3. **Continuous validation** of FSM explainers
4. **Regular assessment** of pilot health scoring
5. **Ongoing consent audit** for movement insights

---

## Conclusion

This growth engine positions Union Eyes as:
- **Movement Infrastructure** (not just software)
- **Democratic System of Record** (not a database)
- **Organizing Amplifier** (not an efficiency tool)
- **Governance Framework** (not management software)

It is designed to convert skeptical union leadership, survive LP interrogation, and feel built by people who understand labor.

Every component reinforces: **transparency, accountability, fairness, and human dignity**.

---

*Document Version: 1.0*
*Last Updated: February 13, 2026*
*Owner: Product & Growth Team*
