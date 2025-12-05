# Scripts Directory

This directory contains all utility scripts organized by purpose.

## Directory Structure

### `/database`
Database inspection, validation, and schema management scripts:
- `add-clause-history-column.ts` - Add clause history tracking
- `check-columns.ts` - Column verification
- `check-enums.ts` - Enum type validation
- `check-migration-status.ts` - Migration status checker
- `check-organizations-schema.ts` - Organization schema validation
- `check-pension-objects.ts` - Pension objects verification
- `cleanup-pension.ts` - Pension data cleanup
- `drop-045-tables.ts` - Drop specific migration tables
- `drop-functions.ts` - Database function cleanup
- `find-error-line.ts` - Error line finder
- `get-full-schema.ts` - Full schema extraction
- `PHASE_1_3_VALIDATION_SUITE.sql` - Phase 1-3 validation SQL
- `test-data-insert.sql` - Test data insertion
- `validate-database-schema.ts` - Schema validation
- `VALIDATION_TEST_SUITE.sql` - Comprehensive validation suite

### `/migration`
Database migration and data transformation scripts:
- `apply-cba-migration.ps1` - CBA migration application
- `fix-relations.ps1` - Relationship fixes
- `fix-rls-policies.ts` - Row-level security policy fixes
- `run-full-migration.ts` - Full migration runner
- `run-jurisdiction-migrations.ts` - Jurisdiction-specific migrations
- `run-migrations.ts` - Standard migration runner
- `run-phase1-3-migrations.ts` - Phase 1-3 migration runner
- `run-phase5a-migrations.js` - Phase 5A migration runner
- `run-sql-script.js` - SQL script executor

### `/testing`
Testing utilities and verification scripts:
- `check-org-members.js` - Organization member verification
- `check-tables.js` - Table structure verification
- `check-tenants-table.js` - Tenant table validation
- `test-ai-endpoints.html` - AI endpoint testing UI
- `test-ai-endpoints.ts` - AI endpoint testing script
- `test-database-connection.ts` - Database connectivity test
- `test-email-config.js` - Email configuration test
- `test-enum.ts` - Enum testing
- `test-partial-047.ts` - Partial migration test
- `test-phase-5a-api.ts` - Phase 5A API testing
- `test-rls-isolation.js` - RLS isolation testing
- `verify-user-access.js` - User access verification

### `/setup`
Environment setup and configuration scripts:
- `cleanup-docs-simple.ps1` - Simple documentation cleanup
- `cleanup-docs.ps1` - Full documentation cleanup
- `fix-i18n-routing.ps1` - i18n routing fixes
- `rebrand-packages.ps1` - Package rebranding utility
- `setup-financial-service.ps1` - Financial service setup
- `stop-windows-redis.ps1` - Redis stop utility

## Usage Examples

### Running Database Migrations
```bash
# Run all migrations
tsx scripts/migration/run-full-migration.ts

# Run phase-specific migrations
tsx scripts/migration/run-phase1-3-migrations.ts
```

### Testing
```bash
# Test database connection
tsx scripts/testing/test-database-connection.ts

# Test RLS isolation
node scripts/testing/test-rls-isolation.js

# Test AI endpoints
tsx scripts/testing/test-ai-endpoints.ts
```

### Database Validation
```bash
# Validate full schema
tsx scripts/database/validate-database-schema.ts

# Check migration status
tsx scripts/database/check-migration-status.ts

# Get full schema
tsx scripts/database/get-full-schema.ts
```

### Setup
```bash
# Setup financial service
.\scripts\setup\setup-financial-service.ps1

# Rebrand packages
.\scripts\setup\rebrand-packages.ps1
```

## Script Development Guidelines

1. **TypeScript Scripts**: Use `.ts` extension, run with `tsx`
2. **JavaScript Scripts**: Use `.js` extension, run with `node`
3. **PowerShell Scripts**: Use `.ps1` extension
4. **Error Handling**: All scripts should have proper error handling
5. **Logging**: Use structured logging for production scripts
6. **Documentation**: Include comments explaining script purpose

---

*Last Updated: November 2025*
