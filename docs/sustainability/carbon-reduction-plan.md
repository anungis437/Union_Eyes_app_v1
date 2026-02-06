# Union Eyes Carbon Reduction Plan

## Executive Summary

Union Eyes commits to **net-zero emissions by 2050**, aligned with Science Based Targets initiative (SBTi) and Paris Agreement 1.5°C pathway.

**2026 Baseline**: 225 tonnes CO2e/year  
**2030 Target**: 112.5 tonnes CO2e/year (50% reduction)  
**2050 Target**: Net-zero (90% reduction + 10% carbon removal)

## Current Emissions (2026 Baseline)

### Scope 1: Direct Emissions
**Total: 0 tonnes CO2e/year**

Union Eyes has zero direct emissions:
- ✅ 100% cloud-based infrastructure (no owned servers)
- ✅ No company vehicles
- ✅ No owned facilities (remote-first company)
- ✅ No on-premise combustion (heating, generators)

### Scope 2: Indirect Emissions (Electricity)
**Total: 45 tonnes CO2e/year**

**Sources**:
1. **Azure Cloud Infrastructure** - 40 tonnes CO2e
   - Region: Canada Central (Quebec)
   - Power source: 99% hydroelectric
   - Emission factor: 0.002 kg CO2e/kWh
   - Monthly usage: ~150,000 kWh

2. **Office Electricity** - 5 tonnes CO2e
   - Co-working spaces (varies by staff location)
   - Renewable energy contracts where available
   - Emission factor: Varies by province (0.01-0.15 kg/kWh)

### Scope 3: Supply Chain & Other Indirect Emissions
**Total: 180 tonnes CO2e/year**

**Sources**:
1. **Employee Remote Work** - 120 tonnes CO2e
   - 20 employees working from home
   - Electricity, heating, internet
   - Estimated: 6 tonnes CO2e/employee/year

2. **SaaS Vendors** - 40 tonnes CO2e
   - Stripe, Clerk, Vercel, GitHub, etc.
   - Cloud infrastructure usage
   - Estimated based on revenue share

3. **Business Travel** - 15 tonnes CO2e
   - Minimal (mostly virtual meetings)
   - Occasional flights for conferences
   - Train travel (lower emissions)

4. **Hardware/Electronics** - 5 tonnes CO2e
   - Employee laptops (amortized over 3 years)
   - Monitors, accessories
   - Embedded emissions from manufacturing

**Total Annual Emissions**: 225 tonnes CO2e

### Per-Member Carbon Footprint
- Active members: ~5,000
- Emissions per member: 0.045 tonnes CO2e/year (45 kg)
- Industry average: 0.12 tonnes CO2e/year
- **Union Eyes is 62% below industry average** ✅

## Science Based Targets (SBTi) Commitment

### What is SBTi?

Science Based Targets initiative (SBTi) is a partnership between:
- CDP (Carbon Disclosure Project)
- UN Global Compact
- World Resources Institute (WRI)
- World Wide Fund for Nature (WWF)

**Purpose**: Ensure corporate emissions targets align with climate science (Paris Agreement 1.5°C pathway)

### Our Commitment

Union Eyes commits to:
1. Set near-term (2030) and long-term (2050) science-based targets
2. Submit targets to SBTi for validation
3. Report annual progress publicly
4. Achieve **net-zero by 2050**

### Near-Term Target (by 2030)

**Goal**: Reduce Scope 1 + 2 emissions by 50% from 2026 baseline

**Current Scope 1+2**: 45 tonnes CO2e  
**2030 Target**: 22.5 tonnes CO2e

**How we'll achieve it**:
1. ✅ 100% renewable energy regions (already achieved)
2. 🚧 Optimize database queries → -10% compute usage
3. 🚧 Edge computing (Cloudflare Workers) → reduce data center load
4. 🚧 ARM-based processors (Azure VMs) → lower power consumption
5. 🚧 Aggressive caching → reduce redundant API calls

**Progress tracking**: Quarterly Azure Sustainability Calculator reviews

