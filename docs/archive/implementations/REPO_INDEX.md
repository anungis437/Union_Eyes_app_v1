# UnionEyes Repository Index

Complete index of the UnionEyes repository structure and key files.

## 📁 Repository Structure

```
Union_Eyes_app_v1/
├── 📂 Root Configuration Files
│   ├── package.json                    # Dependencies and scripts
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── next.config.mjs                 # Next.js configuration
│   ├── tailwind.config.ts              # Tailwind CSS configuration
│   ├── vitest.config.ts                # Vitest test configuration
│   ├── drizzle.config.ts               # Drizzle ORM configuration
│   ├── .env.example                    # Environment variables template
│   └── README.md                       # Main project documentation
│
├── 📂 app/                             # Next.js 14 App Router
│   ├── api/                            # API routes
│   ├── (auth)/                         # Authentication pages
│   ├── (dashboard)/                    # Dashboard pages
│   └── layout.tsx                      # Root layout
│
├── 📂 lib/                             # Core business logic
│   ├── graphql/                        # GraphQL API (NEW)
│   │   ├── schema.ts                   # GraphQL schema definitions
│   │   └── resolvers.ts                # Query/mutation resolvers
│   ├── pension-processors/             # Pension calculation engine (NEW)
│   │   ├── factory.ts                  # Processor factory pattern
│   │   ├── cpp-processor.ts            # Canada Pension Plan
│   │   ├── qpp-processor.ts            # Quebec Pension Plan
│   │   └── otpp-processor.ts           # Ontario Teachers
│   ├── integrations/                   # External integrations (EXPANDED)
│   │   ├── adapters/
│   │   │   └── insurance/              # Insurance provider adapters (NEW)
│   │   │       ├── sunlife-adapter.ts
│   │   │       ├── manulife-adapter.ts
│   │   │       ├── greenshield-adapter.ts  # Green Shield Canada (NEW)
│   │   │       ├── canadalife-adapter.ts    # Canada Life (NEW)
│   │   │       └── ia-adapter.ts            # Industrial Alliance (NEW)
│   │   ├── factory.ts                  # Integration factory
│   │   └── types.ts                    # Integration types
│   ├── payment-processor/              # Payment abstraction layer
│   ├── services/                       # Business services
│   ├── db/                             # Database utilities
│   └── utils/                          # Shared utilities
│
├── 📂 db/                              # Database schema and migrations
│   ├── schema/                         # Drizzle schema definitions
│   │   ├── domains/                    # Domain-organized schemas
│   │   ├── claims-schema.ts
│   │   ├── members-schema.ts
│   │   ├── organizations-schema.ts
│   │   └── ...
│   ├── migrations/                     # Database migrations
│   └── README.md                       # Database documentation
│
├── 📂 components/                      # React components
│   ├── ui/                             # ShadCN UI components
│   ├── claims/                         # Claims management UI
│   ├── members/                        # Member management UI
│   ├── cba/                            # CBA intelligence UI
│   ├── health-safety/                  # Health & safety UI
│   └── federation/                     # Cross-org collaboration UI
│
├── 📂 __tests__/                       # Test suites
│   ├── integration/                    # Integration tests
│   │   ├── graphql-pension-api.test.ts         # GraphQL API tests (NEW)
│   │   ├── insurance-adapters.test.ts          # Insurance adapter tests (NEW)
│   │   └── pension-processors.test.ts
│   ├── performance/                    # Performance benchmarking (NEW)
│   │   ├── performance-utils.ts        # Shared testing utilities
│   │   ├── graphql-api-performance.test.ts
│   │   ├── database-performance.test.ts
│   │   ├── pension-processor-performance.test.ts
│   │   ├── insurance-adapter-performance.test.ts
│   │   ├── concurrent-operations-performance.test.ts
│   │   ├── README.md                   # Performance testing guide
│   │   └── PERFORMANCE_QUICKREF.md     # Quick reference
│   ├── security/                       # Security tests
│   ├── compliance/                     # Compliance tests
│   └── setup.ts                        # Test setup
│
├── 📂 docs/                            # Documentation
│   ├── README.md                       # Documentation index
│   ├── api/                            # API documentation
│   ├── architecture/                   # Architecture diagrams
│   ├── deployment/                     # Deployment guides
│   ├── security/                       # Security documentation
│   ├── compliance/                     # Compliance reports
│   ├── guides/                         # User guides
│   └── releases/                       # Release notes
│
├── 📂 scripts/                         # Automation scripts
│   ├── migration/                      # Database migration scripts
│   ├── deployment/                     # Deployment automation
│   ├── testing/                        # Test utilities
│   ├── docker/                         # Docker scripts
│   └── README.md                       # Scripts documentation
│
├── 📂 backups/                         # Backup files (organized)
│   └── docker/                         # Docker compose backups
│
├── 📂 logs/                            # Application logs (organized)
│   ├── migration-output.log
│   ├── migration-output-fixed.log
│   └── migration-0081-output.log
│
├── 📂 .github/                         # GitHub configuration
│   └── workflows/                      # CI/CD workflows
│
└── 📂 Other Directories
    ├── actions/                        # GitHub Actions
    ├── archive/                        # Archived files
    ├── config/                         # Configuration files
    ├── contexts/                       # React contexts
    ├── emails/                         # Email templates
    ├── i18n/                           # Internationalization
    ├── messages/                       # Message templates
    ├── mobile/                         # Mobile app (future)
    ├── monitoring/                     # Monitoring config
    ├── packages/                       # Monorepo packages
    ├── public/                         # Static assets
    ├── security/                       # Security configs
    ├── services/                       # Microservices
    ├── src/                            # Additional source
    ├── supabase/                       # Supabase config
    ├── terraform/                      # Infrastructure as code
    ├── tools/                          # Development tools
    └── types/                          # TypeScript types
```

