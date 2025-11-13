# UnionClaim - Union Claims Management System

**Status**: Phase 2 Development - Claims Management + Voice-to-Text  
**Priority**: CRITICAL  
**Timeline**: October 25 - November 25, 2025

AI-powered grievance and claims management platform for labor unions with voice-to-text accessibility and real-time tracking.

## 🚀 Quick Start

```bash
# From the union-claims directory
pnpm install
pnpm dev
```

Visit: **http://localhost:5020**

## 🎯 Phase 2 Focus Areas

### 1. Claims Submission Portal (Week 1)
- **Voice-to-Text Integration** - Azure Speech Services for accessibility
- **Anonymous Submission** - Privacy-first claim filing
- **Multi-language Support** - EN/FR/ES for Canadian unions
- **Mobile-First Design** - Optimized for union member smartphones

### 2. Real-Time Claim Tracking (Week 2)
- **Member Portal** - Live claim status updates
- **Timeline View** - Visual progress tracking
- **Notification System** - Email/SMS/in-app alerts
- **Document Repository** - Per-claim file management

### 3. LRO Workbench (Week 3)
- **Claim Queue** - Priority sorting and assignment
- **AI-powered Analysis** - Automatic claim summarization
- **Document Annotation** - Private LRO notes on member documents
- **Email Integration** - Auto-copy correspondence to platform

### 4. Grievance Process Engine (Week 4)
- **Configurable Workflows** - Union-specific process templates
- **Collective Agreement Linking** - Tie claims to CA clauses
- **Deadline Tracking** - Automated alerts and escalation
- **White-label Platform** - Each union can customize branding

## 📱 Current Pages

| Route | Description | Status |
|-------|-------------|--------|
| `/dashboard` | Overview metrics and AI insights | ✅ Complete |
| `/claims` | Claims list with filtering | 🚧 Phase 2 |
| `/claims/:id` | Detailed claim view | 🚧 Phase 2 |
| `/submit` | Voice-enabled claim submission | 🚧 Phase 2 |
| `/member` | Member self-service portal | ✅ Complete |
| `/admin` | Union administration panel | ✅ Complete |
| `/settings` | User preferences | ✅ Complete |

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite 5
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Voice**: Azure Speech Services
- **AI**: OpenAI GPT-4
- **Database**: Supabase
- **Port**: 5020

## 🎙️ Voice-to-Text Features

### Why Voice-First Design?
> "Public employees... don't have the greatest ability to write... text-to-speech function that allows them to take voice notes that transform into text"

- Union members with varying literacy levels
- Shop stewards capturing institutional knowledge
- Phone call transcription with automated note-taking
- Lower barrier to entry for filing grievances

### Technical Implementation
- **Azure Speech Services** - Multi-language real-time transcription
- **Mobile Recording** - Direct smartphone audio capture
- **Voice Notes** - Attach audio recordings to claims
- **Translation Support** - EN/FR/ES for Canadian unions

## 📝 Document Annotation

### LRO Private Notes
> "You get something in writing from a member... want to highlight, circle, and make a comment. Not make it visible on the member's side."

- **Track Changes** - Basic revision functionality
- **Private Annotations** - LRO notes invisible to members
- **Highlight & Comment** - Markup tools on member submissions
- **Internal Review** - Workflow for case preparation

## 🔐 Security & Privacy

### Phase 1 Complete ✅
- **AES-256-GCM Encryption** - Sensitive data protection
- **GDPR Compliance** - Right to erasure and data portability
- **Audit Logging** - Comprehensive action tracking
- **Field-level Encryption** - PII protection

### Anonymous Claims
- **Privacy Toggle** - Optional member anonymization
- **Secure Routing** - Claims assigned without exposing identity
- **Data Minimization** - Collect only necessary information

## 📊 Success Metrics (Phase 2 Goals)

### User Adoption
- **80%+ member portal usage** within 30 days
- **90%+ LRO daily active usage** within first week
- **50%+ claims via voice-to-text** within 60 days

### Efficiency Gains
- **60% reduction** in claim submission time
- **40% faster** LRO initial assessment
- **30% reduction** in email volume
- **Zero information loss** during LRO transitions

