# Union Eyes Growth Engine: Implementation Guide

## Overview

This guide provides a step-by-step implementation roadmap for the Union Eyes Marketing & Growth Engine. The engine is designed to convert skeptical union leadership, survive institutional scrutiny, and position Union Eyes as movement infrastructure.

---

## Quick Start

### What's Already Built

✅ **Architecture Document** - Complete system design in `docs/marketing/GROWTH_ENGINE_ARCHITECTURE.md`

✅ **Type Definitions** - All TypeScript interfaces in `types/marketing.ts`

✅ **Database Schema** - Marketing domain schema in `db/schema/domains/marketing.ts`

✅ **Core UI Components**:
- `HumanCenteredCallout` - Union-first messaging
- `ImpactMetricCard` - Before/after data visualization
- `SystemStatusBadge` - Trust infrastructure badges

✅ **Services**:
- `human-explainers.ts` - FSM state → human language
- `system-metrics.ts` - Trust dashboard verification

✅ **Pages**:
- `/trust` - Live transparency dashboard
- `/story` - Origin narrative and values

### What Needs to Be Built

The remaining components are organized into logical sprints below.

---

## Sprint Breakdown

### Sprint 1: Foundation & Database (Week 1)

**Goal**: Set up database schema and run migrations

**Tasks**:

1. **Create migration file** `0066_add_marketing_schema.sql`
   ```sql
   -- Import schema from db/schema/domains/marketing.ts
   -- Create all tables, enums, indexes
   -- Add comments for documentation
   ```

2. **Test migration**
   ```bash
   psql -d union_eyes_dev -f db/migrations/0066_add_marketing_schema.sql
   ```

3. **Verify schema**
   ```bash
   pnpm drizzle-kit push
   ```

4. **Create seed data** for development
   - Sample case studies
   - Sample testimonials
   - Mock pilot applications

**Acceptance Criteria**:
- [ ] All tables created without errors
- [ ] Indexes applied
- [ ] Foreign key relationships validated
- [ ] Seed data loads successfully

---

### Sprint 2: Pilot Conversion Funnel (Week 2)

**Goal**: Build pilot request and management system

**Tasks**:

1. **Create pilot request form** `/app/pilot-request/page.tsx`
   - Organization details
   - Contact information
   - Readiness self-assessment
   - Risk disclosure acknowledgment

2. **Build readiness assessment logic** `lib/pilot/readiness-assessment.ts`
   ```typescript
   export function calculateReadinessScore(responses: Record<string, any>): number {
     // Score based on:
     // - Member count (larger = higher score)
     // - Current system state (worse = more to gain)
     // - Leadership buy-in
     // - Technical capacity
     // - Jurisdictional complexity
   }
   ```

3. **Create pilot dashboard** `/app/[locale]/dashboard/pilot/page.tsx`
   - Health score visualization
   - Milestone tracker
   - Adoption metrics
   - Quick actions

4. **Build health scoring service** `lib/pilot/health-scoring.ts`
   ```typescript
   export function calculatePilotHealth(metrics: PilotMetrics): PilotHealthScoreBreakdown {
     // Weighted scoring algorithm
     // See GROWTH_ENGINE_ARCHITECTURE.md for details
   }
   ```

5. **Create API endpoints**
   - `POST /api/pilot/apply` - Submit application
   - `GET /api/pilot/[id]` - Get pilot details
   - `GET /api/pilot/[id]/metrics` - Get health metrics
   - `PATCH /api/pilot/[id]/milestone` - Update milestone

**Acceptance Criteria**:
- [ ] Pilot request form submits successfully
- [ ] Readiness score calculated correctly
- [ ] Pilot dashboard displays metrics
- [ ] Health score updates in real-time
- [ ] Email confirmation sent on submission

---

### Sprint 3: Social Proof System (Week 3)

**Goal**: Build case studies and testimonial management

**Tasks**:

1. **Create case study CMS** `/app/admin/case-studies/page.tsx`
   - Create/edit/delete case studies
   - Markdown editor for content
   - Before/after metric inputs
   - Visibility controls (public/authenticated)
   - Featured flag

2. **Public case studies page** `/app/case-studies/page.tsx`
   - Grid layout
   - Filter by category, organization type
   - Featured studies highlighted
   - Export to PDF capability

3. **Individual case study page** `/app/case-studies/[slug]/page.tsx`
   - Full content display
   - Impact metric cards
   - Testimonial integration
   - Social sharing buttons

4. **Create testimonials management** `/app/admin/testimonials/page.tsx`
   - Add/edit testimonials
   - Type selection (organizer, member, executive, partner)
   - Photo upload
   - Approval workflow

