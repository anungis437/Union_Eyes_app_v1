# Database Migration Status

## Applied Migrations

### Core Migrations (0000-0061)
- **0000-0006**: Initial schema and phase migrations
- **0051-0054**: RLS (Row-Level Security) policies for messaging, notifications, reports, calendar
- **0055**: User ID alignment to Clerk authentication
- **0056**: Foreign key constraints
- **0057**: Training views recreation
- **0058**: World-class RLS policies
- **0059**: User ID conversion series (B, C, D, E, F)
- **0060**: Visibility scopes (dual-surface enforcement)
- **0061**: Defensibility packs (system-of-record exports)

### Manual Migrations
Located in `db/migrations/manual/`:

#### Recently Applied (February 2026)
- **apply_0060_0061_consolidated.sql** - Consolidated migration for 0060 + 0061 (idempotent)
- **0062_add_wage_benchmarks_only.sql** - Wage benchmarks tables (Statistics Canada integration)

#### Historical Manual Migrations
- 053-058: RLS policies and system features
- 067-069: Advanced analytics, encrypted PII, feature flags
- Various feature-specific migrations

## Active Migration Scripts

### PowerShell Scripts (`scripts/`)
- **apply-migrations-now.ps1** - Apply migrations 0060 & 0061 (visibility scopes + defensibility packs)
- **apply-wage-benchmarks.ps1** - Apply migration 0062 (wage benchmarks tables)
- **apply-auth-wrappers.ps1** - Authentication wrapper utilities

### TypeScript Utilities (`scripts/`)
- Various database management and seeding scripts
- Migration CLI tools
- Validation and verification utilities

## Database Schema Status

### Tables Added (Recent Migrations)

#### Migration 0060: Visibility Scopes
- Added `visibility_scope` enum (member, staff, admin, system)
- Modified `claim_updates` table (added visibility_scope column)
- Modified `grievance_transitions` table (added visibility_scope column)

#### Migration 0061: Defensibility Packs
- `defensibility_packs` - Tamper-proof arbitration exports with SHA-256 integrity
- `pack_download_log` - Audit trail of pack access
- `pack_verification_log` - Tamper detection history

#### Migration 0062: Wage Benchmarks
- `wage_benchmarks` - Statistics Canada wage data by occupation (NOC codes)
- `union_density` - Union membership rates by sector/region
- `cost_of_living_data` - CPI and inflation for COLA calculations
- `contribution_rates` - Employer contribution rates (EI, CPP, etc.)
- `external_data_sync_log` - External API synchronization tracking

## Migration Execution

### Recent Activity (February 9, 2026)
1. ✅ Generated and applied migration 0060 (visibility scopes)
2. ✅ Generated and applied migration 0061 (defensibility packs)
3. ✅ Generated wage_benchmarks schema via drizzle-kit
4. ✅ Created manual migration 0062 (cleaned version without duplicate enums)
5. ✅ Applied all migrations to staging database
6. ✅ Verified all tables created successfully

### Verification Commands
```powershell
# Verify migrations 0060 & 0061
.\scripts\apply-migrations-now.ps1

# Verify migration 0062
.\scripts\apply-wage-benchmarks.ps1

# Quick database check
psql -h <HOST> -U <USER> -d <DB> -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('defensibility_packs', 'wage_benchmarks') ORDER BY tablename;"
```

## Dependencies Added

### npm Packages
- **ioredis** v5.4.1 - Redis client for caching and session management

## Next Steps

1. **Production Migration**: Apply migrations 0060, 0061, 0062 to production database
2. **Data Integration**: Set up Statistics Canada API sync for wage_benchmarks
3. **Testing**: Validate defensibility pack generation and verification
4. **Documentation**: Update API docs for new visibility scope filtering

## Notes

- All migrations are idempotent and safe to re-run
- Manual migrations in `db/migrations/manual/` use `CREATE TABLE IF NOT EXISTS`
- RLS policies protect all new tables based on user roles
- Wage benchmarks include 16 composite indexes for query performance
- Defensibility packs use SHA-256 hashing for integrity verification
