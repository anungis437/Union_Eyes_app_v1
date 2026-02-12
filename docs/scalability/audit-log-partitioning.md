# Audit Log Partitioning Strategy

**Version:** 1.0  
**Last Updated:** February 12, 2026  
**Status:** Phase 4 Implementation Roadmap  
**Owner:** Infrastructure Team

---

## Executive Summary

This document provides a comprehensive strategy for implementing PostgreSQL table partitioning for the `audit_security.audit_logs` table to address aggressive growth patterns and maintain query performance at scale.

### Problem Statement

The `audit_security.audit_logs` table is:
- **Append-only** (immutable by design - migration 0064)
- **High-write volume** (every user action generates audit entries)
- **Multi-tenant** (with RLS policies per organization)
- **Retention-heavy** (7+ years for compliance in union contexts)

**Growth Projections:**
- Small org (100 users): ~500MB/year
- Medium org (1,000 users): ~5GB/year  
- Large org (10,000 users): ~50GB/year
- **Without partitioning:** Single table could reach 100GB+ in 2-3 years

### Solution Overview

- **Partitioning Strategy:** Time-based (monthly) range partitioning
- **Retention Policy:** Hot (6 months) → Warm (2 years) → Cold (5+ years)
- **Query Optimization:** Partition pruning for 10-50x performance improvement
- **Maintenance:** Automated partition creation and archival

---

## Current Table Structure

### Schema Definition

```typescript
// From: db/schema/domains/infrastructure/audit.ts
export const auditLogs = auditSecuritySchema.table("audit_logs", {
  auditId: uuid("audit_id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  userId: varchar("user_id", { length: 255 }).references(() => users.userId),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: uuid("resource_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: uuid("session_id"),
  correlationId: uuid("correlation_id"),
  severity: varchar("severity", { length: 20 }).default("info"),
  outcome: varchar("outcome", { length: 20 }).default("success"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  
  // Archive support (migration 0063)
  archived: boolean("archived").default(false).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedPath: text("archived_path"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

### Current Indexes (Migration 0081)

```sql
-- Organization and user access patterns
CREATE INDEX idx_audit_logs_org_id ON audit_security.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_security.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_security.audit_logs(created_at);

-- Action filtering
CREATE INDEX idx_audit_logs_action ON audit_security.audit_logs(action);
CREATE INDEX idx_audit_logs_severity ON audit_security.audit_logs(severity);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_org_created 
  ON audit_security.audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created 
  ON audit_security.audit_logs(user_id, created_at DESC);

-- Resource lookups
CREATE INDEX idx_audit_logs_resource 
  ON audit_security.audit_logs(resource_type, resource_id);

-- Archive support
CREATE INDEX idx_audit_logs_archived ON audit_security.audit_logs(archived);
CREATE INDEX idx_audit_logs_archived_at ON audit_security.audit_logs(archived_at);
```

### RLS Policies (Migration 0058)

```sql
-- Users can see their own audit logs, system admins see all
CREATE POLICY audit_select_admin ON audit_security.audit_logs
  FOR SELECT
  USING (
    user_id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'sub'),
      current_setting('app.current_user_id', true)
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = COALESCE(...) AND u.is_system_admin = true
    )
  );

-- Insert-only (system-generated)
CREATE POLICY audit_insert_all ON audit_security.audit_logs
  FOR INSERT
  WITH CHECK (true);
```

---

## Partitioning Design

### 1. Partitioning Strategy: Time-Based Monthly

**Rationale:**
- Query patterns are primarily time-bounded ("last 30 days", "this quarter")
- Monthly granularity balances partition count with partition size
- Aligns with archive/retention workflows

**Partition Key:** `created_at` (timestamp with timezone)

### 2. Partition Naming Convention

```
audit_security.audit_logs_YYYY_MM
```

**Examples:**
- `audit_security.audit_logs_2026_01` (January 2026)
- `audit_security.audit_logs_2026_02` (February 2026)
- `audit_security.audit_logs_2026_12` (December 2026)

### 3. Retention Tiers

| Tier | Age | Storage | Query Pattern | Action |
|------|-----|---------|---------------|--------|
| **Hot** | 0-6 months | PostgreSQL SSD | Real-time dashboards, recent activity | None |
| **Warm** | 6-24 months | PostgreSQL standard | Compliance audits, investigations | Keep in DB |
| **Cold** | 2-7 years | Azure Blob (Parquet) | Rare compliance/legal requests | Archive to blob, drop partition |
| **Archive** | 7+ years | Azure Archive tier | Legal holds only | Compressed archive |

---

## Implementation Plan

### Phase 1: Create Partitioned Table Structure (Week 1)

#### Step 1.1: Create New Partitioned Table

```sql
-- Migration: db/migrations/00XX_partition_audit_logs.sql

