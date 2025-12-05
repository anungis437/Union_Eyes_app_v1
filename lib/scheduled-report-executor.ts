/**
 * Scheduled Report Executor
 * 
 * Core engine for executing scheduled reports:
 * - Fetches report data
 * - Generates exports (PDF, Excel, CSV, JSON)
 * - Handles delivery (email, storage, webhook)
 * - Tracks execution status
 * - Implements retry logic
 * 
 * Part of: Phase 2.4 - Scheduled Reports System
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import type { ScheduledReport } from '@/db/queries/scheduled-reports-queries';
import { updateScheduleAfterRun } from '@/db/queries/scheduled-reports-queries';

// ============================================================================
// Types
// ============================================================================

interface ExecutionResult {
  success: boolean;
  scheduleId: string;
  exportJobId?: string;
  error?: string;
  rowCount?: number;
  fileUrl?: string;
  fileSizeBytes?: number;
  processingDurationMs?: number;
}

interface ReportData {
  columns: string[];
  rows: any[];
  totalCount: number;
}

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Execute a scheduled report
 */
export async function executeScheduledReport(
  schedule: ScheduledReport
): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  try {
    console.log(`[Executor] Starting execution for schedule ${schedule.id}`);

    // 1. Create export job record
    const exportJob = await createExportJob(schedule);
    
    // 2. Fetch report data
    console.log(`[Executor] Fetching data for report ${schedule.reportId}`);
    const reportData = await fetchReportData(schedule);
    
    if (!reportData || reportData.rows.length === 0) {
      throw new Error('No data available for report');
    }

    // 3. Generate export file
    console.log(`[Executor] Generating ${schedule.exportFormat} export`);
    const fileBuffer = await generateExportFile(
      reportData,
      schedule.exportFormat
    );

    // 4. Upload file to storage
    console.log(`[Executor] Uploading file to storage`);
    const fileUrl = await uploadFile(
      fileBuffer,
      schedule.id,
      schedule.exportFormat
    );

    const processingDurationMs = Date.now() - startTime;

    // 5. Update export job with success
    await updateExportJob(exportJob.id, {
      status: 'completed',
      fileUrl,
      fileSizeBytes: fileBuffer.length,
      rowCount: reportData.rows.length,
      processingDurationMs,
    });

    // 6. Deliver the report
    console.log(`[Executor] Delivering via ${schedule.deliveryMethod}`);
    await deliverReport(schedule, fileUrl, fileBuffer);

    // 7. Update schedule
    await updateScheduleAfterRun(schedule.id, true);

    console.log(`[Executor] Successfully completed schedule ${schedule.id}`);

    return {
      success: true,
      scheduleId: schedule.id,
      exportJobId: exportJob.id,
      rowCount: reportData.rows.length,
      fileUrl,
      fileSizeBytes: fileBuffer.length,
      processingDurationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Executor] Failed to execute schedule ${schedule.id}:`, errorMessage);

    // Update schedule with failure
    await updateScheduleAfterRun(schedule.id, false, errorMessage);

    return {
      success: false,
      scheduleId: schedule.id,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Create an export job record
 */
async function createExportJob(schedule: ScheduledReport): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO export_jobs (
      report_id,
      tenant_id,
      schedule_id,
      export_format,
      status,
      created_by
    ) VALUES (
      ${schedule.reportId},
      ${schedule.tenantId},
      ${schedule.id},
      ${schedule.exportFormat},
      'processing',
      'system'
    )
    RETURNING *
  `);

  const rows = result as any[];
  return rows[0];
}

/**
 * Update export job with results
 */
