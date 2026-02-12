# Background Job Queue Architecture

**Version:** 1.0  
**Last Updated:** February 12, 2026  
**Status:** Phase 4 Implementation Roadmap  
**Owner:** Platform Engineering Team

---

## Executive Summary

This document outlines a comprehensive background job processing strategy using **BullMQ** (Redis-backed queue) to handle asynchronous workloads at scale. The architecture supports signal recomputation, email delivery, report generation, data cleanup, and other background tasks critical to Union Eyes' operations.

### Business Need

Union Eyes requires robust background job processing for:
- **Signal Recomputation** (timeline changes trigger recalculations)
- **Email/SMS Delivery** (high-volume notifications)
- **Report Generation** (heavy CPU/database operations)
- **Data Cleanup** (scheduled maintenance tasks)
- **Webhook Processing** (external integrations)
- **Audit Log Archival** (partitioning workflow)

### Solution Overview

- **Queue System:** BullMQ with Redis backend
- **Execution Model:** Distributed workers with horizontal scaling
- **Reliability:** Automatic retries, dead-letter queues, job persistence
- **Observability:** Real-time monitoring, metrics, and alerts
- **Priority Management:** 3-tier priority system with SLA guarantees

---

## Current Implementation

### Existing Infrastructure

**Location:** `lib/job-queue.ts` (618 lines)

#### Current Queue Types

```typescript
// Defined queues (lazy-loaded)
- emailQueue          // Email delivery (SendGrid, Resend)
- smsQueue            // SMS delivery (Twilio)
- notificationQueue   // Multi-channel notifications
- reportQueue         // Report generation
- cleanupQueue        // Data cleanup and maintenance
```

#### Current Job Types

```typescript
export interface EmailJobData {
  type: 'email';
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: number;
}

export interface SmsJobData {
  type: 'sms';
  to: string;
  message: string;
  priority?: number;
}

export interface NotificationJobData {
  type: 'notification';
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('email' | 'sms' | 'push' | 'in-app')[];
}

export interface ReportJobData {
  type: 'report';
  reportType: string;
  tenantId: string;
  userId: string;
  parameters: Record<string, any>;
}

export interface CleanupJobData {
  type: 'cleanup';
  target: 'logs' | 'sessions' | 'temp-files' | 'exports';
  olderThanDays: number;
}
```

### Current Limitations

⚠️ **Gaps to Address:**

1. **Missing Job Types:**
   - Signal recomputation (critical!)
   - Webhook delivery
   - Audit log archival
   - Data export/import
   - Scheduled reminders
   - Async GraphQL operations

2. **No Worker Implementation:**
   - Job queue exists, but no worker processes defined
   - No concurrency controls
   - No failure recovery strategy

3. **Limited Observability:**
   - No metrics collection
   - No job monitoring dashboard
   - No retry/failure alerting

4. **No Priority Management:**
   - All jobs treated equally
   - No SLA enforcement
   - Critical jobs can be delayed by non-critical work

---

## Comprehensive Job Inventory

### 1. Critical Jobs (P0 - Process Immediately)

| Job Type | Description | Trigger | SLA | Complexity |
|----------|-------------|---------|-----|------------|
| **signal_recomputation** | Recalculate member signals after timeline change | Timeline CRUD | < 5 min | HIGH |
| **authentication** | MFA token delivery, password reset | User action | < 30 sec | LOW |
| **notification_critical** | Break-glass alerts, security events | System event | < 1 min | LOW |
| **payment_processing** | Dues collection, refunds | Financial action | < 2 min | MEDIUM |

**Volume:** ~1,000/day across all tenants  
**Failure Impact:** Direct user experience degradation, compliance issues

### 2. High Priority Jobs (P1 - Process Within Minutes)

| Job Type | Description | Trigger | SLA | Complexity |
|----------|-------------|---------|-----|------------|
| **email_transactional** | Welcome emails, receipts, confirmations | User action | < 5 min | LOW |
| **sms_transactional** | OTP codes, urgent notifications | User action | < 2 min | LOW |
| **webhook_delivery** | External system notifications | System event | < 10 min | MEDIUM |
| **document_generation** | PDF reports, labels | User request | < 10 min | HIGH |
| **calendar_reminder** | Meeting reminders, event notifications | Scheduled | < 5 min | LOW |

**Volume:** ~10,000/day  
**Failure Impact:** User frustration, delayed notifications

### 3. Standard Jobs (P2 - Process Within Hours)

| Job Type | Description | Trigger | SLA | Complexity |
|----------|-------------|---------|-----|------------|
| **email_batch** | Weekly digests, newsletters | Scheduled | < 2 hours | MEDIUM |
| **report_generation** | Analytics reports, compliance exports | User request | < 30 min | HIGH |
| **data_export** | CSV/Excel exports | User request | < 1 hour | MEDIUM |
| **search_indexing** | Update search indexes | Data change | < 30 min | MEDIUM |
| **analytics_aggregation** | Dashboard metrics computation | Scheduled | < 1 hour | HIGH |