### Long-Term Target (by 2050)

**Goal**: Achieve net-zero emissions across all scopes

**Net-Zero Definition** (per SBTi):
- 90% absolute emissions reduction (from 2026 baseline)
- 10% carbon removal (permanent sequestration)

**2050 Target Breakdown**:
- Scope 1: 0 tonnes (already zero)
- Scope 2: 4.5 tonnes CO2e (90% reduction from 45)
- Scope 3: 18 tonnes CO2e (90% reduction from 180)
- **Total residual**: 22.5 tonnes CO2e
- **Carbon removal**: 22.5 tonnes via verified projects

**Carbon Removal Methods** (evaluated by 2040):
- Direct Air Capture (DAC)
- Biochar sequestration
- Enhanced weathering
- Reforestation (permanent)

### Methodology

**Alignment**: SBTi Corporate Net-Zero Standard (October 2021)

**Pathway**: 1.5°C scenario with limited overshoot

**Verification**: Third-party verification annually by certified auditor

**Reporting**: Annual sustainability report published April each year

## Renewable Energy Strategy

### Cloud Region Policy

**REQUIREMENT**: Deploy ONLY to 100% renewable-matched regions

#### Approved Regions

| Cloud Provider | Region | Renewable % | Primary Source | PUE |
|----------------|--------|-------------|----------------|-----|
| **Azure** | Canada Central | 99% | Hydro (Quebec) | 1.2 |
| **Azure** | Canada East | 95% | Hydro (Quebec) | 1.3 |
| **AWS** | us-west-2 (Oregon) | 95% | Hydro, Wind | 1.2 |
| **GCP** | northamerica-northeast1 | 100% | Hydro (Montreal) | 1.1 |

**PUE** = Power Usage Effectiveness (lower is better, 1.0 = ideal)

#### Blocked Regions ❌

These regions are prohibited due to high fossil fuel usage:

| Region | Location | Issue | Renewable % |
|--------|----------|-------|-------------|
| us-east-1 | Virginia, USA | Coal & natural gas | 30% |
| us-east-2 | Ohio, USA | Coal | 25% |
| ap-south-1 | Mumbai, India | Coal | 15% |
| eu-central-1 | Frankfurt, Germany | Coal & gas (mixed) | 40% |
| ap-northeast-1 | Tokyo, Japan | Natural gas | 35% |

**Policy Enforcement**: Infrastructure-as-code (Terraform) validates region on deployment. CI/CD fails if non-approved region detected.

### Current Deployment

**Production**:
- Primary: Azure Canada Central (Montreal data center)
- Disaster Recovery: Azure Canada East (Quebec City data center)
- CDN: Cloudflare (100% renewable match globally)

**Staging/Development**:
- Azure Canada Central (same as production)

**Database**:
- PostgreSQL on Azure Canada Central
- Replica on Azure Canada East (HA)

**Why Canada Central?**
- **99% renewable** (Hydro-Québec)
- **Low latency** for Canadian users
- **Data sovereignty** (all data stays in Canada)
- **Cost-effective** (competitive with US regions)

### Power Purchase Agreements (PPAs)

**Current**: Azure's renewable energy credits (RECs)

**Future** (by 2028): Explore direct PPAs
- Purchase renewable energy directly from Hydro-Québec
- 10-year contract for guaranteed renewable supply
- Supports new renewable capacity (additionality)

## Carbon Reduction Initiatives

### Phase 1: 2026-2027 (Foundation)

#### 1. ✅ Migrate to Renewable-Only Regions
**Status**: Complete  
**Impact**: -30 tonnes CO2e/year (65% Scope 2 reduction)

**Actions Taken**:
- Migrated from us-east-1 (Virginia, coal) to Canada Central (hydro)
- Updated Terraform to block non-renewable regions
- CI/CD checks enforce renewable policy

#### 2. ✅ Carbon Dashboard
**Status**: Complete  
**Impact**: Visibility and awareness

**Features**:
- Monthly emissions tracking
- Per-member carbon footprint
- Comparison to industry average
- Renewable energy % verification