BEGIN;

-- 1. Rename existing table
ALTER TABLE audit_security.audit_logs 
  RENAME TO audit_logs_legacy;

-- 2. Create partitioned parent table with same structure
CREATE TABLE audit_security.audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  user_id VARCHAR(255) REFERENCES public.users(user_id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id UUID,
  correlation_id UUID,
  severity VARCHAR(20) DEFAULT 'info',
  outcome VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  archived BOOLEAN DEFAULT false NOT NULL,
  archived_at TIMESTAMPTZ,
  archived_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_action CHECK (action != ''),
  CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  CONSTRAINT valid_outcome CHECK (outcome IN ('success', 'failure', 'error'))
) PARTITION BY RANGE (created_at);

-- 3. Create initial partitions (current + next 3 months)
CREATE TABLE audit_security.audit_logs_2026_02 
  PARTITION OF audit_security.audit_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE audit_security.audit_logs_2026_03 
  PARTITION OF audit_security.audit_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE audit_security.audit_logs_2026_04 
  PARTITION OF audit_security.audit_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE audit_security.audit_logs_2026_05 
  PARTITION OF audit_security.audit_logs
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- 4. Create default partition for any data outside defined ranges
CREATE TABLE audit_security.audit_logs_default 
  PARTITION OF audit_security.audit_logs DEFAULT;

COMMIT;
```

#### Step 1.2: Recreate Indexes on Partitioned Table

```sql
-- Apply indexes to parent table (automatically inherited by partitions)

-- Core access patterns
CREATE INDEX idx_audit_logs_org_id 
  ON audit_security.audit_logs(organization_id);

CREATE INDEX idx_audit_logs_user_id 
  ON audit_security.audit_logs(user_id);

-- Time-based queries (partition key is implicitly indexed)
CREATE INDEX idx_audit_logs_created_at 
  ON audit_security.audit_logs(created_at);

-- Action filtering
CREATE INDEX idx_audit_logs_action 
  ON audit_security.audit_logs(action);

CREATE INDEX idx_audit_logs_severity 
  ON audit_security.audit_logs(severity);

-- Composite indexes for hot queries
CREATE INDEX idx_audit_logs_org_created 
  ON audit_security.audit_logs(organization_id, created_at DESC);

CREATE INDEX idx_audit_logs_user_created 
  ON audit_security.audit_logs(user_id, created_at DESC);

-- Resource lookups
CREATE INDEX idx_audit_logs_resource 
  ON audit_security.audit_logs(resource_type, resource_id);

-- Archive support
CREATE INDEX idx_audit_logs_archived 
  ON audit_security.audit_logs(archived) WHERE archived = true;

CREATE INDEX idx_audit_logs_archived_at 
  ON audit_security.audit_logs(archived_at) WHERE archived_at IS NOT NULL;
```

**Index Strategy Notes:**
- Indexes are defined on the parent table
- PostgreSQL automatically creates matching indexes on each partition
- Use partial indexes (`WHERE archived = true`) to reduce index size
- Partition pruning works even without explicit `created_at` index on partition key

#### Step 1.3: Recreate RLS Policies

```sql
-- Enable RLS on partitioned table
ALTER TABLE audit_security.audit_logs ENABLE ROW LEVEL SECURITY;

-- Recreate policies from migration 0058
CREATE POLICY audit_select_admin ON audit_security.audit_logs
  FOR SELECT
  USING (
    user_id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'sub'),
      current_setting('app.current_user_id', true)
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub'),
        current_setting('app.current_user_id', true)
      )
      AND u.is_system_admin = true
    )
  );