## 🔑 Key Documentation Files

### Core Documentation
- [README.md](README.md) - Main project overview
- [SECURITY_WORLD_CLASS_COMPLETE.md](SECURITY_WORLD_CLASS_COMPLETE.md) - Security certification (10/10)
- [API_DOCUMENTATION_SPRINT_COMPLETE.md](API_DOCUMENTATION_SPRINT_COMPLETE.md) - Complete API docs
- [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) - Deployment guide

### Quick References
- [A+_QUICK_REFERENCE.md](A+_QUICK_REFERENCE.md) - Achievement quick reference
- [AUTOMATION_QUICKREF.md](AUTOMATION_QUICKREF.md) - Automation guide
- [CHART_OF_ACCOUNTS_QUICKREF.md](CHART_OF_ACCOUNTS_QUICKREF.md) - Accounting reference
- [DATABASE_INDEX_QUICKREF.md](DATABASE_INDEX_QUICKREF.md) - Database indexes
- [DOCKER_PHASE1_QUICKREF.md](DOCKER_PHASE1_QUICKREF.md) - Docker Phase 1
- [DOCKER_PHASE2_QUICKREF.md](DOCKER_PHASE2_QUICKREF.md) - Docker Phase 2
- [LLM_EXCELLENCE_QUICKREF.md](LLM_EXCELLENCE_QUICKREF.md) - LLM integration
- [QUICK_WINS_QUICKREF.md](QUICK_WINS_QUICKREF.md) - Quick wins guide
- [SCHEMA_DRIFT_QUICKREF.md](SCHEMA_DRIFT_QUICKREF.md) - Schema management
- [__tests__/performance/PERFORMANCE_QUICKREF.md](__tests__/performance/PERFORMANCE_QUICKREF.md) - Performance testing

### Implementation Reports
- [A+_ACHIEVEMENT_IMPLEMENTATION_REPORT.md](A+_ACHIEVEMENT_IMPLEMENTATION_REPORT.md) - A+ achievements
- [BARGAINING_MODULE_IMPLEMENTATION_COMPLETE.md](BARGAINING_MODULE_IMPLEMENTATION_COMPLETE.md) - Bargaining module
- [DOCKER_IMPLEMENTATION_COMPLETE.md](DOCKER_IMPLEMENTATION_COMPLETE.md) - Docker implementation
- [IMPLEMENTATION_COMPLETE_SUMMARY.md](IMPLEMENTATION_COMPLETE_SUMMARY.md) - Overall implementation
- [OPERATIONAL_FINANCE_IMPLEMENTATION.md](OPERATIONAL_FINANCE_IMPLEMENTATION.md) - Financial system
- [SCHEMA_CONSOLIDATION_COMPLETE.md](SCHEMA_CONSOLIDATION_COMPLETE.md) - Schema consolidation

### Performance & Testing
- [__tests__/performance/README.md](__tests__/performance/README.md) - Performance testing guide
- [COVERAGE_GUIDE.md](COVERAGE_GUIDE.md) - Test coverage guide
- [CORRECTED_VALIDATION_REPORT.md](CORRECTED_VALIDATION_REPORT.md) - Validation report

