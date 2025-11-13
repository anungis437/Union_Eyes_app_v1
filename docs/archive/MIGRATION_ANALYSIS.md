# UnionEyes Migration Analysis & Planning

## Executive Summary

**Current State**: union-claims-standalone is a comprehensive monolithic union claims management system with microservices architecture, built on:
- React 18 + TypeScript + Vite frontend
- 14 microservices deployed on Azure Kubernetes Service (AKS)
- Supabase PostgreSQL database
- pnpm workspace with 7 shared packages
- Azure Speech Services for voice-to-text
- OpenAI GPT-4 for AI analysis

**Target State**: Migrate all functionality into UnionEyes (Next.js 14 App Router boilerplate) while maintaining:
- All existing features and functionality
- Microservices architecture
- Database schema and data
- Authentication (transitioning from Clerk)
- UI/UX components

---

## 📊 Current Architecture Analysis

### Frontend Application Structure

#### Main Application (`src/`)
- **Framework**: React 18 with Vite (port 5020)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + custom CSS
- **Components**: 40+ specialized components

**Key Pages:**
- `/dashboard` - Overview metrics and AI insights
- `/claims` - Claims list with filtering
- `/claims/:id` - Detailed claim view
- `/submit` - Voice-enabled claim submission
- `/member` - Member self-service portal
- `/admin` - Union administration panel
- `/settings` - User preferences
- `/grievance` - Grievance management workflow
- `/lro` - Labor Relations Officer workbench
- `/ai-workbench` - AI-powered analysis tools
- `/voting` - Union voting and conventions

**Critical Components:**
```
src/components/
├── AIWorkbenchDashboard.tsx - AI-powered claim analysis
├── ClaimTrackingDashboard.tsx - Real-time claim status
├── EnhancedGrievanceDashboard.tsx - Grievance workflow
├── LRODashboard.tsx - LRO case management
├── VoiceRecorder.tsx - Azure Speech integration
├── UnionChatbot.tsx - AI chatbot interface
├── EmailCampaign.tsx - Union communication tools
├── MemberImport.tsx - Bulk member onboarding
├── charts/ - Data visualization components
├── claims/ - Claims-specific UI components
├── documents/ - Document management
├── health-safety/ - Health & safety tracking
└── tasks/ - Task management components
```

### Microservices Architecture (14 Services)

#### 1. **Auth Service** ✅ Deployed
- JWT-based authentication
- User management
- Role-based access control (RBAC)
- Port: 3001
- Container: `auth-service:latest`

#### 2. **Claims Service** ✅ Deployed
- CRUD operations for claims
- Claims filtering and statistics
- Integration with AI analysis
- Port: 3002
- Endpoints: `/api/claims/*`

#### 3. **Notification Service** ✅ Deployed
- Email/SMS delivery (SendGrid)
- Notification queue management
- Bulk notification support
- Port: 3003
- Endpoints: `/api/notifications/*`

#### 4. **Document Service** ✅ Deployed
- File upload/download
- Document metadata management
- Azure Blob Storage integration
- Port: 3004
- Endpoints: `/api/documents/*`

#### 5. **Voice-to-Text Service**
- Azure Speech Services integration
- Real-time transcription
- Audio file processing
- Legal terminology support
- Speaker diarization
- Directory: `services/voice-to-text/`

#### 6. **Grievance Service**
- Workflow management
- Deadline tracking
- Escalation rules
- Process templates
- Directory: `services/grievance-service/`

#### 7. **AI Service**
- OpenAI GPT-4 integration
- Claim analysis and summarization
- Threshold assessment
- Evidence extraction
- Directory: `services/ai-service/`

#### 8. **Search Service**
- Full-text search
- Document indexing
- Claims search
- Directory: `services/search-service/`

#### 9-14. **Legal Services**
- `business-law-service`
- `employment-law-service`
- `family-law-service`
- `legal-data-service`
- `grievance-management` (legacy)

**Common Microservice Stack:**
```json
{
  "runtime": "Node.js 18 Alpine",
  "framework": "Express.js + TypeScript",
  "database": "PostgreSQL via pg driver",
  "cache": "Redis",
  "registry": "Azure Container Registry",
  "orchestration": "Azure Kubernetes Service (AKS)",
  "load-balancer": "NGINX Ingress Controller",
  "security": "Helmet.js + CORS",
  "health-checks": "Liveness + Readiness probes"
}
```