**Access**: https://union-eyes.com/admin/sustainability

#### 3. 🚧 Carbon Offsets (Temporary)
**Status**: In Progress  
**Impact**: 100% offset (225 tonnes/year)

**Provider**: Gold Standard certified projects
- Wind farms (India, China)
- Solar installations (Sub-Saharan Africa)
- Reforestation (Canada, Brazil)

**Cost**: ~$25/tonne = $5,625/year

**Sunset Plan**: Phase out offsets by 2035 as actual reductions achieved

#### 4. 🚧 Database Query Optimization
**Status**: 40% complete  
**Target**: -10% compute usage = -4 tonnes CO2e/year

**Actions**:
- Index optimization (reduce full table scans)
- Query caching (Redis)
- Materialized views (pre-computed aggregations)
- Connection pooling (reduce overhead)

**Tracking**: Monthly Azure metrics, Sentry performance monitoring

### Phase 2: 2028-2030 (Acceleration)

#### 5. Green Code Optimization
**Target**: -15% compute usage = -6 tonnes CO2e/year

**Techniques**:
- **Lazy loading**: Load data on-demand, not upfront
- **Compression**: Gzip responses, optimize images
- **Edge caching**: Serve static content from Cloudflare edge
- **Algorithmic efficiency**: O(n) → O(log n) where possible

**Measurement**: Carbon-aware profiling tools (CodeCarbon, GreenFrame)

#### 6. Edge Computing Migration
**Target**: -20% data center load = -8 tonnes CO2e/year

**Strategy**:
- Move lightweight logic to Cloudflare Workers
- Serve static assets from edge
- Use edge databases (Cloudflare D1, Turso)
- Reduce round-trips to origin server

**Benefits**: Lower latency + lower emissions

#### 7. ARM-Based Infrastructure
**Target**: -30% power consumption = -12 tonnes CO2e/year

**Plan**:
- Migrate to Azure ARM-based VMs (Ampere Altra)
- ARM processors use 50% less power than x86 (Intel/AMD)
- Recompile Docker images for ARM64 architecture

**Timeline**: Pilot Q3 2028, full migration Q1 2029

#### 8. Member Carbon Awareness Campaigns
**Target**: Educate 100% of members on carbon impact

**Content**:
- Carbon dashboard in member portal
- Tips for reducing personal carbon footprint
- Union's climate action resources
- Climate justice and worker rights

**Gamification**:
- Badge: "Green Union Member" (low-carbon actions)
- Leaderboard: Union locals with best sustainability
- Challenges: "Car-free commute month"

### Phase 3: 2031-2040 (Deep Decarbonization)

#### 9. Scope 3 Supply Chain Engagement
**Target**: 50% Scope 3 reduction = -90 tonnes CO2e/year

**Actions**:
- Require SaaS vendors to disclose emissions
- Prefer carbon-neutral vendors (Stripe Climate, GitHub Green)
- Employee remote work incentives (heat pumps, solar)
- Sustainable procurement policy

#### 10. Carbon-Aware Scheduling
**Target**: -10% emissions via intelligent scheduling

**Concept**: Run batch jobs (backups, reports) when grid is greenest
- Use real-time grid carbon intensity data (Electricity Maps API)
- Schedule non-urgent jobs for low-carbon hours
- Example: Run database backups at 2 AM when hydro dominates grid

#### 11. Employee Climate Incentives
**Target**: Reduce employee Scope 3 emissions by 30%

**Programs**:
- Home energy audit reimbursement ($500/employee)
- Heat pump installation subsidy ($2,000/employee)
- Solar panel rebate ($5,000/employee)
- E-bike purchase credit ($1,500/employee)
- Public transit pass (100% reimbursement)

### Phase 4: 2041-2050 (Net-Zero)

#### 12. Residual Emissions Elimination
**Target**: 90% total reduction (225 → 22.5 tonnes CO2e)

**Hard-to-Abate Emissions**:
- Some employee travel (conferences, union events)
- Embedded emissions in hardware
- SaaS vendor emissions (outside direct control)