async function updateExportJob(
  jobId: string,
  data: {
    status: string;
    fileUrl?: string;
    fileSizeBytes?: number;
    rowCount?: number;
    processingDurationMs?: number;
    errorMessage?: string;
  }
): Promise<void> {
  await db.execute(sql`
    UPDATE export_jobs
    SET 
      status = ${data.status},
      completed_at = NOW(),
      file_url = ${data.fileUrl ?? null},
      file_size_bytes = ${data.fileSizeBytes ?? null},
      row_count = ${data.rowCount ?? null},
      processing_duration_ms = ${data.processingDurationMs ?? null},
      error_message = ${data.errorMessage ?? null}
    WHERE id = ${jobId}
  `);
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch report data based on report configuration
 */
async function fetchReportData(schedule: ScheduledReport): Promise<ReportData> {
  // Get the report configuration
  const reportResult = await db.execute(sql`
    SELECT config FROM reports WHERE id = ${schedule.reportId}
  `);
  
  const reportRows = reportResult as any[];
  if (reportRows.length === 0) {
    throw new Error('Report not found');
  }

  const reportConfig = reportRows[0];
  const config = reportConfig.config;

  // Execute the report query based on its type
  let result: any[];

  switch (config.reportType || config.type) {
    case 'claims':
      result = await executeClaimsQuery(schedule.tenantId, config);
      break;
    case 'analytics':
      result = await executeAnalyticsQuery(schedule.tenantId, config);
      break;
    case 'custom':
      result = await executeCustomQuery(schedule.tenantId, config);
      break;
    default:
      result = await executeDefaultQuery(schedule.tenantId, config);
  }

  return {
    columns: Object.keys(result[0] || {}),
    rows: result,
    totalCount: result.length,
  };
}

/**
 * Execute claims report query
 */
async function executeClaimsQuery(tenantId: string, config: any): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      c.claim_number,
      c.status,
      c.priority,
      c.claim_type,
      c.claim_amount,
      c.date_filed,
      c.resolution_date,
      u.full_name as claimant_name,
      u.member_id
    FROM claims c
    LEFT JOIN user_profiles u ON c.user_id = u.user_id
    WHERE c.tenant_id = ${tenantId}
      AND c.created_at >= NOW() - INTERVAL '90 days'
    ORDER BY c.created_at DESC
    LIMIT 1000
  `);
  
  return result as any[];
}

/**
 * Execute analytics report query
 */
async function executeAnalyticsQuery(tenantId: string, config: any): Promise<any[]> {
  const groupBy = config.groupBy || 'status';

  // For analytics, we'll use sql.raw for the column name in GROUP BY
  // This is safe since it's coming from config which is controlled by admins
  const result = await db.execute(sql`
    SELECT 
      ${sql.raw(groupBy)} as category,
      COUNT(*) as count,
      AVG(claim_amount) as avg_amount,
      SUM(claim_amount) as total_amount
    FROM claims
    WHERE tenant_id = ${tenantId}
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY ${sql.raw(groupBy)}
    ORDER BY count DESC
    LIMIT 100
  `);
  
  return result as any[];
}

/**
 * Execute default query
 */
async function executeDefaultQuery(tenantId: string, config: any): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      id,
      claim_number,
      status,
      priority,
      claim_amount,
      created_at
    FROM claims
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT 500
  `);
  
  return result as any[];
}

/**
 * Execute custom query (unsafe - admin only)
 */
async function executeCustomQuery(tenantId: string, config: any): Promise<any[]> {
  // Custom queries are dangerous - they should be admin-controlled
  const customQuery = config.query || '';
  if (!customQuery) {
    return executeDefaultQuery(tenantId, config);
  }
  
  // Use raw query for custom SQL (already parameterized by admin)
  const result = await db.execute(sql.raw(customQuery));
  return result as any[];
}

// ============================================================================
// Export Generation
// ============================================================================

/**
 * Generate export file in the specified format
 */
async function generateExportFile(
  data: ReportData,
  format: string
): Promise<Buffer> {
  switch (format) {
    case 'csv':
      return generateCSV(data);
    case 'json':
      return generateJSON(data);
    case 'excel':
      return generateExcel(data);
    case 'pdf':
      return generatePDF(data);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate CSV file
 */
function generateCSV(data: ReportData): Buffer {
  const lines: string[] = [];
  
  // Header row
  lines.push(data.columns.join(','));
  
  // Data rows
  for (const row of data.rows) {
    const values = data.columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma
      return str.includes(',') || str.includes('"') 
        ? `"${str.replace(/"/g, '""')}"` 
        : str;
    });
    lines.push(values.join(','));
  }

  return Buffer.from(lines.join('\n'), 'utf-8');
}

/**
 * Generate JSON file
 */
function generateJSON(data: ReportData): Buffer {
  const output = {
    columns: data.columns,
    data: data.rows,
    totalCount: data.totalCount,
    generatedAt: new Date().toISOString(),
  };

  return Buffer.from(JSON.stringify(output, null, 2), 'utf-8');
}