### Shared Packages (`packages/`)

#### 1. **@courtlens/auth** - Authentication utilities
- Unified auth system
- SSO support
- Session management
- RBAC implementation
- Audit logging

#### 2. **@courtlens/multi-tenant** - Multi-tenancy support
- Tenant isolation
- Data segregation
- Configuration management

#### 3. **@court-lens/supabase** - Database client
- Supabase client wrapper
- Type-safe queries
- Connection pooling

#### 4. **@court-lens/ui** - Shared UI components
- Reusable React components
- Design system
- Tailwind utilities

#### 5. **@court-lens/workflow** - Workflow engine
- Process definitions
- State machines
- Task orchestration

#### 6. **@court-lens/types** - Shared TypeScript types
- Common interfaces
- Domain models
- API contracts

#### 7. **@court-lens/shared** - Utility functions
- Common helpers
- Validators
- Formatters

### Database Architecture

**Primary Database**: Supabase PostgreSQL
- Connection via Drizzle ORM (in UnionEyes)
- Direct pg driver (in microservices)
- Row Level Security (RLS) policies

**Key Tables** (inferred from code):
```sql
-- User & Authentication
- profiles (user profiles, membership tiers)
- pending_profiles (frictionless payment flow)
- auth.users (Supabase auth)

-- Claims Management
- claims (grievances, submissions, status)
- documents (file metadata, Azure Blob refs)
- tasks (assignment, deadlines)
- workflows (process definitions)
- interactions (timeline, communications)

-- Notifications & Audit
- notifications (email/SMS queue)
- audit_logs (security, compliance)
- rate_limits (API throttling)

-- Union-Specific
- members (union membership)
- conventions (voting, proposals)
- health_safety_incidents
- seniority (calculations)
- strategic_files (campaign docs)
```

### Backend Services (`backend/`)

```
backend/
├── config/
│   └── database configuration
├── middleware/
│   ├── authentication
│   ├── authorization
│   └── rate limiting
└── services/
    └── business logic
```

### Infrastructure

**Azure Resources:**
- Azure Kubernetes Service (AKS) - Container orchestration
- Azure Container Registry - Image storage
- Azure Blob Storage - Document storage
- Azure Speech Services - Voice-to-text
- Azure Application Insights - Monitoring (planned)

**Kubernetes Deployments:**
```yaml
# Each service has:
- 2 replicas (high availability)
- CPU: 100-200m requests, 200m limit
- Memory: 128-256Mi requests, 256Mi limit
- ClusterIP service (internal communication)
- Liveness/Readiness probes
- NGINX ingress routing
```

**Monitoring Stack** (from `monitoring/`):
```typescript
- Application Insights integration
- Distributed tracing
- Custom dashboards
- Alerting rules
- Deployment automation
```

---

## 🎯 Key Features to Migrate

### Phase 1: Core Features (Critical Priority)

#### 1. **Claims Management**
- ✅ Claims submission with voice-to-text
- ✅ Real-time claim tracking
- ✅ Document attachment (photos, audio, files)
- ✅ Anonymous submission option
- ✅ Multi-language support (EN/FR/ES)
- ✅ Mobile-first design

#### 2. **Voice-to-Text Integration**
- ✅ Azure Speech Services SDK
- ✅ Real-time transcription
- ✅ Audio file upload & processing
- ✅ Legal terminology recognition
- ✅ Speaker diarization
- ✅ Confidence scoring
- ✅ React components (VoiceRecorder, AudioUploader)

#### 3. **LRO Workbench**
- ✅ Claim queue with priority sorting
- ✅ AI-powered summarization (OpenAI GPT-4)
- ✅ Evidence extraction
- ✅ Document annotation (private notes)
- ✅ Email integration
- ✅ Access delegation

#### 4. **Grievance Process Engine**
- ✅ Configurable workflows
- ✅ Collective agreement linking
- ✅ Deadline tracking & escalation
- ✅ Jurisdictional rules (federal/provincial)
- ✅ Arbitration readiness checklists