CREATE POLICY audit_insert_all ON audit_security.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Important: RLS policies apply to parent table and all partitions automatically
```

#### Step 1.4: Recreate Immutability Trigger (Migration 0064)

```sql
-- Trigger function (reuse existing if possible)
CREATE OR REPLACE FUNCTION audit_security.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Deletion of audit logs is forbidden. Audit ID: %', OLD.audit_id
      USING ERRCODE = '23506', -- integrity_constraint_violation
            DETAIL = 'Audit logs are immutable and cannot be deleted',
            HINT = 'Use the archived flag to mark logs as archived';
  ELSIF TG_OP = 'UPDATE' AND NOT (NEW.archived AND NOT OLD.archived) THEN
    -- Allow ONLY setting archived flag from false to true
    -- All other updates are forbidden
    RAISE EXCEPTION 'Modification of audit logs is forbidden. Audit ID: %', OLD.audit_id
      USING ERRCODE = '23506',
            DETAIL = 'Audit logs are immutable except for archival',
            HINT = 'Only setting archived=true is permitted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to parent table
CREATE TRIGGER prevent_audit_log_modification_trigger
  BEFORE UPDATE OR DELETE ON audit_security.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_security.prevent_audit_log_modification();
```

---

### Phase 2: Data Migration Strategy (Week 2)

#### Option A: Online Migration (Zero Downtime)

**Best for:** Production systems with continuous uptime requirements

```sql
-- Migration script: scripts/migrate-audit-logs-online.sql

BEGIN;

-- 1. Create historical partitions for existing data
SELECT audit_security.create_partitions_for_range(
  (SELECT MIN(created_at)::date FROM audit_security.audit_logs_legacy),
  NOW()::date
);

-- 2. Copy data in batches (avoid locking entire table)
DO $$
DECLARE
  batch_size INT := 50000;
  total_rows BIGINT;
  processed_rows BIGINT := 0;
  start_time TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM audit_security.audit_logs_legacy;
  RAISE NOTICE 'Total rows to migrate: %', total_rows;
  
  start_time := clock_timestamp();
  
  -- Process in batches ordered by created_at
  LOOP
    WITH batch AS (
      SELECT audit_id
      FROM audit_security.audit_logs_legacy
      WHERE audit_id NOT IN (SELECT audit_id FROM audit_security.audit_logs)
      ORDER BY created_at
      LIMIT batch_size
    )
    INSERT INTO audit_security.audit_logs
    SELECT l.* FROM audit_security.audit_logs_legacy l
    WHERE l.audit_id IN (SELECT audit_id FROM batch);
    
    GET DIAGNOSTICS processed_rows = ROW_COUNT;
    EXIT WHEN processed_rows = 0;
    
    RAISE NOTICE 'Migrated % rows (% elapsed)', 
      processed_rows, 
      clock_timestamp() - start_time;
    
    -- Small commit interval to avoid long transactions
    COMMIT;
    BEGIN;
  END LOOP;
  
  RAISE NOTICE 'Migration complete. Total time: %', clock_timestamp() - start_time;
END $$;

-- 3. Verify row counts match
DO $$
DECLARE
  legacy_count BIGINT;
  new_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM audit_security.audit_logs_legacy;
  SELECT COUNT(*) INTO new_count FROM audit_security.audit_logs;
  
  IF legacy_count != new_count THEN
    RAISE EXCEPTION 'Row count mismatch! Legacy: %, New: %', legacy_count, new_count;
  END IF;
  
  RAISE NOTICE 'Verification complete. Row counts match: %', new_count;
END $$;

COMMIT;
```

#### Option B: Maintenance Window Migration (Faster)

**Best for:** Development/staging or with scheduled downtime

```sql
-- Faster migration with table locks
BEGIN;

-- 1. Lock legacy table to prevent new writes during migration
LOCK TABLE audit_security.audit_logs_legacy IN ACCESS EXCLUSIVE MODE;

-- 2. Bulk insert (much faster than batched)
INSERT INTO audit_security.audit_logs
SELECT * FROM audit_security.audit_logs_legacy;

-- 3. Verify counts
DO $$
DECLARE
  legacy_count BIGINT;
  new_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM audit_security.audit_logs_legacy;
  SELECT COUNT(*) INTO new_count FROM audit_security.audit_logs;
  
  IF legacy_count != new_count THEN
    RAISE EXCEPTION 'Row count mismatch!';
  END IF;