/**
 * Generate Excel file (XLSX)
 * Note: In production, use a library like 'exceljs'
 */
function generateExcel(data: ReportData): Buffer {
  // For now, return CSV format
  // TODO: Implement proper Excel generation with exceljs
  return generateCSV(data);
}

/**
 * Generate PDF file
 * Note: In production, use a library like 'pdfkit' or 'puppeteer'
 */
function generatePDF(data: ReportData): Buffer {
  // For now, return a simple text representation
  // TODO: Implement proper PDF generation
  const lines = [
    'Report Generated: ' + new Date().toISOString(),
    '',
    'Total Records: ' + data.totalCount,
    '',
    data.columns.join(' | '),
    '-'.repeat(80),
  ];

  data.rows.slice(0, 100).forEach(row => {
    const values = data.columns.map(col => String(row[col] || ''));
    lines.push(values.join(' | '));
  });

  return Buffer.from(lines.join('\n'), 'utf-8');
}

// ============================================================================
// File Storage
// ============================================================================

/**
 * Upload file to storage
 * TODO: Implement actual storage (S3, Azure Blob, etc.)
 */
async function uploadFile(
  buffer: Buffer,
  scheduleId: string,
  format: string
): Promise<string> {
  // For now, return a placeholder URL
  // In production, upload to S3, Azure Blob Storage, etc.
  const timestamp = Date.now();
  const filename = `scheduled-report-${scheduleId}-${timestamp}.${format}`;
  
  // TODO: Actual upload implementation
  // const uploadResult = await s3.upload({ ... });
  // return uploadResult.Location;

  return `/exports/${filename}`;
}

// ============================================================================
// Delivery
// ============================================================================

/**
 * Deliver report via the configured method
 */
async function deliverReport(
  schedule: ScheduledReport,
  fileUrl: string,
  fileBuffer: Buffer
): Promise<void> {
  switch (schedule.deliveryMethod) {
    case 'email':
      await deliverViaEmail(schedule, fileUrl, fileBuffer);
      break;
    case 'dashboard':
      // No action needed - file is already accessible via fileUrl
      console.log(`[Executor] Report available at: ${fileUrl}`);
      break;
    case 'storage':
      // Already uploaded in previous step
      console.log(`[Executor] Report stored at: ${fileUrl}`);
      break;
    case 'webhook':
      await deliverViaWebhook(schedule, fileUrl);
      break;
    default:
      console.warn(`[Executor] Unknown delivery method: ${schedule.deliveryMethod}`);
  }
}

/**
 * Deliver report via email
 */
async function deliverViaEmail(
  schedule: ScheduledReport,
  fileUrl: string,
  fileBuffer: Buffer
): Promise<void> {
  // Import email function (will create in next file)
  const { sendScheduledReportEmail } = await import('@/lib/email/report-email-templates');
  
  await sendScheduledReportEmail({
    schedule,
    fileUrl,
    fileBuffer,
  });
}

/**
 * Deliver report via webhook
 */
async function deliverViaWebhook(
  schedule: ScheduledReport,
  fileUrl: string
): Promise<void> {
  const webhookUrl = (schedule.scheduleConfig as any).webhookUrl;
  
  if (!webhookUrl) {
    throw new Error('Webhook URL not configured');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scheduleId: schedule.id,
      reportId: schedule.reportId,
      fileUrl,
      generatedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.statusText}`);
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Retry failed executions
 */
export async function retryFailedExecution(
  scheduleId: string,
  maxRetries = 3
): Promise<ExecutionResult> {
  // Get the schedule
  const result = await db.execute(sql`
    SELECT * FROM report_schedules WHERE id = ${scheduleId}
  `);
  
  const rows = result as any[];
  if (rows.length === 0) {
    throw new Error('Schedule not found');
  }

  const schedule = rows[0];

  if (schedule.failure_count >= maxRetries) {
    console.error(`[Executor] Max retries exceeded for schedule ${scheduleId}`);
    return {
      success: false,
      scheduleId,
      error: 'Max retries exceeded',
    };
  }

  console.log(`[Executor] Retrying execution for schedule ${scheduleId} (attempt ${schedule.failure_count + 1})`);
  
  return await executeScheduledReport(schedule);
}