#### 5. **Authentication & Security**
- ✅ Clerk authentication (already configured in UnionEyes)
- ✅ AES-256-GCM encryption
- ✅ GDPR compliance (right to erasure, data portability)
- ✅ Audit logging
- ✅ Role-based access control (RBAC)

### Phase 2: Advanced Features (High Priority)

#### 6. **AI-Powered Features**
- ✅ AI Workbench Dashboard
- ✅ Automated claim analysis
- ✅ Threshold assessment
- ✅ Pattern recognition
- ✅ Union chatbot (natural language queries)

#### 7. **Member Portal**
- ✅ Self-service claim submission
- ✅ Real-time status tracking
- ✅ Document repository
- ✅ Communication history
- ✅ Notification preferences

#### 8. **Admin Features**
- ✅ Union administration panel
- ✅ Member import (bulk onboarding)
- ✅ Protocol manager
- ✅ Workflow builder
- ✅ Email campaigns
- ✅ Strategic file manager

#### 9. **Union-Specific Tools**
- ✅ Voting & conventions
- ✅ Health & safety incident tracking
- ✅ Seniority calculator
- ✅ Task management
- ✅ Interactive forms

### Phase 3: Enterprise Features (Medium Priority)

#### 10. **Analytics & Reporting**
- ✅ Enhanced dashboards
- ✅ Trend analysis
- ✅ Performance metrics
- ✅ Custom charts (Chart.js, D3.js)
- ✅ Export capabilities

#### 11. **White-Label Platform**
- ✅ Multi-tenant architecture
- ✅ Custom branding per union
- ✅ Configurable workflows
- ✅ Union-specific settings

#### 12. **Integration & API**
- ✅ RESTful API for all services
- ✅ Webhook support
- ✅ Email integration (Microsoft Graph)
- ✅ Payment processing (Stripe, Whop)
- ✅ Third-party auth (OAuth, SSO)

---

## 🔄 Migration Strategy

### Option 1: Incremental Migration (RECOMMENDED)
**Timeline**: 8-12 weeks  
**Risk**: Low  
**Downtime**: Minimal

**Approach**:
1. **Week 1-2**: Set up Next.js structure
   - Create App Router pages matching React Router routes
   - Set up API routes for backend logic
   - Configure Supabase + Drizzle ORM

2. **Week 3-4**: Migrate core components
   - Convert React components to Next.js App Router
   - Update imports and routing
   - Implement server components where applicable

3. **Week 5-6**: Integrate microservices
   - Keep existing microservices running
   - Create Next.js API routes as proxies
   - Gradually migrate to Next.js API routes

4. **Week 7-8**: Migrate packages
   - Convert workspace packages to Next.js modules
   - Update imports across codebase
   - Test integration points

5. **Week 9-10**: Voice & AI features
   - Integrate Azure Speech Services
   - Connect OpenAI GPT-4
   - Migrate VoiceRecorder component

6. **Week 11-12**: Testing & optimization
   - End-to-end testing
   - Performance optimization
   - Documentation updates

### Option 2: Hybrid Approach (ALTERNATIVE)
**Timeline**: 6-8 weeks  
**Risk**: Medium  
**Downtime**: Minimal

**Approach**:
1. Run UnionEyes (Next.js) as frontend
2. Keep microservices as-is
3. Use Next.js API routes as gateway
4. Gradually migrate services to Next.js

### Option 3: Big Bang Migration (NOT RECOMMENDED)
**Timeline**: 4-6 weeks  
**Risk**: High  
**Downtime**: Significant

---

## 📋 Migration Checklist

### Pre-Migration Tasks
- [ ] Audit current features and functionality
- [ ] Document all API endpoints
- [ ] Map database schema
- [ ] Identify critical dependencies
- [ ] Set up development environment
- [ ] Create migration timeline
- [ ] Establish rollback plan

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Next.js 14 project structure
- [ ] Configure Supabase connection
- [ ] Set up Drizzle ORM
- [ ] Implement authentication (Clerk)
- [ ] Create base layout and navigation
- [ ] Set up environment variables
- [ ] Configure TypeScript paths