5. **Testimonials public page** `/app/testimonials/page.tsx`
   - Filter by type
   - Random rotation for homepage
   - Video testimonial support (stretch goal)

6. **Create CaseStudyCard component** `components/marketing/case-study-card.tsx`
   - Compact display for listings
   - Expandable details
   - Share functionality

**Acceptance Criteria**:
- [ ] Case studies CRUD functional
- [ ] Public pages display correctly
- [ ] Filtering works as expected
- [ ] Testimonials display on multiple pages
- [ ] SEO metadata for all pages

---

### Sprint 4: Member Experience Enhancement (Week 4)

**Goal**: Implement Member Wow Engine features

**Tasks**:

1. **Create grievance timeline component** `components/marketing/grievance-timeline.tsx`
   ```tsx
   <GrievanceTimeline
     claimId={claim.id}
     currentStatus={claim.status}
     history={claim.transitions}
     humanExplainer={getHumanExplainer}
   />
   ```

2. **Enhance member dashboard** `/app/[locale]/dashboard/member/timeline/page.tsx`
   - Visual timeline of case journey
   - Human-language status explanations
   - "What happens next" guidance
   - Expected timeline display
   - Resources and support links

3. **Create empathy language service** `lib/member-experience/empathy-language.ts`
   ```typescript
   export function getEncouragementMessage(
     status: ClaimStatus,
     daysInState: number
   ): string | null {
     // Context-specific supportive messaging
   }
   ```

4. **Add timeline builder** `lib/member-experience/timeline-builder.ts`
   ```typescript
   export function buildTimelineStages(
     claim: Claim,
     transitions: Transition[]
   ): TimelineStage[] {
     // Convert FSM transitions into visual timeline
   }
   ```

5. **Integration with FSM**
   - Hook human explainers into claim status updates
   - Email notifications with human language
   - SMS updates (optional, depends on provider)

**Acceptance Criteria**:
- [ ] Timeline displays all case stages
- [ ] Human explainers show for each status
- [ ] Empathy messages display when appropriate
- [ ] Timeline updates in real-time
- [ ] Member feedback collected and positive

---

### Sprint 5: Organizer Empowerment Layer (Week 5)

**Goal**: Build recognition and impact tracking for organizers

**Tasks**:

1. **Create organizer impact service** `lib/marketing/organizer-impact.ts`
   ```typescript
   export async function calculateOrganizerImpact(
     userId: string,
     organizationId: string,
     period: { start: Date; end: Date }
   ): Promise<OrganizerImpact> {
     // Aggregate case metrics
     // Calculate satisfaction scores
     // Track democratic participation
     // Generate recognition events
   }
   ```

2. **Build impact dashboard** `/app/[locale]/dashboard/organizer/impact/page.tsx`
   - Cases handled summary
   - Average resolution time
   - Member satisfaction trend
   - Recognition timeline
   - Period comparison (month, quarter, year)

3. **Create recognition page** `/app/[locale]/dashboard/organizer/recognition/page.tsx`
   - Case wins visualization
   - Peer recognition display
   - Milestone achievements
   - *NO LEADERBOARDS* - this is empowerment, not competition

4. **Create OrganizerImpactCard component** `components/marketing/organizer-impact-card.tsx`
   - Visual metric display
   - Trend indicators
   - Context-aware messaging
   - Print/export capability

5. **Recognition event system**
   - Automatic triggers (case win, positive feedback)
   - Manual recognition from peers
   - Milestone tracking (10th case, 50th case, etc.)
   - Privacy controls (organizer can hide metrics)

**Acceptance Criteria**:
- [ ] Impact calculations accurate
- [ ] Dashboard displays all metrics
- [ ] Recognition events log correctly
- [ ] No competitive/surveillance mechanics
- [ ] Organizers report feeling supported, not monitored

---

### Sprint 6: Movement Amplification (Week 6)

**Goal**: Build privacy-preserving cross-union insights

**Tasks**:

1. **Create consent management** `lib/movement-insights/consent-manager.ts`
   ```typescript
   export async function requestAggregationConsent(
     organizationId: string,
     categories: MovementTrendCategory[]
   ): Promise<void> {
     // Request opt-in from organization
     // Store consent with expiration
     // Allow category-specific consent
   }
   ```

2. **Build aggregation service** `lib/movement-insights/aggregation.ts`
   ```typescript
   export async function generateMovementInsights(
     dimension: MovementTrendCategory
   ): Promise<MovementTrend[]> {
     // Minimum 5 orgs required
     // Minimum 10 cases per trend
     // Full anonymization
     // No individual org identification
   }
   ```