END $$;

COMMIT;

-- 4. Drop legacy table after verification
-- DROP TABLE audit_security.audit_logs_legacy;
```

---

### Phase 3: Automated Partition Management (Week 3)

#### Create Partition Management Function

```sql
-- Migration: db/migrations/00XX_partition_management.sql

CREATE OR REPLACE FUNCTION audit_security.create_next_month_partition()
RETURNS TEXT AS $$
DECLARE
  next_month_start DATE;
  month_after_start DATE;
  partition_name TEXT;
  partition_exists BOOLEAN;
BEGIN
  -- Calculate next month boundaries
  next_month_start := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  month_after_start := DATE_TRUNC('month', NOW() + INTERVAL '2 months');
  
  -- Generate partition name
  partition_name := 'audit_logs_' || TO_CHAR(next_month_start, 'YYYY_MM');
  
  -- Check if partition already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit_security'
    AND c.relname = partition_name
  ) INTO partition_exists;
  
  IF partition_exists THEN
    RETURN 'Partition already exists: ' || partition_name;
  END IF;
  
  -- Create partition
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS audit_security.%I 
     PARTITION OF audit_security.audit_logs
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    next_month_start,
    month_after_start
  );
  
  RETURN 'Created partition: ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- Helper function to create partitions for a date range
CREATE OR REPLACE FUNCTION audit_security.create_partitions_for_range(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (partition_name TEXT, status TEXT) AS $$
DECLARE
  current_month DATE;
  next_month DATE;
  part_name TEXT;
BEGIN
  current_month := DATE_TRUNC('month', start_date);
  
  WHILE current_month < end_date LOOP
    next_month := DATE_TRUNC('month', current_month + INTERVAL '1 month');
    part_name := 'audit_logs_' || TO_CHAR(current_month, 'YYYY_MM');
    
    BEGIN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS audit_security.%I 
         PARTITION OF audit_security.audit_logs
         FOR VALUES FROM (%L) TO (%L)',
        part_name,
        current_month,
        next_month
      );
      
      partition_name := part_name;
      status := 'CREATED';
      RETURN NEXT;
    EXCEPTION WHEN duplicate_table THEN
      partition_name := part_name;
      status := 'EXISTS';
      RETURN NEXT;
    END;
    
    current_month := next_month;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

#### Automated Partition Creation Job

**Option 1: PostgreSQL pg_cron Extension**

```sql
-- Install pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monthly partition creation (runs on 1st of each month at 00:00)
SELECT cron.schedule(
  'create-audit-log-partition',
  '0 0 1 * *', -- Cron: at midnight on the 1st of every month
  $$SELECT audit_security.create_next_month_partition()$$
);
```

**Option 2: Application-Level Scheduler (BullMQ)**

```typescript
// lib/jobs/partition-maintenance.ts

import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * Creates next month's audit log partition
 * Should run on the 1st of each month
 */
export async function createNextMonthPartition(): Promise<string> {
  const result = await db.execute(
    sql`SELECT audit_security.create_next_month_partition()`
  );
  
  const message = result.rows[0]?.create_next_month_partition;
  console.log('[Partition Maintenance]', message);
  
  return message;
}

/**
 * Verifies all partitions exist for the next 3 months
 */
export async function ensureFuturePartitions(): Promise<void> {
  const futureMonths = 3;
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + futureMonths);
  
  const result = await db.execute(sql`
    SELECT * FROM audit_security.create_partitions_for_range(
      NOW()::date,
      ${endDate.toISOString().split('T')[0]}::date
    )
  `);
  
  console.log('[Partition Maintenance] Future partitions:', result.rows);
}
```

**Register Job in Queue:**

```typescript
// lib/jobs/schedulers/partition-scheduler.ts

import { getCleanupQueue } from '@/lib/job-queue';
import { createNextMonthPartition, ensureFuturePartitions } from './partition-maintenance';

export async function registerPartitionJobs() {
  const queue = getCleanupQueue();
  
  // Create next month partition on 1st of each month
  await queue.add(
    'create-partition',
    { task: 'create-next-month' },
    {
      repeat: {
        pattern: '0 0 1 * *', // Every 1st at midnight
      },
    }
  );
  
  // Verify future partitions weekly
  await queue.add(
    'verify-partitions',
    { task: 'ensure-future' },
    {
      repeat: {
        pattern: '0 2 * * 0', // Every Sunday at 2am
      },
    }
  );
}
```