## 🚧 Implementation Status

```
Phase 1: Security Foundation        ████████████████████ 100% ✅
Phase 2: Claims Management          ░░░░░░░░░░░░░░░░░░░░   0% 🚧
Phase 3: AI Assessment              ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 4: White-label Platform       ░░░░░░░░░░░░░░░░░░░░   0% ⏳
```

## 📋 Next Actions

### Week 1 Priorities (Oct 25 - Nov 1)
- [ ] Set up Azure Speech Services integration
- [ ] Build voice recording interface  
- [ ] Implement real-time transcription
- [ ] Create anonymous submission workflow
- [ ] Add multi-language support (EN/FR/ES)
- [ ] Test mobile responsiveness

### Development Commands
```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Type checking
pnpm type-check
```

## 🎯 Competitive Advantage

### Built by Former LRO
- Deep understanding of union workflows
- Credibility with Labor Relations Officers
- Real-world grievance process experience

### Market Opportunity
- **Target**: National/provincial unions (100-10,000 members)
- **Pricing**: $5-$15 per member/year
- **Competition**: Minimal (most using SharePoint/Excel)
- **Market Size**: Massive untapped potential

---

**Phase 2 Development**: Claims management with voice-to-text accessibility  
**Documentation**: See `PHASE_2_DEVELOPMENT_ROADMAP.md` for detailed implementation plan

---

## 🚀 Recent Updates (Phase 1-3 Implementation)

### ✅ Phase 1: Security Foundation (COMPLETE)

World-class security infrastructure implemented:

- **Encryption**: AES-256-GCM with authentication tags, SHA-256 hashing, PBKDF2 key derivation (100k iterations)
- **Audit Logging**: 21 action types with structured logging and context
- **GDPR Compliance**: Articles 17 & 20 implementation (data export, deletion, anonymization)
- **Input Sanitization**: XSS prevention, SQL injection protection, filename sanitization
- **Rate Limiting**: Login (5/15min), API (100/15min), Upload (10/hour), Export (5/hour)
- **Session Security**: Anomaly detection (location, device, time), 24h absolute / 1h idle timeouts
- **JWT Authentication**: HS256, 15min access tokens, 7-day refresh tokens
- **RBAC Middleware**: 5 roles (member, lro, union_admin, super_admin, developer)
- **PCI DSS Ready**: Payment security configuration
- **Browser-Compatible**: CryptoJS implementation for client-side encryption

**Files Created**:
- `src/services/SecurityService.ts` - Node.js crypto (600+ lines)
- `src/services/BrowserSecurityService.ts` - Browser crypto (450+ lines)
- `src/config/security.config.ts` - Security headers, CORS, rate limits (200+ lines)
- `src/middleware/auth.middleware.ts` - Express middleware (350+ lines)

**Documentation**: See [PHASE_1_SECURITY_COMPLETE.md](./PHASE_1_SECURITY_COMPLETE.md)

### 🚧 Phase 2: Core Integrations (IN PROGRESS)

Enterprise integrations fully implemented, awaiting API key configuration:

- **Stripe** ✅: Payment intents, subscriptions, webhook handling
- **Twilio** ✅: SMS with templates (claim_update, appointment_reminder, urgent_notification)
- **SendGrid** ✅: Transactional email with templates (welcome, claim_submitted, status_update)
- **Sentry** ✅: Error tracking, performance monitoring, user context
- **OpenAI** ✅: GPT-4o-mini claim analysis, embeddings, insights generation

**Files Created**:
- `src/services/IntegrationServices.ts` - All 5 integration services (500+ lines)
- `.env.example` - Complete environment variable template (100+ lines)

**Next Steps**:
1. Copy `.env.example` to `.env`
2. Add API keys (Stripe test keys, OpenAI, Twilio, SendGrid, Sentry)
3. Test each integration
4. Create backend webhook endpoints

