# Union Eyes Growth Engine: Quick Reference

## 📋 What Has Been Built

This document provides a quick reference to the marketing and growth engine infrastructure created for Union Eyes.

---

## ✅ Completed Components

### Documentation
- **`GROWTH_ENGINE_ARCHITECTURE.md`** - Complete system design, data models, component specs
- **`IMPLEMENTATION_GUIDE.md`** - 9-sprint implementation roadmap with acceptance criteria
- **This file** - Quick reference guide

### Type Definitions
- **`types/marketing.ts`** - Complete TypeScript interfaces for:
  - Impact metrics
  - Case studies & testimonials
  - Pilot program management
  - Organizer recognition
  - Movement insights
  - Trust metrics
  - Member experience

### Database Schema
- **`db/schema/domains/marketing.ts`** - Drizzle ORM schema with:
  - `impact_metrics` - Before/after metric tracking
  - `case_studies` - Success story CMS
  - `testimonials` - User quotes and feedback
  - `pilot_applications` - Pilot program intake
  - `pilot_metrics` - Health scoring data
  - `organizer_impacts` - Recognition and tracking
  - `data_aggregation_consent` - Privacy-preserving opt-ins
  - `movement_trends` - Cross-union insights

### UI Components

#### `components/marketing/human-centered-callout.tsx`
Union-first messaging component with variants:
- `solidarity` - Red accent, union values
- `trust` - Green accent, security messaging
- `transparency` - Blue accent, governance
- `human` - Amber accent, people-first

Includes preset callouts:
- `CalloutPresets.BuiltWithUnions`
- `CalloutPresets.NoSurveillance`
- `CalloutPresets.TransparencyFirst`
- `CalloutPresets.OrganizersCentral`

#### `components/marketing/impact-metric-card.tsx`
Before/after metric visualization:
- Single metric cards
- Grid layout (`ImpactMetricGrid`)
- Automatic improvement calculation
- Compact variant for dashboards

#### `components/marketing/system-status-badge.tsx`
Trust infrastructure status display:
- `SystemStatusBadge` - Compact badge
- `SystemStatusCard` - Detailed card with metadata
- `SystemStatusGrid` - Multiple systems layout

### Services & Logic

#### `lib/member-experience/human-explainers.ts`
FSM state → human language translator:
- `getHumanExplainer()` - Convert status to compassionate explanation
- `getEncouragementMessage()` - Time-sensitive support messages
- `explainTransitionRules()` - Plain English FSM rules

Covers all claim statuses:
- submitted
- under_review
- assigned
- investigation
- pending_documentation
- resolved
- rejected
- closed

#### `lib/trust/system-metrics.ts`
Trust infrastructure verification:
- `getTrustMetrics()` - Comprehensive system check
- `getImmutabilityMetrics()` - Verify migration 0064 triggers
- `getRLSMetrics()` - Check Row-Level Security policies
- `getFSMMetrics()` - Validate state machine enforcement
- `getGovernanceMetrics()` - Golden share status
- `getAuditLogMetrics()` - Audit trail integrity
- `generateTrustSummary()` - Export to markdown

### Pages

#### `/app/trust/page.tsx`
**Public trust dashboard** showing:
- Live system status (5 key metrics)
- Detailed safeguard cards
- Technical implementation details
- Audit log statistics
- PDF export capability

**Audience**: CIOs, risk officers, skeptical leadership

#### `/app/story/page.tsx`
**Origin narrative page** with:
- Why Union Eyes exists
- Core principles (4 key values)
- Co-design process explanation
- Organizer testimonials
- "What we're NOT" section (anti-patterns)
- Governance transparency
- Call to action

**Audience**: Skeptical organizers, union executives

---

## 🚧 Ready to Build (Next Steps)

These components are fully designed but not yet implemented:

### High Priority (Sprint 2-3)