**Volume:** ~5,000/day  
**Failure Impact:** Delayed insights, minor inconvenience

### 4. Low Priority Jobs (P3 - Process Within Days)

| Job Type | Description | Trigger | SLA | Complexity |
|----------|-------------|---------|-----|------------|
| **data_cleanup** | Delete expired sessions, logs | Daily | < 24 hours | LOW |
| **audit_log_archive** | Archive old partitions | Monthly | < 7 days | MEDIUM |
| **backup_verification** | Test restore procedures | Weekly | < 7 days | HIGH |
| **image_optimization** | Compress uploaded images | Post-upload | < 48 hours | LOW |
| **cache_warming** | Pre-populate caches | Scheduled | < 24 hours | LOW |

**Volume:** ~500/day  
**Failure Impact:** Minimal, operational housekeeping

---

## Queue Architecture Design

### Queue Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         REDIS CLUSTER                        │
│  (High Availability, Persistence, Pub/Sub for Events)       │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
        ┌───────────▼────────┐  ┌──────▼──────────┐
        │  Critical Queue    │  │  Standard Queue │
        │  (P0 - P1 Jobs)    │  │  (P2 - P3 Jobs) │
        │  Max: 10,000       │  │  Max: 100,000   │
        └───────────┬────────┘  └──────┬──────────┘
                    │                   │
        ┌───────────▼────────┬──────────▼──────────┐
        │                    │                      │
┌───────▼────────┐  ┌────────▼───────┐  ┌──────────▼──────┐
│ Worker Pool 1  │  │ Worker Pool 2  │  │  Worker Pool 3  │
│ (Critical)     │  │ (High Priority)│  │  (Standard/Low) │
│ 8 workers      │  │ 16 workers     │  │  32 workers     │
│ Concurrency: 2 │  │ Concurrency: 4 │  │  Concurrency: 8 │
└────────────────┘  └────────────────┘  └─────────────────┘
```

### Queue Types by Priority

```typescript
// lib/job-queue-v2.ts

export enum QueuePriority {
  CRITICAL = 0,   // P0 - Process immediately
  HIGH = 1,       // P1 - Process within minutes
  STANDARD = 2,   // P2 - Process within hours
  LOW = 3,        // P3 - Process within days
}