3. **Create movement insights page** `/app/[locale]/dashboard/movement-insights/page.tsx`
   - Aggregated trends display
   - Sector-specific patterns
   - Jurisdiction comparisons
   - Time-series analysis
   - Export for legislative briefs

4. **Create MovementInsightCard component** `components/marketing/movement-insight-card.tsx`
   - Trend visualization
   - Confidence level display
   - Legislative relevance flag
   - Anonymization guarantee visible

5. **Legislative brief export** `lib/movement-insights/legislative-brief.ts`
   ```typescript
   export async function generateLegislativeBrief(
     trends: MovementTrend[],
     jurisdiction: string
   ): Promise<string> {
     // Format for policy makers
     // Include aggregated statistics
     // Remove all identifying information
     // Add methodology transparency
   }
   ```

**Acceptance Criteria**:
- [ ] Consent workflow functional
- [ ] Aggregation only includes consenting orgs
- [ ] Minimum thresholds enforced
- [ ] No individual org data exposed
- [ ] Export generates clean PDF

---

### Sprint 7: Integration & Polish (Week 7)

**Goal**: Connect all pieces, add navigation, test end-to-end

**Tasks**:

1. **Create marketing site navigation**
   - Add links to header: Story, Trust, Case Studies, Pilots
   - Footer with ethics policy link
   - Breadcrumb navigation

2. **Build homepage integrations**
   - Featured case study carousel
   - Testimonial rotation
   - Trust metric badges (mini)
   - CTA to pilot request

3. **Create ethics page** `/app/ethics/page.tsx`
   - Data governance policy
   - No surveillance guarantee
   - No data resale policy
   - Transparent ownership
   - Democratic control structure

4. **Add PDF export functionality** `lib/trust/pdf-export.ts`
   ```typescript
   export async function exportTrustDashboardPDF(
     metrics: TrustMetrics
   ): Promise<Blob> {
     // Use pdf-lib or jsPDF
     // Professional formatting
     // Include all trust metrics
     // Add company logo and branding
   }
   ```

5. **Integration testing**
   - Test pilot application flow end-to-end
   - Verify member timeline displays correctly
   - Test organizer impact calculations
   - Validate movement insights privacy
   - Check trust dashboard accuracy

6. **Performance optimization**
   - Cache trust metrics (update every 5 minutes)
   - Optimize case study queries
   - Add database indexes where needed
   - Implement image optimization

**Acceptance Criteria**:
- [ ] All pages accessible from navigation
- [ ] PDF exports work correctly
- [ ] Ethics page reviewed by legal
- [ ] Performance metrics acceptable (< 3s load)
- [ ] Mobile responsive

---

### Sprint 8: Testing & Documentation (Week 8)

**Goal**: Comprehensive testing and documentation

**Tasks**:

1. **Write unit tests**
   ```typescript
   // __tests__/lib/member-experience/human-explainers.test.ts
   // __tests__/lib/trust/system-metrics.test.ts
   // __tests__/lib/pilot/health-scoring.test.ts
   // __tests__/lib/movement-insights/aggregation.test.ts
   ```

2. **Write integration tests**
   ```typescript
   // __tests__/marketing/pilot-flow.test.ts
   // __tests__/marketing/case-study-crud.test.ts
   // __tests__/marketing/trust-dashboard.test.ts
   ```

3. **Create user documentation**
   - Pilot program guide (`docs/marketing/PILOT_PROGRAM_GUIDE.md`)
   - Trust metrics specification (`docs/marketing/TRUST_METRICS_SPECIFICATION.md`)
   - Movement insights privacy policy (`docs/marketing/MOVEMENT_INSIGHTS_PRIVACY.md`)

4. **Create admin documentation**
   - Case study creation guide
   - Testimonial management
   - Pilot application review process

5. **Add CI/CD checks**
   - Lint marketing components
   - Run marketing test suite
   - Verify no surveillance language in code
   - Check that all public routes are documented

6. **Security audit**
   - Verify RLS on all marketing tables
   - Check that pilot data is properly isolated
   - Validate consent enforcement for aggregation
   - Review PII handling in case studies

**Acceptance Criteria**:
- [ ] All tests passing
- [ ] Documentation complete and reviewed
- [ ] CI/CD gates added
- [ ] Security audit completed
- [ ] Code coverage > 80% for marketing code

---

### Sprint 9: Launch Preparation (Week 9)

**Goal**: Prepare for CLC/CAPE discussions

**Tasks**:

1. **Create investor deck integration**
   - Export trust metrics to deck
   - Include case study highlights
   - Show pilot health scores
   - Demonstrate governance transparency