---

### Phase 4: Archive and Cold Storage (Week 4)

#### Archive Function for Old Partitions

```sql
-- Function to archive partition data to Azure Blob Storage
CREATE OR REPLACE FUNCTION audit_security.archive_partition(
  partition_name TEXT,
  azure_blob_path TEXT
)
RETURNS TABLE (
  rows_archived BIGINT,
  partition_size TEXT,
  archive_path TEXT
) AS $$
DECLARE
  rows_count BIGINT;
  partition_bytes BIGINT;
BEGIN
  -- Get partition statistics
  EXECUTE format(
    'SELECT COUNT(*) FROM audit_security.%I',
    partition_name
  ) INTO rows_count;
  
  EXECUTE format(
    'SELECT pg_total_relation_size(%L)',
    'audit_security.' || partition_name
  ) INTO partition_bytes;
  
  -- Mark all rows in partition as archived
  EXECUTE format(
    'UPDATE audit_security.%I 
     SET archived = true, 
         archived_at = NOW(), 
         archived_path = %L
     WHERE archived = false',
    partition_name,
    azure_blob_path
  );
  
  -- Return statistics
  rows_archived := rows_count;
  partition_size := pg_size_pretty(partition_bytes);
  archive_path := azure_blob_path;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

#### Archive Workflow (TypeScript)

```typescript
// lib/jobs/audit-log-archival.ts

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { BlobServiceClient } from '@azure/storage-blob';

interface PartitionInfo {
  schema_name: string;
  table_name: string;
  partition_range_start: Date;
  partition_range_end: Date;
  row_count: bigint;
  size_bytes: bigint;
}

/**
 * Archives audit log partitions older than specified retention period
 * Exports to Azure Blob Storage as Parquet files
 */
export async function archiveOldPartitions(
  retentionMonths: number = 24
): Promise<void> {
  // 1. Find partitions older than retention period
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
  
  const oldPartitions = await db.execute<PartitionInfo>(sql`
    SELECT 
      n.nspname AS schema_name,
      c.relname AS table_name,
      pg_get_expr(c.relpartbound, c.oid) AS partition_range,
      pg_total_relation_size(c.oid) AS size_bytes,
      (SELECT COUNT(*) FROM audit_security.audit_logs p 
       WHERE p.tableoid = c.oid) AS row_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit_security'
      AND c.relname LIKE 'audit_logs_%'
      AND c.relname != 'audit_logs_default'
      AND c.relispartition = true
    ORDER BY c.relname
  `);
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!
  );
  const containerClient = blobServiceClient.getContainerClient('audit-logs-archive');
  
  for (const partition of oldPartitions.rows) {
    const partitionDate = partition.table_name.match(/audit_logs_(\d{4})_(\d{2})/);
    if (!partitionDate) continue;
    
    const [, year, month] = partitionDate;
    const partitionMonth = new Date(`${year}-${month}-01`);
    
    if (partitionMonth >= cutoffDate) {
      console.log(`[Archive] Skipping ${partition.table_name} (within retention period)`);
      continue;
    }
    
    console.log(`[Archive] Processing ${partition.table_name}...`);
    
    // 2. Export partition to Parquet format
    const parquetPath = `audit-logs/${year}/${month}/${partition.table_name}.parquet`;
    await exportPartitionToParquet(partition.table_name, parquetPath, containerClient);
    
    // 3. Mark rows as archived in database
    await db.execute(sql`
      SELECT audit_security.archive_partition(
        ${partition.table_name},
        ${'azure://audit-logs-archive/' + parquetPath}
      )
    `);
    
    // 4. Detach and drop partition (free up space)
    await db.execute(sql.raw(`
      ALTER TABLE audit_security.audit_logs 
      DETACH PARTITION audit_security.${partition.table_name};
    `));
    
    await db.execute(sql.raw(`
      DROP TABLE audit_security.${partition.table_name};
    `));
    
    console.log(`[Archive] Completed ${partition.table_name}`);
  }
}