### Phase 2: Core Pages (Weeks 3-4)
- [ ] Migrate Dashboard page
- [ ] Migrate Claims pages
- [ ] Migrate Member portal
- [ ] Migrate Admin panel
- [ ] Migrate Settings page
- [ ] Implement routing
- [ ] Add error boundaries

### Phase 3: Components (Weeks 5-6)
- [ ] Migrate UI components
- [ ] Migrate chart components
- [ ] Migrate form components
- [ ] Migrate claims components
- [ ] Migrate document components
- [ ] Update styling (Tailwind + shadcn/ui)
- [ ] Test component library

### Phase 4: Services (Weeks 7-8)
- [ ] Create Next.js API routes
- [ ] Integrate claims service
- [ ] Integrate notification service
- [ ] Integrate document service
- [ ] Integrate auth service
- [ ] Set up API middleware
- [ ] Configure CORS

### Phase 5: Advanced Features (Weeks 9-10)
- [ ] Integrate Azure Speech Services
- [ ] Migrate VoiceRecorder component
- [ ] Integrate OpenAI GPT-4
- [ ] Migrate AI Workbench
- [ ] Migrate chatbot
- [ ] Implement real-time features
- [ ] Add webhook handlers

### Phase 6: Finalization (Weeks 11-12)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Deployment setup
- [ ] Monitoring configuration
- [ ] User acceptance testing

---

## 🚨 Critical Considerations

### 1. **CourtLens Separation** ⚠️ **NEW ISSUE IDENTIFIED**
- union-claims-standalone uses `@courtlens` and `@court-lens` scoped packages (7 packages)
- **Good News**: All Azure resources already UnionEyes branded! ✅
  - Container Registry: `acrunionclaimsdev4x25.azurecr.io` ✅
  - PostgreSQL: `psql-union-claims-dev-4x25.postgres.database.azure.com` ✅
  - AKS Cluster: Union Claims Dev ✅
- **Action Required**: Rebrand packages from `@courtlens/*` to `@unioneyes/*`
- **Timeline**: 1-2 days (automated find/replace + testing)
- **Impact**: Low - Only package names and imports need updating
- **See**: `COURTLENS_SEPARATION_PLAN.md` for detailed strategy

### 2. **Authentication Migration**
- UnionEyes already has Clerk configured ✅
- union-claims-standalone uses custom auth + JWT
- **Decision needed**: Keep Clerk or migrate to Supabase Auth?
- **Impact**: All user sessions, permissions, audit logs

### 3. **Database Compatibility**
- UnionEyes uses Drizzle ORM ✅
- Microservices use direct pg driver
- **Action**: Create Drizzle schema matching existing tables
- **Migration**: Write database migration scripts
- **Existing Database**: Can connect to `psql-union-claims-dev-4x25.postgres.database.azure.com` ✅

### 4. **Microservices Strategy**
- **Option A**: Keep microservices, use Next.js as API gateway
- **Option B**: Migrate to Next.js API routes gradually
- **Option C**: Hybrid (keep complex services, migrate simple ones)
- **Existing Deployments**: 3 services already running on AKS ✅
  - Claims Service (ClusterIP: 10.0.160.191)
  - Notification Service (ClusterIP: 10.0.67.76)
  - Document Service (ClusterIP: 10.0.224.199)

### 5. **Voice-to-Text Integration**
- Azure Speech SDK is client-side JavaScript
- Next.js supports both client and server components
- **Action**: Wrap in "use client" directive
- **Test**: Browser compatibility
- **Azure Resource**: Can use existing Azure Speech Services subscription ✅

### 6. **State Management**
- union-claims-standalone: React Context + local state
- UnionEyes: Can use React Server Components + Server Actions
- **Opportunity**: Reduce client-side JavaScript

### 7. **Styling Consistency**
- union-claims-standalone: Custom CSS + Tailwind
- UnionEyes: Tailwind + shadcn/ui
- **Action**: Map existing designs to shadcn/ui components
- **Review**: Custom union imagery CSS