2. **Prepare CLC presentation**
   - Story page as foundation
   - Trust dashboard live demo
   - Movement insights preview
   - Pilot program value prop

3. **CAPE pilot materials**
   - Custom pilot plan template
   - Risk assessment checklist
   - Expected outcomes document
   - Success metrics definition

4. **Create demo data**
   - Realistic case studies
   - Simulated pilot metrics
   - Example movement insights
   - Sample testimonials

5. **Stakeholder training**
   - Train support team on pilot process
   - Educate sales on trust dashboard
   - Brief executives on governance talking points
   - Prepare FAQ responses

**Acceptance Criteria**:
- [ ] Presentation materials ready
- [ ] Demo environment stable
- [ ] All stakeholders trained
- [ ] FAQ document complete
- [ ] Dry run successful

---

## Release Checklist

Before launching to production:

### Technical

- [ ] All database migrations applied
- [ ] Environment variables configured
- [ ] Error monitoring enabled (Sentry)
- [ ] Performance monitoring enabled
- [ ] Backup strategy verified
- [ ] Rate limiting configured
- [ ] GDPR compliance verified

### Content

- [ ] All copy reviewed for tone (no Silicon Valley language)
- [ ] All pages have proper SEO metadata
- [ ] Images optimized and accessible
- [ ] Legal review of ethics page
- [ ] Governance documentation accurate

### Testing

- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Accessibility testing (WCAG 2.1 AA)
- [ ] Load testing (can handle 100 concurrent users)
- [ ] Security testing (OWASP Top 10)

### Operations

- [ ] Monitoring dashboards configured
- [ ] Alerting rules set up
- [ ] Incident response plan documented
- [ ] Rollback plan tested
- [ ] Customer support trained

---

## Success Metrics

### For CLC Partnership Discussion

Track these metrics to demonstrate value:

1. **Trust Dashboard Engagement**
   - Page views
   - Time on page (expect 3-5 minutes for serious stakeholders)
   - PDF exports
   - Return visits

2. **Story Page Impact**
   - Bounce rate (target < 40%)
   - Scroll depth (80%+ read)
   - Click-through to pilot request (target 10%)

3. **Pilot Applications**
   - Application submissions
   - Readiness score distribution
   - Approval rate
   - Time to activation

### For CAPE Pilot

Track these for pilot health:

1. **Adoption Metrics**
   - Organizer activation rate (target 80%)
   - Daily active users
   - Cases managed in system

2. **Satisfaction Metrics**
   - Member satisfaction scores
   - Organizer feedback (qualitative)
   - Support ticket volume (lower is better)

3. **System Effectiveness**
   - Time to resolution (vs. baseline)
   - Escalation rate (vs. baseline)
   - Documentation completeness

---

## Troubleshooting

### Common Issues

**Issue**: Trust metrics show "unknown" status
- **Cause**: Database connection issue or missing triggers
- **Fix**: Run `pnpm verify-migrations` and check Sentry logs

**Issue**: Pilot health score = 0
- **Cause**: Missing baseline data or calculation error
- **Fix**: Check `pilot_metrics` table for null values

**Issue**: Movement insights not generating
- **Cause**: Insufficient consenting organizations (< 5)
- **Fix**: Request consent from more orgs or wait for organic growth

**Issue**: Human explainers showing generic text
- **Cause**: Status not mapped in `human-explainers.ts`
- **Fix**: Add mapping for new status or check FSM sync

---

## Support

For questions about implementation:

1. **Architecture Questions**: See `GROWTH_ENGINE_ARCHITECTURE.md`
2. **Database Schema**: See `db/schema/domains/marketing.ts`
3. **Type Definitions**: See `types/marketing.ts`
4. **Component API**: Check JSDoc comments in component files

---

## Future Enhancements

Not included in initial launch but worth considering:

1. **Video Testimonials** - Richer storytelling
2. **Interactive Timeline** - Member can add notes/documents
3. **Pilot Cohorts** - Group pilots for peer learning
4. **Benchmarking Dashboard** - Anonymous comparison between orgs (with consent)
5. **Movement Insights API** - Allow researchers to query (with ethics board review)
6. **Multi-language Support** - French, Spanish for CLC reach

---

## Conclusion

This implementation plan positions Union Eyes as:
- **Movement Infrastructure** (not just software)
- **Institutionally Trustworthy** (via transparency dashboard)
- **Human-Centered** (via member wow engine and organizer empowerment)
- **Democratically Governed** (golden share visible)

Every component reinforces: **transparency, accountability, fairness, and human dignity**.

Execute methodically. Test thoroughly. Launch confidently.

---

*Last Updated: February 13, 2026*
*Owner: Product & Engineering Team*
