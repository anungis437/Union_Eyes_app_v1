# Q1 2025 Advanced Analytics - Schema Corrections Applied

## Overview

Successfully migrated Q1 2025 Advanced Analytics from Supabase-designed schema to Azure PostgreSQL + Clerk authentication.

---

## Issues Encountered

### 1. Missing Users Table

**Error**: `ERROR: relation "users" does not exist`

**Original Code**:

```sql
created_by UUID NOT NULL REFERENCES users(id)
acknowledged_by UUID REFERENCES users(id)
```

**Issue**: Original migration assumed Supabase `auth.users` table exists. Azure PostgreSQL with Clerk doesn't have this table.

**Fix**: Changed to TEXT columns storing Clerk user IDs

```sql
created_by TEXT NOT NULL, -- Clerk user ID (e.g., user_2NlrrNcfTv0DMh2kzBHyXZRtpb)
acknowledged_by TEXT, -- Clerk user ID
```

---

### 2. Missing Auth Schema

**Error**: `ERROR: schema "auth" does not exist`

**Original Code**:

```sql
WHERE user_id = auth.uid()
```

**Issue**: Supabase's `auth.uid()` function doesn't exist in Azure PostgreSQL.

**Fix**: Used session variable approach

```sql
WHERE user_id = current_setting('app.current_user_id', TRUE)
```

---

### 3. Wrong Column Name in RLS

**Error**: `ERROR: column "clerk_user_id" does not exist`

**Original Code (First Correction Attempt)**:

```sql
SELECT organization_id FROM organization_members 
WHERE clerk_user_id = current_setting('app.current_user_id', TRUE)
```

**Issue**: Assumed column was named `clerk_user_id`, but actual column is `user_id`.

**Fix**: Used correct column name

```sql
SELECT organization_id FROM organization_members 
WHERE user_id = current_setting('app.current_user_id', TRUE)
```

**Schema Discovery**:

```sql
\d organization_members
-- Found: user_id | text | not null
```

---

### 4. Type Mismatch in Organization ID

**Error**: `ERROR: operator does not exist: uuid = text`

**Original Code (Second Correction Attempt)**:

```sql
WHERE organization_id IN (
  SELECT organization_id FROM organization_members
)
```

**Issue**:

- `kpi_configurations.organization_id` is UUID
- `organization_members.organization_id` is TEXT (UUID string)
- PostgreSQL won't auto-cast between UUID and TEXT

**Fix**: Added explicit type cast

```sql
WHERE organization_id::text IN (
  SELECT organization_id FROM organization_members
)
```

---

### 5. Invalid Role Value

**Error**: `ERROR: invalid input value for enum member_role: "manager"`

**Original Code**:

```sql
WHERE om.role IN ('admin', 'manager')
```

**Issue**: The `member_role` enum doesn't have 'manager' value.

**Schema Discovery**:

```sql
SELECT unnest(enum_range(NULL::member_role));
-- Results: member, steward, officer, admin
```

**Fix**: Used 'officer' instead of 'manager'

```sql
WHERE om.role IN ('admin', 'officer')
```

---

### 6. Missing Supabase Roles

**Error**: `ERROR: role "authenticated" does not exist`

**Original Code**:

```sql
GRANT SELECT ON analytics_metrics TO authenticated;
GRANT ALL ON analytics_metrics TO service_role;
```

**Issue**: Supabase-specific roles don't exist in Azure PostgreSQL.

**Fix**: Removed grant statements (using RLS policies instead)

---

## Migration Files Created

### 1. Original Migration (Failed)

**File**: `db/migrations/067_advanced_analytics_q1_2025.sql` (461 lines)

- Designed for Supabase
- Created 3 of 6 tables (analytics_metrics, ml_predictions, trend_analyses)
- Failed on kpi_configurations, insight_recommendations, comparative_analyses
- All RLS policies failed

### 2. Azure/Clerk Migration (Partial Success)