### 8. **Package Dependencies & Workspace**
- union-claims-standalone: pnpm workspace with 7 packages
- UnionEyes: Needs pnpm workspace setup
- **Action**: Create `pnpm-workspace.yaml` and migrate packages
- **Rebrand**: Convert `@courtlens/*` → `@unioneyes/*`
- **Timeline**: Package migration can happen in Day 1-2 of migration

---

## 📊 Estimated Effort

### Development Time
| Phase | Duration | Resources | Priority |
|-------|----------|-----------|----------|
| Foundation Setup | 2 weeks | 1-2 devs | Critical |
| Core Pages Migration | 2 weeks | 2-3 devs | Critical |
| Component Migration | 2 weeks | 2-3 devs | High |
| Service Integration | 2 weeks | 2 devs | High |
| Advanced Features | 2 weeks | 2 devs | Medium |
| Testing & Launch | 2 weeks | 3 devs + QA | Critical |
| **Total** | **12 weeks** | **2-3 devs** | |

### Risk Assessment
- **Technical Risk**: Medium (proven technologies, clear patterns)
- **Timeline Risk**: Medium (scope is large but well-defined)
- **Resource Risk**: Low (can be done incrementally)
- **User Impact**: Low (minimal downtime with proper planning)

---

## 🎯 Next Steps

### Immediate Actions (Week 1)
1. ✅ Clone boilerplate (DONE)
2. ✅ Rename to UnionEyes (DONE)
3. ✅ Configure Supabase (DONE)
4. ✅ Set up Clerk auth (DONE)
5. ✅ Install dependencies (DONE)
6. ✅ Development server running (DONE)

### This Week (Planning Phase)
1. **Review this analysis document** 📋 YOU ARE HERE
2. **Make key decisions**:
   - Confirm migration strategy (Incremental recommended)
   - Decide on microservices approach
   - Choose authentication strategy
3. **Set up project structure**:
   - Create Next.js pages architecture
   - Set up API routes structure
   - Configure database schema
4. **Start first migration**:
   - Begin with Dashboard page
   - Migrate core components
   - Test deployment

### Decision Points

**We need to decide:**

1. **Migration Strategy**: Incremental (12 weeks) or Hybrid (6-8 weeks)?
2. **Microservices**: Keep all, migrate some, or migrate all to Next.js?
3. **Authentication**: Continue with Clerk or switch to Supabase Auth?
4. **Database**: Create new schema or migrate existing data?
5. **Timeline**: Aggressive (8 weeks) or conservative (12 weeks)?
6. **Resources**: How many developers can work on this?

---

## 📚 References

### Documentation Files
- `README.md` - Main project overview
- `QUICK_START.md` - Development setup
- `PHASE_2_DEVELOPMENT_ROADMAP.md` - Feature roadmap
- `MICROSERVICES_DEPLOYMENT_SUMMARY.md` - Service architecture
- `PHASE_3_WEEK_1_ARCHITECTURE.md` - Enterprise architecture
- `VOICE_TO_TEXT_IMPLEMENTATION.md` - Voice features
- `PRODUCTION_READINESS_REPORT.md` - Deployment status

### Key Directories
- `src/` - React frontend application
- `services/` - 14 microservices
- `packages/` - 7 shared packages
- `backend/` - Backend services and middleware
- `database/` - Database migrations
- `monitoring/` - Application monitoring
- `infrastructure/` - K8s and Terraform configs
- `docs/` - Technical documentation

---

## ✅ Conclusion

The union-claims-standalone application is a **production-ready, enterprise-grade union claims management system** with:
- Comprehensive feature set
- Microservices architecture
- Cloud-native deployment
- Real-time capabilities
- AI/ML integration
- Voice-to-text accessibility

**Migration to UnionEyes is feasible and recommended** using an incremental approach over 12 weeks to ensure:
- Zero data loss
- Minimal downtime
- Thorough testing
- Smooth transition

**The Next.js boilerplate (UnionEyes) provides an excellent foundation** with:
- Modern App Router architecture
- Clerk authentication (already configured)
- Supabase + Drizzle ORM
- shadcn/ui component library
- TypeScript throughout

**This migration will modernize the platform while preserving all existing functionality.**

---

**Ready to proceed with detailed planning?** Let me know your decisions on the key questions above, and we'll create a detailed week-by-week implementation plan! 🚀