1. **Pilot Conversion Funnel**
   - `/app/pilot-request/page.tsx` - Application form
   - `/app/[locale]/dashboard/pilot/page.tsx` - Health dashboard
   - `lib/pilot/readiness-assessment.ts` - Scoring logic
   - `lib/pilot/health-scoring.ts` - Pilot health calculation

2. **Social Proof System**
   - `/app/case-studies/page.tsx` - Public case study listing
   - `/app/case-studies/[slug]/page.tsx` - Individual case study
   - `/app/admin/case-studies/page.tsx` - CMS for admins
   - `/app/testimonials/page.tsx` - Testimonial showcase
   - `components/marketing/case-study-card.tsx`

### Medium Priority (Sprint 4-5)

3. **Member Experience Enhancement**
   - `components/marketing/grievance-timeline.tsx` - Visual timeline
   - Enhanced member dashboard with timeline
   - `lib/member-experience/timeline-builder.ts`
   - `lib/member-experience/empathy-language.ts`

4. **Organizer Empowerment**
   - `/app/[locale]/dashboard/organizer/impact/page.tsx`
   - `/app/[locale]/dashboard/organizer/recognition/page.tsx`
   - `components/marketing/organizer-impact-card.tsx`
   - `lib/marketing/organizer-impact.ts`

### Lower Priority (Sprint 6)

5. **Movement Amplification**
   - `/app/[locale]/dashboard/movement-insights/page.tsx`
   - `lib/movement-insights/aggregation.ts`
   - `lib/movement-insights/consent-manager.ts`
   - `lib/movement-insights/legislative-brief.ts`
   - `components/marketing/movement-insight-card.tsx`

---

## 🎯 Usage Examples

### Display Trust Metrics

```tsx
import { getTrustMetrics } from '@/lib/trust/system-metrics';
import { SystemStatusGrid } from '@/components/marketing/system-status-badge';

export default async function TrustPage() {
  const metrics = await getTrustMetrics();
  
  return (
    <SystemStatusGrid
      systems={[
        {
          system: "Immutability Enforcement",
          status: metrics.immutability.status,
          description: metrics.immutability.description,
          metadata: [
            { label: "Triggers Active", value: metrics.immutability.triggersActive ? "Yes" : "No" },
            { label: "Violations Blocked", value: metrics.immutability.violationAttempts }
          ]
        }
      ]}
    />
  );
}
```

### Show Impact Metrics

```tsx
import { ImpactMetricGrid } from '@/components/marketing/impact-metric-card';

export function CaseStudyMetrics() {
  return (
    <ImpactMetricGrid
      metrics={[
        { 
          label: "Time to resolution", 
          before: 45, 
          after: 18, 
          unit: "days",
          higherIsBetter: false 
        },
        { 
          label: "Member satisfaction", 
          before: 3.2, 
          after: 4.6, 
          unit: "/5",
          higherIsBetter: true 
        }
      ]}
      context="CLC Pilot - 6 months"
    />
  );
}
```

### Display Human Explainer

```tsx
import { getHumanExplainer } from '@/lib/member-experience/human-explainers';
import { HumanCenteredCallout } from '@/components/marketing/human-centered-callout';

export function ClaimStatusExplanation({ claim }) {
  const explanation = getHumanExplainer({
    status: claim.status,
    priority: claim.priority,
    daysInState: calculateDaysInState(claim.statusChangedAt),
    assignedSteward: claim.stewardName
  });
  
  return (
    <div>
      <h3>{explanation.title}</h3>
      <p>{explanation.explanation}</p>
      <HumanCenteredCallout
        variant="human"
        title="What happens next"
        description={explanation.expectedTimeline}
      >
        <ul>
          {explanation.nextSteps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </HumanCenteredCallout>
      {explanation.empathyMessage && (
        <p className="text-sm text-slate-600 mt-4">
          {explanation.empathyMessage}
        </p>
      )}
    </div>
  );
}
```

### Use Preset Callouts