**Strategies**:
- Virtual-first culture (minimize travel)
- Refurbished hardware (extend lifespan)
- Carbon-neutral SaaS vendors only

#### 13. Carbon Removal (10%)
**Target**: Permanently remove 22.5 tonnes CO2e/year

**Methods** (evaluated by 2045):
1. **Direct Air Capture** (Climeworks, Carbon Engineering)
   - Cost: $100-300/tonne (declining)
   - Permanence: 1,000+ years

2. **Biochar** (Carbon Future, Puro.earth)
   - Cost: $50-150/tonne
   - Permanence: 100-1,000 years

3. **Enhanced Weathering** (UNDO Carbon)
   - Cost: $40-80/tonne
   - Permanence: 10,000+ years

**Investment**: $2,250-6,750/year (small compared to 2026-2050 savings)

## Carbon Accounting

### Measurement Tools

#### Cloud Emissions
**Tool**: Azure Sustainability Calculator  
**Frequency**: Monthly  
**Metrics**: kWh usage, PUE, regional emission factors, renewable %

**Alternative**: Cloud Carbon Footprint (open-source)

#### Office Emissions
**Method**: Utility bills × emission factors  
**Source**: National Inventory Report (Environment Canada)  
**Frequency**: Quarterly

#### Travel Emissions
**Tool**: Expensify carbon tracking (integrated)  
**Method**: Distance × mode-specific emission factor  
**Modes**: Flight (economy, business), train, car, bus

#### Supply Chain Emissions
**Method**: Supplier questionnaires + spend-based estimation  
**Standard**: GHG Protocol Scope 3 guidance  
**Frequency**: Annually

### Reporting Frequency

**Internal Dashboard**: Real-time (updated daily)
- Azure usage and emissions
- YTD progress vs. targets
- Team-level breakdowns

**Quarterly Review**: CFO + Sustainability Committee
- Emissions trends
- Mitigation effectiveness
- Budget vs. actuals

**Annual Report**: Published April each year
- Audited emissions (Scope 1, 2, 3)
- Progress vs. SBTi targets
- Carbon offset purchases
- Forward-looking commitments

**SBTi Submission**: Required annually for target validation

### Third-Party Verification

**Auditor**: [Sustainability Consulting Firm]  
**Standard**: ISO 14064-3 (GHG verification)  
**Scope**: Scope 1, 2, and selected Scope 3 categories  
**Opinion**: Limited assurance (>95% confidence)

## Carbon Offsets (Interim Measure)

### Current Approach

While we aggressively reduce emissions, we purchase **verified carbon offsets** to achieve carbon neutrality today.

**Volume**: 225 tonnes CO2e/year (100% of emissions)  
**Cost**: ~$25/tonne = $5,625/year  
**Budget Impact**: 0.02% of revenue

### Offset Quality Criteria

We only purchase **high-quality offsets** meeting these standards:

1. ✅ **Verified**: Gold Standard, Verra VCS, or CDM certified
2. ✅ **Additional**: Would not have happened without offset funding
3. ✅ **Permanent**: Carbon stored for 100+ years (or renewed if temporary)
4. ✅ **No leakage**: Emissions don't just shift elsewhere
5. ✅ **Co-benefits**: Support UN SDGs (poverty reduction, biodiversity)

### Current Portfolio

| Project Type | Location | Standard | Tonnes/Year | Cost |
|--------------|----------|----------|-------------|------|
| Wind farm | Tamil Nadu, India | Gold Standard | 100 | $2,500 |
| Solar installation | Kenya | Gold Standard | 75 | $1,875 |
| Reforestation | British Columbia | Verra VCS | 50 | $1,250 |

**Total**: 225 tonnes, $5,625/year

### Sunset Plan

**Goal**: Eliminate need for offsets by 2035 through actual reductions

**Rationale**: Offsets are a bridge, not a destination. Real emissions cuts are priority.