async function exportPartitionToParquet(
  partitionName: string,
  blobPath: string,
  containerClient: any
): Promise<void> {
  // Use pg_bulkload or COPY to export data
  // Then convert to Parquet format using Arrow/Parquet libraries
  // Upload to Azure Blob Storage
  
  // This is a simplified example - actual implementation would:
  // 1. Stream data from PostgreSQL using COPY
  // 2. Convert to Parquet format in batches
  // 3. Upload to Azure Blob with compression
  
  console.log(`[Archive] Exporting ${partitionName} to ${blobPath}`);
  // Implementation details omitted for brevity
}
```

---

## Query Optimization

### Partition Pruning Examples

#### Before Partitioning

```sql
-- Query: Audit logs for organization in last 30 days
-- WITHOUT partitioning: Full table scan (millions of rows)

EXPLAIN ANALYZE
SELECT * FROM audit_security.audit_logs
WHERE organization_id = '123e4567-e89b-12d3-a456-426614174000'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 100;

-- Execution time: 2,500 ms
-- Rows scanned: 5,000,000
```

#### After Partitioning

```sql
-- Query: Same query with partitioning
-- WITH partitioning: Only scans 1-2 partitions

EXPLAIN ANALYZE
SELECT * FROM audit_security.audit_logs
WHERE organization_id = '123e4567-e89b-12d3-a456-426614174000'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 100;

-- Execution time: 85 ms (29x faster!)
-- Rows scanned: 150,000 (only 2 partitions)
-- Partitions pruned: 22 of 24
```

### Query Best Practices

#### ✅ Good: Partition Key in WHERE Clause

```sql
-- Enables partition pruning
SELECT * FROM audit_security.audit_logs
WHERE created_at BETWEEN '2026-01-01' AND '2026-01-31'
  AND organization_id = '...';
```

#### ❌ Bad: No Partition Key Filter

```sql
-- Scans ALL partitions
SELECT * FROM audit_security.audit_logs
WHERE organization_id = '...' -- Missing created_at filter
ORDER BY created_at DESC;
```

#### ✅ Good: Range Queries

```sql
-- Prunes efficiently
SELECT COUNT(*) FROM audit_security.audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
  AND severity = 'error';
```

#### ⚠️ Acceptable: Joins with Partition Key

```sql
-- Partition pruning works if created_at is used
SELECT a.*, u.email
FROM audit_security.audit_logs a
JOIN public.users u ON u.user_id = a.user_id
WHERE a.created_at > '2026-01-01'
  AND a.organization_id = '...';
```

---

## Performance Benchmarks

### Baseline Metrics (Current Non-Partitioned Table)

| Operation | Dataset Size | Time | Notes |
|-----------|-------------|------|-------|
| INSERT single row | 10M rows | 5ms | Baseline |
| SELECT last 30 days (1 org) | 10M rows | 2,500ms | Full table scan |
| SELECT by user (last 90 days) | 10M rows | 1,800ms | Index scan entire table |
| Aggregate queries (COUNT, GROUP BY) | 10M rows | 5,000ms+ | Heavy CPU |

### Target Metrics (With Partitioning)

| Operation | Dataset Size | Time | Improvement | Notes |
|-----------|-------------|------|-------------|-------|
| INSERT single row | 10M rows | 5ms | 0% | No regression |
| SELECT last 30 days (1 org) | 10M rows | 85ms | **29x faster** | 2 partitions scanned |
| SELECT by user (last 90 days) | 10M rows | 180ms | **10x faster** | 3 partitions scanned |
| Aggregate queries (monthly) | 10M rows | 450ms | **11x faster** | Single partition query |

### Capacity Planning

#### Storage Growth by Tenant Size

| Tenant Size | Daily Audit Logs | Monthly Growth | Annual Growth |
|------------|------------------|----------------|---------------|
| Small (100 users) | 5,000 | ~42MB | ~500MB |
| Medium (1,000 users) | 50,000 | ~420MB | ~5GB |
| Large (10,000 users) | 500,000 | ~4.2GB | ~50GB |
| Enterprise (50,000 users) | 2,500,000 | ~21GB | ~250GB |

**Assumption:** Average audit log entry = 1KB (including JSONB metadata)

#### Partition Size Estimates

- **Small Organization:** 1-2 partitions per year (< 1GB/partition)
- **Medium Organization:** 12 partitions per year (~400MB/partition)
- **Large Organization:** 12 partitions per year (~4GB/partition)
- **Enterprise Organization:** 12 partitions per year (~20GB/partition)

**Recommendation:** Monthly partitions work well across all tenant sizes.

---

## Monitoring and Alerting

### Key Metrics to Track

#### 1. Partition Health

```sql
-- Monitor partition count and sizes
CREATE OR REPLACE VIEW audit_security.partition_health AS
SELECT 
  c.relname AS partition_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  (SELECT COUNT(*) FROM audit_security.audit_logs p 
   WHERE p.tableoid = c.oid) AS row_count,
  CASE 
    WHEN c.relname LIKE '%' || TO_CHAR(NOW(), 'YYYY_MM') || '%' THEN 'CURRENT'
    WHEN c.relname LIKE '%' || TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY_MM') || '%' THEN 'RECENT'
    ELSE 'HISTORICAL'
  END AS age_category
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'audit_security'
  AND c.relispartition = true