```tsx
import { CalloutPresets } from '@/components/marketing/human-centered-callout';

export function StoryPage() {
  return (
    <div>
      <CalloutPresets.BuiltWithUnions />
      <CalloutPresets.NoSurveillance />
      <CalloutPresets.TransparencyFirst />
      <CalloutPresets.OrganizersCentral />
    </div>
  );
}
```

---

## 🗄️ Database Schema Reference

### Quick Access Patterns

```typescript
// Get impact metrics for an organization
const metrics = await db
  .select()
  .from(impactMetrics)
  .where(eq(impactMetrics.organizationId, orgId))
  .orderBy(desc(impactMetrics.createdAt));

// Get featured case studies
const featured = await db
  .select()
  .from(caseStudies)
  .where(and(
    eq(caseStudies.featured, true),
    eq(caseStudies.visibility, 'public')
  ))
  .limit(3);

// Get pilot health metrics
const health = await db
  .select()
  .from(pilotMetrics)
  .where(eq(pilotMetrics.pilotId, pilotId))
  .orderBy(desc(pilotMetrics.lastCalculated))
  .limit(1);

// Check aggregation consent
const consent = await db
  .select()
  .from(dataAggregationConsent)
  .where(and(
    eq(dataAggregationConsent.organizationId, orgId),
    eq(dataAggregationConsent.consentGiven, true)
  ));
```

---

## 🎨 Design System Extensions

### Color Palette (Already in Tailwind Config)

```css
--union-blue: 210 50% 35%;          /* Deep institutional blue */
--solidarity-red: 0 65% 45%;         /* Union solidarity red */
--trust-green: 145 40% 40%;          /* Trust and security green */
--institutional-gray: 220 10% 30%;   /* Serious, trustworthy gray */
--warm-neutral: 30 10% 50%;          /* Human, approachable neutral */
```

### Typography Guidelines

- **Headings**: Bold, clear, institutional
- **Body**: Readable, not corporate-cheerful
- **Callouts**: Warm but serious
- **Avoid**: Startup aesthetic, gradient text, emoji (unless specifically requested)

---

## 📊 Key Metrics to Track

### For CLC Discussion
- Trust dashboard engagement
- Story page scroll depth
- Pilot application submissions

### For CAPE Pilot
- Organizer adoption rate (target 80%)
- Member engagement rate (target 40%)
- Pilot health score (target 70+)
- Time to resolution improvement

### For Institutional Scrutiny
- Immutability violation attempts (must be 0)
- RLS tenant isolation (must be 100%)
- FSM compliance rate (target 100%)
- Audit log completeness

---

## 🚀 Deployment Checklist

Before deploying growth engine to production:

- [ ] Run database migration 0066
- [ ] Verify all environment variables
- [ ] Test trust metrics on staging
- [ ] Review all copy for tone
- [ ] Legal review of ethics page
- [ ] Update navigation menus
- [ ] Set up monitoring alerts
- [ ] Train support team
- [ ] Prepare FAQ responses
- [ ] Update investor deck

---

## 📞 Who to Contact

- **Architecture Questions**: See `GROWTH_ENGINE_ARCHITECTURE.md`
- **Implementation Questions**: See `IMPLEMENTATION_GUIDE.md`
- **Database Schema**: See `db/schema/domains/marketing.ts`
- **Type Questions**: See `types/marketing.ts`

---

## 🎓 Philosophy Reminders

When building additional components, remember:

1. **Human dignity first** - No gamification, no surveillance
2. **Organizers are central** - Technology serves, never replaces
3. **Transparency builds trust** - Make everything auditable
4. **Democratic by design** - Governance visible, not hidden
5. **Movement infrastructure** - This is serious work, treat it seriously

---

## Next Actions

1. **Immediate**: Review architecture document with team
2. **This week**: Begin Sprint 1 (database migration)
3. **This month**: Complete Sprints 1-4 (foundation + core features)
4. **Before CLC meeting**: Have trust dashboard, story page, and 1-2 case studies live

---

*Last Updated: February 13, 2026*
*Quick Reference Version: 1.0*