**File**: `db/migrations/067_advanced_analytics_q1_2025_azure.sql` (301 lines)

- Fixed user references (UUID → TEXT)
- Fixed auth schema references (auth.uid() → session variables)
- Created all 6 tables successfully
- All RLS policies failed (wrong column name)

### 3. RLS Policies Fix (Success)

**File**: `db/migrations/067_advanced_analytics_rls_fix.sql` (139 lines)

- Fixed column name (clerk_user_id → user_id)
- Fixed type casting (added organization_id::text)
- Fixed role values (manager → officer)
- All 11 RLS policies created successfully

---

## Final Database Schema

### Tables Created (6 total)

1. **analytics_metrics**
   - Time-series metrics storage
   - 3 indexes, 4 comments
   - Created in first migration attempt

2. **ml_predictions**
   - ML model predictions and forecasts
   - 2 indexes, 3 comments
   - Created in first migration attempt

3. **trend_analyses**
   - Trend detection results
   - 2 indexes, 3 comments
   - Created in first migration attempt

4. **kpi_configurations**
   - Custom KPI definitions
   - 3 indexes, 5 comments
   - 4 RLS policies (view, create, update, delete)
   - Created in second migration attempt

5. **insight_recommendations**
   - AI-generated insights
   - 5 indexes, 7 comments
   - 3 RLS policies (view, system insert, update)
   - Created in second migration attempt

6. **comparative_analyses**
   - Peer and industry benchmarking
   - 4 indexes, 4 comments
   - 4 RLS policies (view, create, update, delete)
   - Created in second migration attempt

### RLS Policies Applied (11 total)

**KPI Configurations** (4 policies):

1. ✅ Users can view KPIs for their organization
2. ✅ Admins and officers can create KPIs
3. ✅ Admins and officers can update KPIs
4. ✅ Admins can delete KPIs

**Insight Recommendations** (3 policies):
5. ✅ Users can view insights for their organization
6. ✅ System can insert insights (cron job)
7. ✅ Users can update insights (acknowledge/dismiss)

**Comparative Analyses** (4 policies):
8. ✅ Users can view comparative analyses for their organization
9. ✅ Admins and officers can create comparative analyses
10. ✅ Creators can update their comparative analyses
11. ✅ Admins can delete comparative analyses

---

## Key Learnings

### Schema Compatibility

- Always check existing schema before assuming table/column names
- Query `\d table_name` to see actual structure
- Query `SELECT unnest(enum_range(NULL::enum_type))` for enum values
- Check data types carefully (UUID vs TEXT, etc.)

### Type Casting

- PostgreSQL won't auto-cast between UUID and TEXT in comparisons
- Use `::text` or `::uuid` for explicit casting
- Be consistent with type usage across foreign keys

### Authentication Models

- Supabase: Built-in `auth.users` table, `auth.uid()` function
- Clerk: External authentication, user IDs stored as TEXT in application tables
- Use session variables for user context in RLS policies

### RLS Best Practices

- Test RLS policies with actual user context
- Use `current_setting('app.current_user_id', TRUE)` for user ID
- Add status checks (`status = 'active'`) to prevent deleted user access
- Use role-based checks for admin/officer permissions

---

## Verification Commands

```bash
# List all analytics tables
psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%analytic%' OR table_name LIKE '%kpi%' OR table_name LIKE '%insight%' OR table_name LIKE '%comparative%' OR table_name = 'ml_predictions' OR table_name = 'trend_analyses') ORDER BY table_name;"

# List all RLS policies
psql -c "SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('kpi_configurations', 'insight_recommendations', 'comparative_analyses') ORDER BY tablename, policyname;"

# Check table structure
psql -c "\d kpi_configurations"
psql -c "\d insight_recommendations"
psql -c "\d comparative_analyses"
```

---

## Status: ✅ COMPLETE

All database schema corrections applied successfully. System ready for testing.

**Next Steps**:

1. Test API endpoints
2. Test cron job
3. Test UI components
4. Deploy to production