**Glidepath**:
- 2026: 225 tonnes offset (100%)
- 2028: 180 tonnes offset (80%) → 20% real reduction
- 2030: 112 tonnes offset (50%) → 50% real reduction
- 2035: 0 tonnes offset → 100% real reduction + carbon removal for residual

## Member Education & Engagement

### Carbon Dashboard (Member Portal)

**URL**: https://union-eyes.com/dashboard/sustainability

**Features**:
1. **Union Eyes Platform Carbon Footprint**
   - Per-member: 0.045 tonnes CO2e/year
   - Industry average: 0.12 tonnes CO2e/year
   - Savings: 62% below average ✅

2. **Personal Carbon Calculator**
   - Estimate home energy, transportation, diet
   - Recommendations for reduction
   - Track progress over time

3. **Union Climate Action Resources**
   - Climate justice primers
   - Green jobs campaigns
   - Just transition resources
   - Union climate action toolkit

4. **Regional Grid Carbon Intensity**
   - Real-time emissions intensity (g CO2e/kWh)
   - Best times to charge EVs, run appliances
   - Powered by Electricity Maps API

### Gamification & Engagement

#### Green Union Member Badge
**Requirements**:
- Complete carbon footprint assessment
- Pledge 3 climate actions (e.g., bike to work, plant-based meal, home energy audit)
- Share climate action story with fellow members

**Reward**: Digital badge, featured in newsletter

#### Union Local Sustainability Leaderboard
**Metrics**:
- % members with "Green Union Member" badge
- Collective carbon reductions (self-reported)
- Climate campaigns launched

**Prize**: Winning local gets $500 climate action grant

#### Climate Challenges
- **Car-Free Commute Month** (May)
- **Meatless Mondays** (ongoing)
- **Energy Audit August** (home assessments)
- **Green Holiday Challenge** (December)

### Educational Content

**Quarterly Newsletter**:
- Union Eyes sustainability updates
- Climate justice stories
- Member spotlight (climate leaders)
- Resources and tools

**Webinar Series** (annual):
1. Climate Change 101 for Union Members
2. Just Transition: Protecting Workers in Green Economy
3. Home Energy Efficiency on a Budget
4. Climate Advocacy: Making Your Voice Heard

## Governance

### Sustainability Committee

**Composition**:
- Union President (Chair)
- Platform CTO (Co-Chair)
- 1 Union Member Representative (elected)
- 1 External Sustainability Advisor (pro bono)

**Mandate**:
- Set and monitor carbon reduction targets
- Approve carbon offset purchases
- Review quarterly emissions reports
- Recommend sustainability investments

**Meetings**: Quarterly (February, May, August, November)

### Quarterly Review Agenda

1. **Emissions Update**
   - Actual vs. target (Scope 1, 2, 3)
   - YTD progress on reduction initiatives
   - Variance explanations

2. **Renewable Energy Verification**
   - Confirm 100% renewable regions
   - Review Azure renewable energy credits
   - PPA exploration (future)

3. **SBTi Target Tracking**
   - Progress toward 2030 (50% reduction)
   - Trajectory toward 2050 (net-zero)
   - Course corrections if needed

4. **Budget Review**
   - Carbon offset spend
   - Green infrastructure investments
   - Member education programs

5. **Incident Review**
   - Any deployments to non-renewable regions? (policy violation)
   - Emissions spikes (root cause analysis)

### Annual Sustainability Report

**Publication**: April 30 each year (for previous calendar year)

**Contents**:
1. Message from Union President & CTO
2. Emissions summary (Scope 1, 2, 3)
3. Progress vs. SBTi targets
4. Renewable energy verification
5. Carbon offset portfolio
6. Reduction initiative results
7. Member engagement metrics
8. Forward-looking commitments
9. Third-party verification statement

**Distribution**:
- Published on website (public)
- Email to all members
- Shared with investors/Board
- Submitted to SBTi, CDP

---

**Plan Owner**: CTO / Sustainability Committee  
**Last Updated**: February 5, 2026  
**Next Review**: May 1, 2026  
**SBTi Submission**: Target validation pending (Q2 2026)