**Usage Example**:
```typescript
// Stripe payment
const intent = await stripeService.createPaymentIntent(5000, 'usd', customerId, { claimId: 'CLM-123' });

// AI claim analysis
const analysis = await openAIService.analyzeClaimMerit({
  type: 'Wage Dispute',
  description: 'Unpaid overtime',
  documentation: ['pay_stubs.pdf'],
  precedent: ['Case-2021-045']
});
// Returns: { meritScore: 8.5, confidence: 0.92, factors: [...], recommendations: [...] }
```

### 🚧 Phase 3: Advanced Visualizations (STARTED)

Real Chart.js visualizations with interactive features:

**Implemented Charts**:
1. **Claims Trend** (Line Chart): 7 months data, submitted vs resolved
2. **Claims by Type** (Bar Chart): 8 categories with horizontal bars
3. **Success Rate** (Doughnut Chart): 4 outcomes (resolved, pending, withdrawn, rejected)
4. **Quarterly Distribution** (Pie Chart): Q1-Q4 breakdown

**Features**:
- Date range filtering (7 days, 30 days, 3 months, 6 months, 1 year, all time)
- Category filtering (8 claim types)
- Export buttons (CSV, PDF, Excel) - UI complete, export logic pending
- Responsive grid layout
- Real Chart.js animations and tooltips

**Files Created**:
- `src/pages/AdvancedAnalytics.tsx` - Interactive charts (450+ lines)

**Route**: `/advanced-analytics`

**Next Steps**:
1. Connect charts to real API data (replace mock data)
2. Implement D3.js network graph (claim relationships)
3. Implement D3.js sunburst chart (hierarchical data)
4. Add real-time WebSocket updates
5. Complete export functionality (CSV/PDF/Excel generation)

---

## 📦 New Dependencies (Phase 1-3)

```json
{
  "dependencies": {
    "crypto-js": "^4.2.0",
    "jsonwebtoken": "^9.0.2",
    "chart.js": "^4.5.1",
    "react-chartjs-2": "^5.3.0",
    "d3": "^7.9.0",
    "stripe": "^19.1.0",
    "@stripe/stripe-js": "^8.1.0",
    "twilio": "^5.10.2",
    "@sendgrid/mail": "^8.1.6",
    "@sentry/react": "^10.22.0",
    "openai": "^6.7.0"
  },
  "devDependencies": {
    "@types/crypto-js": "^4.2.2",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/d3": "^7.4.3"
  }
}
```

## 🔐 Environment Setup

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Add required API keys** to `.env`:
   ```env
   # Security
   JWT_SECRET=your-jwt-secret-here
   ENCRYPTION_KEY=your-32-byte-encryption-key-here
   SESSION_SECRET=your-session-secret-here

   # Stripe (use test keys for development)
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # Twilio
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890

   # SendGrid
   SENDGRID_API_KEY=SG.xxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com

   # Sentry
   VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

   # OpenAI
   OPENAI_API_KEY=sk-xxxxx
   OPENAI_ORG_ID=org-xxxxx
   ```

3. **Restart dev server**:
   ```bash
   pnpm dev
   ```

## 📚 Documentation

- [PHASE_1_SECURITY_COMPLETE.md](./PHASE_1_SECURITY_COMPLETE.md) - Security implementation details
- [WORLD_CLASS_IMPLEMENTATION.md](./WORLD_CLASS_IMPLEMENTATION.md) - Full 7-phase roadmap
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Original MVP details

## 🎯 Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Security Foundation (encryption, audit, GDPR, RBAC) |
| Phase 2 | 🚧 In Progress | Core Integrations (Stripe, Twilio, SendGrid, Sentry, OpenAI) |
| Phase 3 | 🚧 Started | Advanced Visualizations (Chart.js complete, D3.js pending) |
| Phase 4 | ⏳ Not Started | AI/ML Features (model training, predictions, pattern detection) |
| Phase 5 | ⏳ Not Started | Document Management (DocuSign, cloud storage, OCR) |
| Phase 6 | ⏳ Not Started | Communication Layer (SMS triggers, email automation, calendar) |
| Phase 7 | ⏳ Not Started | Testing & Optimization (security audit, load testing, e2e tests) |

See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for complete details.