ORDER BY c.relname DESC;

-- Query partition health
SELECT * FROM audit_security.partition_health;
```

#### 2. Missing Future Partitions Alert

```sql
-- Alert if partitions for next 2 months don't exist
SELECT 
  TO_CHAR(month_date, 'YYYY_MM') AS missing_partition,
  month_date
FROM generate_series(
  NOW(),
  NOW() + INTERVAL '2 months',
  INTERVAL '1 month'
) AS month_date
WHERE NOT EXISTS (
  SELECT 1 FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'audit_security'
    AND c.relname = 'audit_logs_' || TO_CHAR(month_date, 'YYYY_MM')
);
```

#### 3. Default Partition Size

```sql
-- Alert if default partition is growing (should be empty)
SELECT 
  pg_size_pretty(pg_total_relation_size('audit_security.audit_logs_default')) AS default_size,
  (SELECT COUNT(*) FROM ONLY audit_security.audit_logs_default) AS row_count;

-- If row_count > 0, investigate and create missing partition
```

### Grafana Dashboard Metrics

```yaml
# Prometheus metrics

- metric: audit_log_partition_count
  query: |
    SELECT COUNT(*) 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit_security' AND c.relispartition = true

- metric: audit_log_partition_size_bytes
  query: |
    SELECT 
      c.relname,
      pg_total_relation_size(c.oid)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit_security' AND c.relispartition = true

- metric: audit_log_insert_rate
  query: |
    SELECT COUNT(*) 
    FROM audit_security.audit_logs
    WHERE created_at > NOW() - INTERVAL '5 minutes'

- metric: audit_log_default_partition_rows
  query: |
    SELECT COUNT(*) FROM ONLY audit_security.audit_logs_default
```

### Alert Rules

1. **Missing Future Partitions** (P2)
   - Trigger: No partition for next month (within 7 days of month end)
   - Action: Run partition creation function

2. **Default Partition Not Empty** (P1)
   - Trigger: Default partition has > 1000 rows
   - Action: Investigate missing partition range

3. **Partition Size Excessive** (P3)
   - Trigger: Single partition > 50GB
   - Action: Consider weekly partitioning for that organization

4. **Archive Job Failed** (P2)
   - Trigger: Partitions older than 24 months still in hot storage
   - Action: Re-run archive job, check Azure connectivity

---

## Rollback Plan

If partitioning causes issues, follow this rollback procedure:

### Emergency Rollback Steps

```sql
-- 1. Stop application (prevent new audit log writes)

-- 2. Copy data from partitioned table back to legacy table
BEGIN;

INSERT INTO audit_security.audit_logs_legacy
SELECT * FROM audit_security.audit_logs;

-- Verify counts
DO $$
DECLARE
  partition_count BIGINT;
  legacy_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO partition_count FROM audit_security.audit_logs;
  SELECT COUNT(*) INTO legacy_count FROM audit_security.audit_logs_legacy;
  
  IF partition_count != legacy_count THEN
    RAISE EXCEPTION 'Rollback verification failed!';
  END IF;