export const QUEUE_CONFIGS = {
  critical: {
    name: 'critical-jobs',
    maxJobs: 10000,
    concurrency: 2,
    workerCount: 8,
    defaultJobOptions: {
      priority: QueuePriority.CRITICAL,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  },
  high: {
    name: 'high-priority-jobs',
    maxJobs: 50000,
    concurrency: 4,
    workerCount: 16,
    defaultJobOptions: {
      priority: QueuePriority.HIGH,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: 2000,
    },
  },
  standard: {
    name: 'standard-jobs',
    maxJobs: 100000,
    concurrency: 8,
    workerCount: 32,
    defaultJobOptions: {
      priority: QueuePriority.STANDARD,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 1000,
    },
  },
  low: {
    name: 'low-priority-jobs',
    maxJobs: 50000,
    concurrency: 16,
    workerCount: 16,
    defaultJobOptions: {
      priority: QueuePriority.LOW,
      attempts: 2,
      backoff: { type: 'fixed', delay: 60000 },
      removeOnComplete: 50,
      removeOnFail: 500,
    },
  },
} as const;
```

---

## Job Type Definitions

### Signal Recomputation Job

**Purpose:** Recalculate member engagement signals when timeline data changes.

```typescript
// lib/jobs/signal-recomputation.ts

export interface SignalRecomputationJobData {
  type: 'signal_recomputation';
  tenantId: string;
  memberId?: string; // If undefined, recompute all members
  timelineEventId: string; // What triggered the recomputation
  reason: 'timeline_update' | 'timeline_delete' | 'manual_recalc';
  priority: QueuePriority.CRITICAL;
}

/**
 * Signal Recomputation Worker
 * 
 * Recalculates engagement, attendance, participation signals
 * Triggered by: Timeline CRUD operations, membership changes
 * Impact: Real-time dashboard accuracy
 */
export async function processSignalRecomputation(
  job: Job<SignalRecomputationJobData>
): Promise<void> {
  const { tenantId, memberId, timelineEventId, reason } = job.data;
  
  await job.log(`Starting signal recomputation for tenant ${tenantId}, reason: ${reason}`);
  
  // 1. Set RLS context for tenant
  await withRlsContext(tenantId, async (db) => {
    if (memberId) {
      // Recompute single member
      await recomputeMemberSignals(db, memberId);
      await job.updateProgress(100);
    } else {
      // Recompute all members (batch processing)
      const members = await db.query.members.findMany({
        where: eq(schema.members.tenantId, tenantId),
      });
      
      let processed = 0;
      for (const member of members) {
        await recomputeMemberSignals(db, member.id);
        processed++;
        await job.updateProgress((processed / members.length) * 100);
      }
    }
  });
  
  await job.log(`Completed signal recomputation for ${memberId || 'all members'}`);
}

async function recomputeMemberSignals(
  db: Database,
  memberId: string
): Promise<void> {
  // 1. Fetch member's timeline events (last 12 months)
  const events = await db.query.timelineEvents.findMany({
    where: and(
      eq(schema.timelineEvents.memberId, memberId),
      gte(schema.timelineEvents.eventDate, subMonths(new Date(), 12))
    ),
  });
  
  // 2. Calculate signals
  const signals = {
    engagement_score: calculateEngagementScore(events),
    attendance_rate: calculateAttendanceRate(events),
    participation_level: calculateParticipationLevel(events),
    last_active_date: events[0]?.eventDate || null,
  };
  
  // 3. Update member record
  await db.update(schema.members)
    .set({
      ...signals,
      signals_updated_at: new Date(),
    })
    .where(eq(schema.members.id, memberId));
}
```

### Webhook Delivery Job

```typescript
// lib/jobs/webhook-delivery.ts

export interface WebhookDeliveryJobData {
  type: 'webhook_delivery';
  webhookId: string;
  tenantId: string;
  event: string; // 'member.created', 'payment.completed', etc.
  payload: Record<string, any>;
  url: string;
  headers?: Record<string, string>;
  signature?: string; // HMAC signature for verification
  priority: QueuePriority.HIGH;
}

/**
 * Webhook Delivery Worker
 * 
 * Delivers webhooks to external systems with retry logic
 * Signature verification for security
 */
export async function processWebhookDelivery(
  job: Job<WebhookDeliveryJobData>
): Promise<void> {
  const { webhookId, event, payload, url, headers, signature } = job.data;
  
  await job.log(`Delivering webhook ${webhookId} to ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-UnionEyes-Event': event,
        'X-UnionEyes-Signature': signature || '',
        'X-UnionEyes-Delivery-ID': job.id,
        ...headers,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }
    
    // Log successful delivery
    await db.insert(schema.webhookDeliveries).values({
      webhookId,
      jobId: job.id,
      event,
      url,
      statusCode: response.status,
      responseBody: await response.text(),
      deliveredAt: new Date(),
    });
    
    await job.log(`Successfully delivered webhook to ${url}`);
  } catch (error) {
    await job.log(`Failed to deliver webhook: ${error.message}`);
    
    // Log failed delivery attempt
    await db.insert(schema.webhookDeliveries).values({
      webhookId,
      jobId: job.id,
      event,
      url,
      statusCode: null,
      error: error.message,
      attemptedAt: new Date(),
    });
    
    throw error; // Re-throw to trigger retry
  }
}
```

### Report Generation Job

```typescript
// lib/jobs/report-generation.ts

export interface ReportGenerationJobData {
  type: 'report_generation';
  reportId: string;
  tenantId: string;
  userId: string;
  reportType: 'membership' | 'financial' | 'engagement' | 'compliance' | 'custom';
  format: 'pdf' | 'excel' | 'csv';
  parameters: {
    dateRange?: { start: Date; end: Date };
    filters?: Record<string, any>;
    groupBy?: string[];
    includeCharts?: boolean;
  };
  priority: QueuePriority.STANDARD;
}

/**
 * Report Generation Worker
 * 
 * Generates complex reports (PDF, Excel, CSV)
 * Heavy CPU/database operations
 */
export async function processReportGeneration(
  job: Job<ReportGenerationJobData>
): Promise<void> {
  const { reportId, tenantId, reportType, format, parameters } = job.data;
  
  await job.log(`Generating ${reportType} report in ${format} format`);
  
  await withRlsContext(tenantId, async (db) => {
    // 1. Fetch report data
    await job.updateProgress(10);
    const data = await fetchReportData(db, reportType, parameters);
    
    // 2. Transform data
    await job.updateProgress(40);
    const transformed = await transformReportData(data, parameters);
    
    // 3. Generate file
    await job.updateProgress(70);
    let filePath: string;
    
    if (format === 'pdf') {
      filePath = await generatePdfReport(transformed, reportType);
    } else if (format === 'excel') {
      filePath = await generateExcelReport(transformed, reportType);
    } else {
      filePath = await generateCsvReport(transformed, reportType);
    }
    
    // 4. Upload to Azure Blob Storage
    await job.updateProgress(90);
    const blobUrl = await uploadReportToBlob(filePath, reportId);
    
    // 5. Update report record
    await db.update(schema.reports).set({
      status: 'completed',
      fileUrl: blobUrl,
      generatedAt: new Date(),
    }).where(eq(schema.reports.id, reportId));
    
    await job.updateProgress(100);
    await job.log(`Report generated successfully: ${blobUrl}`);
  });
}
```

### Audit Log Archival Job

```typescript
// lib/jobs/audit-log-archival.ts

export interface AuditLogArchivalJobData {
  type: 'audit_log_archival';
  partitionName: string;
  retentionMonths: number;
  targetStorage: 'azure_blob' | 'azure_archive';
  priority: QueuePriority.LOW;
}

/**
 * Audit Log Archival Worker
 * 
 * Archives old audit log partitions to cold storage
 * Integrates with partition management (see audit-log-partitioning.md)
 */
export async function processAuditLogArchival(
  job: Job<AuditLogArchivalJobData>
): Promise<void> {
  const { partitionName, targetStorage } = job.data;
  
  await job.log(`Starting archival of partition: ${partitionName}`);
  
  // 1. Export partition to Parquet format
  await job.updateProgress(20);
  const parquetFile = await exportPartitionToParquet(partitionName);
  
  // 2. Upload to Azure Blob Storage
  await job.updateProgress(50);
  const blobUrl = await uploadToAzureStorage(parquetFile, targetStorage);
  
  // 3. Mark rows as archived in database
  await job.updateProgress(70);
  await db.execute(sql`
    SELECT audit_security.archive_partition(
      ${partitionName},
      ${blobUrl}
    )
  `);
  
  // 4. Detach and drop partition
  await job.updateProgress(90);
  await db.execute(sql.raw(`
    ALTER TABLE audit_security.audit_logs 
    DETACH PARTITION audit_security.${partitionName}
  `));
  
  await db.execute(sql.raw(`
    DROP TABLE audit_security.${partitionName}
  `));
  
  await job.updateProgress(100);
  await job.log(`Partition ${partitionName} archived to ${blobUrl}`);
}
```

---

## Worker Implementation

### Worker Process Structure

```typescript
// workers/index.ts

import { Worker, Job, Queue } from 'bullmq';
import { processSignalRecomputation } from '@/lib/jobs/signal-recomputation';
import { processWebhookDelivery } from '@/lib/jobs/webhook-delivery';
import { processReportGeneration } from '@/lib/jobs/report-generation';
import { processAuditLogArchival } from '@/lib/jobs/audit-log-archival';
// ... import other job processors

interface JobProcessor {
  [key: string]: (job: Job) => Promise<void>;
}

const JOB_PROCESSORS: JobProcessor = {
  signal_recomputation: processSignalRecomputation,
  webhook_delivery: processWebhookDelivery,
  report_generation: processReportGeneration,
  audit_log_archival: processAuditLogArchival,
  email_transactional: processEmailTransactional,
  sms_transactional: processSmsTransactional,
  notification_critical: processNotificationCritical,
  data_cleanup: processDataCleanup,
  // ... other job types
};

/**
 * Generic Worker Factory
 * Creates a worker for a specific queue with retry logic
 */
function createWorker(
  queueName: string,
  concurrency: number,
  connection: any
): Worker {
  return new Worker(
    queueName,
    async (job: Job) => {
      const processor = JOB_PROCESSORS[job.data.type];
      
      if (!processor) {
        throw new Error(`No processor found for job type: ${job.data.type}`);
      }
      
      try {
        await processor(job);
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection,
      concurrency,
      limiter: {
        max: 10, // Max 10 jobs per second per worker
        duration: 1000,
      },
    }
  );
}

/**
 * Start All Workers
 * Called on worker process startup
 */
export async function startWorkers(): Promise<void> {
  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };
  
  // Critical Queue Workers
  const criticalWorkers = [];
  for (let i = 0; i < 8; i++) {
    const worker = createWorker('critical-jobs', 2, connection);
    criticalWorkers.push(worker);
    
    worker.on('completed', (job) => {
      console.log(`[Critical] Job ${job.id} completed`);
    });
    
    worker.on('failed', (job, err) => {
      console.error(`[Critical] Job ${job?.id} failed:`, err);
    });
  }
  
  // High Priority Queue Workers
  const highPriorityWorkers = [];
  for (let i = 0; i < 16; i++) {
    const worker = createWorker('high-priority-jobs', 4, connection);
    highPriorityWorkers.push(worker);
  }
  
  // Standard Queue Workers
  const standardWorkers = [];
  for (let i = 0; i < 32; i++) {
    const worker = createWorker('standard-jobs', 8, connection);
    standardWorkers.push(worker);
  }
  
  // Low Priority Queue Workers
  const lowPriorityWorkers = [];
  for (let i = 0; i < 16; i++) {
    const worker = createWorker('low-priority-jobs', 16, connection);
    lowPriorityWorkers.push(worker);
  }
  
  console.log('All workers started successfully');
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down workers...');
    
    const allWorkers = [
      ...criticalWorkers,
      ...highPriorityWorkers,
      ...standardWorkers,
      ...lowPriorityWorkers,
    ];
    
    await Promise.all(allWorkers.map((w) => w.close()));
    process.exit(0);
  });
}
```

### Docker Compose Worker Service

```yaml
# docker-compose.workers.yml

version: '3.8'

services:
  # Redis for BullMQ
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # Critical Job Workers
  worker-critical:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      NODE_ENV: production
      REDIS_HOST: redis
      REDIS_PORT: 6379
      WORKER_TYPE: critical
      POSTGRES_URL: ${POSTGRES_URL}
    depends_on:
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    restart: unless-stopped

  # High Priority Workers
  worker-high:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      NODE_ENV: production
      REDIS_HOST: redis
      REDIS_PORT: 6379
      WORKER_TYPE: high
      POSTGRES_URL: ${POSTGRES_URL}
    depends_on:
      - redis
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '4'
          memory: 4G
    restart: unless-stopped

  # Standard Priority Workers
  worker-standard:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      NODE_ENV: production
      REDIS_HOST: redis
      REDIS_PORT: 6379
      WORKER_TYPE: standard
      POSTGRES_URL: ${POSTGRES_URL}
    depends_on:
      - redis
    deploy:
      replicas: 8
      resources:
        limits:
          cpus: '8'
          memory: 8G
    restart: unless-stopped

  # Low Priority Workers
  worker-low:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      NODE_ENV: production
      REDIS_HOST: redis
      REDIS_PORT: 6379
      WORKER_TYPE: low
      POSTGRES_URL: ${POSTGRES_URL}
    depends_on:
      - redis
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '4'
          memory: 4G
    restart: unless-stopped

volumes:
  redis-data:
```

---

## Failure Handling and Retry Logic

### Retry Strategy by Priority

```typescript
// lib/job-queue-retry.ts

export const RETRY_STRATEGIES = {
  critical: {
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 1000, // Start with 1 second
    },
    onFailedAttempt: async (job: Job, error: Error, attemptNumber: number) => {
      await job.log(`Attempt ${attemptNumber} failed: ${error.message}`);
      
      // Alert on 3rd failure
      if (attemptNumber >= 3) {
        await sendAlertToSlack({
          level: 'error',
          message: `Critical job ${job.id} failing repeatedly`,
          jobData: job.data,
          error: error.message,
        });
      }
    },
    onFailed: async (job: Job, error: Error) => {
      // Move to dead letter queue after all retries exhausted
      await moveToDeadLetterQueue(job, error);
      
      // Page on-call engineer
      await sendPagerDutyAlert({
        severity: 'critical',
        summary: `Critical job ${job.id} failed permanently`,
        details: { job: job.data, error: error.message },
      });
    },
  },
  
  high: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    onFailed: async (job: Job, error: Error) => {
      await moveToDeadLetterQueue(job, error);
      await sendAlertToSlack({
        level: 'warning',
        message: `High-priority job ${job.id} failed permanently`,
        jobData: job.data,
      });
    },
  },
  
  standard: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
    onFailed: async (job: Job, error: Error) => {
      await moveToDeadLetterQueue(job, error);
      console.warn(`Standard job ${job.id} failed:`, error);
    },
  },
  
  low: {
    attempts: 2,
    backoff: { type: 'fixed' as const, delay: 60000 }, // 1 minute
    onFailed: async (job: Job, error: Error) => {
      // Just log, no alerts for low-priority jobs
      console.info(`Low-priority job ${job.id} failed:`, error);
    },
  },
};
```

### Dead Letter Queue

```typescript
// lib/job-queue-dlq.ts

import { Queue } from 'bullmq';

const deadLetterQueue = new Queue('dead-letter-queue', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

/**
 * Move failed job to Dead Letter Queue for manual inspection
 */
export async function moveToDeadLetterQueue(
  job: Job,
  error: Error
): Promise<void> {
  await deadLetterQueue.add('failed-job', {
    originalQueue: job.queueName,
    originalJobId: job.id,
    jobData: job.data,
    error: {
      message: error.message,
      stack: error.stack,
    },
    failedAt: new Date(),
    attemptsMade: job.attemptsMade,
  });
  
  // Persist to database for audit trail
  await db.insert(schema.failedJobs).values({
    id: `dlq_${job.id}`,
    queueName: job.queueName,
    jobType: job.data.type,
    jobData: job.data,
    error: error.message,
    stackTrace: error.stack,
    attemptsMade: job.attemptsMade,
    failedAt: new Date(),
  });
}

/**
 * Replay job from Dead Letter Queue
 * (Manual intervention via admin dashboard)
 */
export async function replayFromDeadLetterQueue(
  deadLetterJobId: string
): Promise<void> {
  const dlqJob = await deadLetterQueue.getJob(deadLetterJobId);
  
  if (!dlqJob) {
    throw new Error(`Dead letter job ${deadLetterJobId} not found`);
  }
  
  const { originalQueue, jobData } = dlqJob.data;
  
  // Re-add to original queue
  const queue = new Queue(originalQueue, {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });
  
  await queue.add(jobData.type, jobData, {
    priority: jobData.priority,
  });
  
  // Remove from DLQ
  await dlqJob.remove();
  
  console.log(`Replayed job ${deadLetterJobId} to ${originalQueue}`);
}
```

---

## Observability and Monitoring

### Metrics Collection

```typescript
// lib/job-queue-metrics.ts

import { Queue, QueueEvents } from 'bullmq';

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

/**
 * Collect metrics for all queues
 * Exported to Prometheus
 */
export async function collectQueueMetrics(): Promise<Record<string, QueueMetrics>> {
  const queueNames = ['critical-jobs', 'high-priority-jobs', 'standard-jobs', 'low-priority-jobs'];
  const metrics: Record<string, QueueMetrics> = {};
  
  for (const queueName of queueNames) {
    const queue = new Queue(queueName, {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
    
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
    
    metrics[queueName] = {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
    };
  }
  
  return metrics;
}

/**
 * Export metrics to Prometheus
 */
export function registerPrometheusMetrics(prometheusClient: any): void {
  const queueWaitingGauge = new prometheusClient.Gauge({
    name: 'bullmq_queue_waiting_jobs',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue'],
  });
  
  const queueActiveGauge = new prometheusClient.Gauge({
    name: 'bullmq_queue_active_jobs',
    help: 'Number of active jobs in queue',
    labelNames: ['queue'],
  });
  
  const queueCompletedCounter = new prometheusClient.Counter({
    name: 'bullmq_queue_completed_jobs_total',
    help: 'Total number of completed jobs',
    labelNames: ['queue'],
  });
  
  const queueFailedCounter = new prometheusClient.Counter({
    name: 'bullmq_queue_failed_jobs_total',
    help: 'Total number of failed jobs',
    labelNames: ['queue'],
  });
  
  // Update metrics every 15 seconds
  setInterval(async () => {
    const metrics = await collectQueueMetrics();
    
    for (const [queueName, counts] of Object.entries(metrics)) {
      queueWaitingGauge.set({ queue: queueName }, counts.waiting);
      queueActiveGauge.set({ queue: queueName }, counts.active);
      queueCompletedCounter.inc({ queue: queueName }, counts.completed);
      queueFailedCounter.inc({ queue: queueName }, counts.failed);
    }
  }, 15000);
}
```

### Alert Rules

```yaml
# monitoring/alerts/job-queue-alerts.yml

groups:
  - name: job_queue_alerts
    interval: 30s
    rules:
      - alert: CriticalQueueBacklog
        expr: bullmq_queue_waiting_jobs{queue="critical-jobs"} > 1000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Critical queue backlog detected"
          description: "{{ $value }} jobs waiting in critical queue for 5+ minutes"
      
      - alert: HighFailureRate
        expr: rate(bullmq_queue_failed_jobs_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High job failure rate"
          description: "{{ $value }} jobs/sec failing in queue {{ $labels.queue }}"
      
      - alert: WorkerStarvation
        expr: bullmq_queue_active_jobs{queue=~".*"} == 0 AND bullmq_queue_waiting_jobs{queue=~".*"} > 100
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Worker starvation detected"
          description: "{{ $labels.queue }} has {{ $value }} waiting jobs but no active workers"
      
      - alert: JobProcessingTooSlow
        expr: histogram_quantile(0.95, rate(job_duration_seconds_bucket[5m])) > 300
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Job processing too slow"
          description: "P95 job duration is {{ $value }}s (threshold: 300s)"
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Background Jobs Queue Dashboard",
    "panels": [
      {
        "title": "Queue Depths",
        "targets": [
          {
            "expr": "bullmq_queue_waiting_jobs",
            "legendFormat": "{{queue}} - Waiting"
          },
          {
            "expr": "bullmq_queue_active_jobs",
            "legendFormat": "{{queue}} - Active"
          }
        ]
      },
      {
        "title": "Job Throughput",
        "targets": [
          {
            "expr": "rate(bullmq_queue_completed_jobs_total[1m])",
            "legendFormat": "{{queue}} - Completed/sec"
          }
        ]
      },
      {
        "title": "Failure Rate",
        "targets": [
          {
            "expr": "rate(bullmq_queue_failed_jobs_total[5m])",
            "legendFormat": "{{queue}} - Failures/sec"
          }
        ]
      },
      {
        "title": "Job Duration (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(job_duration_seconds_bucket[5m]))",
            "legendFormat": "{{queue}} - P95 Duration"
          }
        ]
      }
    ]
  }
}
```

---

## Scalability Patterns

### Horizontal Scaling

```bash
# Auto-scaling worker pods based on queue depth
# Kubernetes HPA (Horizontal Pod Autoscaler)

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-critical-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-critical
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: External
      external:
        metric:
          name: bullmq_queue_waiting_jobs
          selector:
            matchLabels:
              queue: critical-jobs
        target:
          type: AverageValue
          averageValue: "100" # Scale up when > 100 jobs per pod
```

### Vertical Scaling Recommendations

| Worker Type | CPU | Memory | Disk I/O | Network |
|------------|-----|--------|----------|---------|
| Critical | 2 cores | 2GB | Low | Low |
| High Priority | 4 cores | 4GB | Medium | Medium |
| Standard | 8 cores | 8GB | High | High |
| Low Priority | 4 cores | 4GB | Medium | Low |

### Cost Optimization

**Azure VM Recommendations:**

- **Critical Workers:** 2x Standard_D2s_v5 (2 vCPU, 8 GB RAM) = $140/month
- **High Priority:** 4x Standard_D4s_v5 (4 vCPU, 16 GB RAM) = $560/month
- **Standard:** 8x Standard_D8s_v5 (8 vCPU, 32 GB RAM) = $2,240/month
- **Low Priority:** 4x Standard_B4ms (4 vCPU, 16 GB RAM, Burstable) = $240/month

**Total Monthly Cost:** ~$3,180/month for full production workload

**Savings Strategies:**
- Use Azure Spot VMs for low-priority workers (70% savings)
- Scale down non-critical workers during off-peak hours
- Use Reserved Instances for baseline capacity (40% savings)

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)

- [ ] **Week 1:**
  - Set up Redis cluster with persistence and replication
  - Define all job type interfaces
  - Implement job queue wrappers with retry logic
  - Create worker process skeleton

- [ ] **Week 2:**
  - Implement critical job processors (signal recomputation, auth)
  - Build Docker images for worker processes
  - Deploy dev environment with 1 worker of each type
  - Test basic job lifecycle (enqueue → process → complete)

### Phase 2: Job Processors (Weeks 3-4)

- [ ] **Week 3:**
  - Implement high-priority processors (email, SMS, webhooks)
  - Implement standard processors (reports, exports)
  - Add comprehensive error handling and logging
  - Unit test all processors

- [ ] **Week 4:**
  - Implement low-priority processors (cleanup, archival)
  - Build dead letter queue (DLQ) functionality
  - Create admin UI for DLQ management
  - Integration testing across all job types

### Phase 3: 40Observability (Week 5)

- [ ] **Week 5:**
  - Implement Prometheus metrics export
  - Create Grafana dashboard
  - Set up alert rules in AlertManager
  - Configure Slack/PagerDuty integrations
  - Load testing with realistic workloads

### Phase 4: Production Deployment (Week 6+)

- [ ] **Week 6:**
  - Deploy to staging with production-like traffic
  - Run soak tests (24-48 hours)
  - Tune worker counts and concurrency
  - Validate SLA compliance

- [ ] **Week 7:**
  - Gradual rollout to production (10% → 50% → 100%)
  - Monitor metrics and alerts
  - Tune auto-scaling thresholds
  - Document operational runbooks

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/jobs/signal-recomputation.test.ts

import { processSignalRecomputation } from '@/lib/jobs/signal-recomputation';
import { Job } from 'bullmq';

describe('Signal Recomputation Job', () => {
  it('should recompute signals for single member', async () => {
    const mockJob = {
      data: {
        type: 'signal_recomputation',
        tenantId: 'test-tenant',
        memberId: 'test-member',
        timelineEventId: 'test-event',
        reason: 'timeline_update',
      },
      log: jest.fn(),
      updateProgress: jest.fn(),
    } as unknown as Job;
    
    await processSignalRecomputation(mockJob);
    
    expect(mockJob.log).toHaveBeenCalledWith(
      expect.stringContaining('Starting signal recomputation')
    );
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
  });
  
  it('should handle errors gracefully', async () => {
    const mockJob = {
      data: {
        type: 'signal_recomputation',
        tenantId: 'invalid-tenant',
        memberId: 'test-member',
      },
      log: jest.fn(),
    } as unknown as Job;
    
    await expect(processSignalRecomputation(mockJob)).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/job-queue.test.ts

import { Queue, Worker } from 'bullmq';
import { processSignalRecomputation } from '@/lib/jobs/signal-recomputation';

describe('Job Queue Integration', () => {
  let queue: Queue;
  let worker: Worker;
  
  beforeAll(async () => {
    // Use test Redis instance
    const connection = {
      host: 'localhost',
      port: 6379,
      db: 15, // Test database
    };
    
    queue = new Queue('test-queue', { connection });
    worker = new Worker('test-queue', processSignalRecomputation, { connection });
  });
  
  afterAll(async () => {
    await queue.close();
    await worker.close();
  });
  
  it('should process job end-to-end', async () => {
    const job = await queue.add('signal_recomputation', {
      type: 'signal_recomputation',
      tenantId: 'test-tenant',
      memberId: 'test-member',
      timelineEventId: 'test-event',
      reason: 'timeline_update',
    });
    
    // Wait for job to complete
    await job.waitUntilFinished(queueEvents);
    
    const result = await job.isCompleted();
    expect(result).toBe(true);
  });
});
```

### Load Testing

```javascript
// load-tests/job-queue-load.js

import { Queue } from 'bullmq';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 jobs/sec
    { duration: '5m', target: 100 }, // Sustain 100 jobs/sec
    { duration: '2m', target: 200 }, // Ramp up to 200 jobs/sec
    { duration: '5m', target: 200 }, // Sustain 200 jobs/sec
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const queue = new Queue('critical-jobs', {
    connection: { host: 'redis', port: 6379 },
  });
  
  const job = queue.add('signal_recomputation', {
    type: 'signal_recomputation',
    tenantId: `tenant-${__VU}`,
    memberId: `member-${__VU}-${__ITER}`,
    reason: 'load_test',
  });
  
  const success = check(job, {
    'job enqueued': (j) => j !== null,
  });
  
  errorRate.add(!success);
}
```

---

## Operational Runbooks

### Runbook 1: Clear Stuck Jobs

```bash
#!/bin/bash
# scripts/clear-stuck-jobs.sh

QUEUE_NAME=$1
DRY_RUN=${2:-false}

if [ -z "$QUEUE_NAME" ]; then
  echo "Usage: $0 <queue-name> [dry-run]"
  exit 1
fi

echo "Checking for stuck jobs in queue: $QUEUE_NAME"

redis-cli -h $REDIS_HOST -p $REDIS_PORT <<EOF
  # Get stuck jobs (active for > 1 hour)
  ZRANGEBYSCORE bull:$QUEUE_NAME:active 0 $(date -d '1 hour ago' +%s%3N)
EOF

if [ "$DRY_RUN" = "false" ]; then
  echo "Moving stuck jobs to failed state..."
  # Logic to move jobs
  redis-cli -h $REDIS_HOST -p $REDIS_PORT <<EOF
    # Move to failed
    ZREMRANGEBYSCORE bull:$QUEUE_NAME:active 0 $(date -d '1 hour ago' +%s%3N)
  EOF
fi
```

### Runbook 2: Scale Workers

```bash
#!/bin/bash
# scripts/scale-workers.sh

WORKER_TYPE=$1
REPLICAS=$2

kubectl scale deployment/worker-$WORKER_TYPE --replicas=$REPLICAS

echo "Scaled worker-$WORKER_TYPE to $REPLICAS replicas"
kubectl get pods -l app=worker-$WORKER_TYPE
```

### Runbook 3: Drain Queue Before Maintenance

```typescript
// scripts/drain-queue.ts

import { Queue } from 'bullmq';

async function drainQueue(queueName: string): Promise<void> {
  const queue = new Queue(queueName, {
    connection: { host: process.env.REDIS_HOST!, port: 6379 },
  });
  
  console.log(`Pausing queue: ${queueName}`);
  await queue.pause();
  
  console.log('Waiting for active jobs to complete...');
  let activeCount = await queue.getActiveCount();
  
  while (activeCount > 0) {
    console.log(`${activeCount} jobs still active...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    activeCount = await queue.getActiveCount();
  }
  
  console.log(`Queue ${queueName} drained successfully`);
}

// Usage: pnpm tsx scripts/drain-queue.ts critical-jobs
drainQueue(process.argv[2]);
```

---

## References

### External Documentation
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/)

### Internal Documentation
- [Job Queue Implementation](../lib/job-queue.ts)
- [RLS Context Utilities](../lib/db/with-rls-context.ts)
- [Calendar Reminder Scheduler](../lib/calendar-reminder-scheduler.ts)
- [Audit Log Partitioning](./audit-log-partitioning.md)

---

## Success Criteria

### Performance Targets

- **Critical Jobs:** 95% processed within 5 minutes
- **High Priority:** 95% processed within 15 minutes
- **Standard:** 95% processed within 2 hours
- **Low Priority:** 95% processed within 24 hours

### Reliability Targets

- **Job Success Rate:** > 99.5%
- **Worker Uptime:** > 99.9%
- **Message Loss:** 0%
- **Alert Response Time:** < 5 minutes (critical), < 30 minutes (non-critical)

### Scalability Targets

- **Peak Throughput:** 1,000 jobs/min across all queues
- **Queue Depth:** < 10,000 waiting jobs under normal load
- **Horizontal Scaling:** Sub-5-minute scale-out response
- **Cost Efficiency:** < $0.01 per job processed

---

**Next Steps:**
1. Review job inventory with product team
2. Prioritize job types for Phase 1 implementation
3. Set up Redis cluster in Azure
4. Implement core workers for critical jobs
5. Deploy dev environment and begin testing

**Questions or Concerns:**
Contact: platform-engineering@unioneyes.com