### Database
- [db/README.md](db/README.md) - Database documentation
- [DATABASE_INDEX_ANALYSIS.md](DATABASE_INDEX_ANALYSIS.md) - Index analysis
- [CHART_OF_ACCOUNTS_FIX_GUIDE.md](CHART_OF_ACCOUNTS_FIX_GUIDE.md) - Chart of accounts

### Deployment
- [DEPLOYMENT_READY_SUMMARY.md](DEPLOYMENT_READY_SUMMARY.md) - Deployment readiness
- [STAGING_DEPLOYMENT_CHECKLIST.md](STAGING_DEPLOYMENT_CHECKLIST.md) - Staging checklist

## 🎯 Component Features

### Recent Additions (February 2026)
- ✅ **GraphQL API**: Modern API layer for pension and insurance operations
- ✅ **Pension Processors**: CPP, QPP, OTPP calculation engines
- ✅ **Insurance Integrations**: 5 provider adapters (Sun Life, Manulife, Green Shield, Canada Life, iA)
- ✅ **Performance Testing**: 80+ test cases across all major components

### Production Features
- Claims Management
- Member Management
- CBA Intelligence
- Defensibility Pack System
- Wage Benchmarking
- Visibility Controls
- Financial System
- Cross-Organization Collaboration
- Calendar & Events
- Messages & Notifications
- AI Workbench
- Reports & Analytics
- Document Management
- GDPR Compliance
- E-Signatures
- AI Chatbot with RAG
- Accessibility (WCAG 2.2 AA)
- International Addresses

## 📊 Statistics

- **238** Row-Level Security Policies
- **132** Database Tables
- **80+** Performance Test Cases
- **58/58** Required Tests Passing
- **10/10** Security Rating
- **5** Insurance Provider Integrations
- **3** Pension Processor Types
- **1,500+** Lines of Performance Test Code

## 🔗 Important Links

### Internal
- [Main README](README.md)
- [Documentation Hub](docs/README.md)
- [API Documentation](API_DOCUMENTATION_SPRINT_COMPLETE.md)
- [Database Schema](db/README.md)
- [Performance Tests](__tests__/performance/README.md)
- [Scripts Documentation](scripts/README.md)

### External
- [GitHub Repository](https://github.com/anungis437/Union_Eyes_app_v1)
- [Release Notes](docs/releases/v2.0.0-rc1.md)

## 🗂️ File Organization

### Configuration Files (Root)
- `package.json` - Node.js dependencies and scripts
- `tsconfig.json` - TypeScript compiler options
- `next.config.mjs` - Next.js framework configuration
- `tailwind.config.ts` - Tailwind CSS styling configuration
- `vitest.config.ts` - Vitest testing framework configuration
- `drizzle.config.ts` - Drizzle ORM database configuration
- `eslint.config.mjs` - ESLint code quality rules
- `turbo.json` - Turborepo monorepo configuration
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore patterns
- `.dockerignore` - Docker ignore patterns

### Docker Configuration
- `Dockerfile` - Main production container
- `Dockerfile.optimized` - Optimized production build
- `Dockerfile.simple` - Simple development build
- `Dockerfile.staging` - Staging environment build
- `docker-compose.yml` - Development services
- `docker-compose.prod.yml` - Production services
- `docker-compose.staging.yml` - Staging services
- `docker-compose.blue-green.yml` - Blue-green deployment
- `docker-compose.observability.yml` - Monitoring stack

### Backup Files (Organized)
- `backups/docker/` - Docker compose backup files
- `logs/` - Application and migration logs

### Scripts (Root)
- `create-enums.ps1` - Database enum creation
- `deploy-v2.ps1` - Deployment automation v2
- `sync-drizzle-database.ps1` - Database sync
- `sync-drizzle-journal.ps1` - Migration journal sync
- `run-k6-tests.ps1` - Load testing with k6

## 📝 Notes

- **Clean Repository**: Backup files moved to `backups/`, logs to `logs/`, old scripts archived
- **Up-to-date Documentation**: READMEs reflect latest features and architecture
- **Comprehensive Indexing**: This file provides complete repository navigation
- **Recent Updates**: GraphQL API, Pension Processors, Insurance Adapters, Performance Testing Suite

---

*Last Updated: February 12, 2026*
*Version: v2.0.0-rc1*