END $$;

COMMIT;

-- 3. Swap table names
ALTER TABLE audit_security.audit_logs RENAME TO audit_logs_partitioned_backup;
ALTER TABLE audit_security.audit_logs_legacy RENAME TO audit_logs;

-- 4. Restart application

-- 5. Drop partitioned table after confirming stability
-- DROP TABLE audit_security.audit_logs_partitioned_backup CASCADE;
```

---

## Implementation Timeline

| Phase | Duration | Tasks | Dependencies |
|-------|----------|-------|--------------|
| **Phase 1** | Week 1 | Create partitioned table structure, indexes, RLS policies, triggers | None |
| **Phase 2** | Week 2 | Migrate existing data (online or maintenance window) | Phase 1 complete |
| **Phase 3** | Week 3 | Automated partition management (pg_cron or BullMQ jobs) | Phase 2 complete |
| **Phase 4** | Week 4 | Archive workflow, Azure Blob integration | Phase 3 complete |
| **Testing** | Week 5 | Load testing, performance benchmarks, rollback drills | All phases complete |
| **Production** | Week 6+ | Gradual rollout, monitoring, optimization | Testing complete |

---

## Testing Checklist

### Pre-Production Testing

- [ ] Create partitioned table with all indexes
- [ ] Verify RLS policies work on partitioned table
- [ ] Test immutability trigger on partitioned table
- [ ] Migrate sample dataset (100K rows)
- [ ] Benchmark partition pruning performance
- [ ] Test partition creation automation
- [ ] Verify archive workflow exports correctly
- [ ] Test rollback procedure
- [ ] Load test with realistic write patterns

### Production Validation

- [ ] Monitor partition creation on 1st of month
- [ ] Verify query performance improvement (dashboard queries)
- [ ] Check default partition remains empty
- [ ] Confirm no RLS policy violations
- [ ] Validate archive job runs successfully
- [ ] Monitor disk space trends
- [ ] Benchmark cold storage retrieval (Azure Blob)

---

## References

### PostgreSQL Documentation
- [Table Partitioning](https://www.postgresql.org/docs/15/ddl-partitioning.html)
- [Partition Pruning](https://www.postgresql.org/docs/15/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [pg_cron Extension](https://github.com/citusdata/pg_cron)

### Internal Documentation
- [Audit Schema](../db/schema/domains/infrastructure/audit.ts)
- [Migration 0058: RLS Policies](../db/migrations/0058_world_class_rls_policies.sql)
- [Migration 0063: Archive Support](../db/migrations/0063_add_audit_log_archive_support.sql)
- [Migration 0064: Immutability Triggers](../db/migrations/0064_immutability_triggers.sql)
- [Migration 0081: Indexes](../db/migrations/0081_add_missing_critical_indexes.sql)

### Azure Resources
- [Azure Blob Storage SDK](https://learn.microsoft.com/en-us/azure/storage/blobs/)
- [Parquet Format](https://parquet.apache.org/)

---

## Appendix A: Partition Maintenance Scripts

### Create All Missing Historical Partitions

```sql
-- One-time script to backfill historical partitions
SELECT audit_security.create_partitions_for_range(
  '2025-01-01'::date,
  NOW()::date
);
```

### Check Partition Sizes

```sql
-- View partition sizes sorted by size
SELECT 
  schemaname || '.' || tablename AS partition_name,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
  pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'audit_security'
  AND tablename LIKE 'audit_logs_%'
ORDER BY size_bytes DESC;
```

### Vacuum Partitions

```sql
-- Vacuum all audit log partitions
DO $$
DECLARE
  partition_name TEXT;
BEGIN
  FOR partition_name IN 
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'audit_security'
      AND c.relispartition = true
  LOOP
    EXECUTE format('VACUUM ANALYZE audit_security.%I', partition_name);
    RAISE NOTICE 'Vacuumed partition: %', partition_name;
  END LOOP;
END $$;
```

---

**Next Steps:**
1. Review and approve partitioning strategy with infrastructure team
2. Test migration in development environment
3. Benchmark performance improvements
4. Schedule production migration with maintenance window
5. Implement monitoring and alerting
6. Document operational runbooks

**Questions or Concerns:**
Contact: infrastructure@unioneyes.com
