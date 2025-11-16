/**
 * Report Worker - Processes report generation jobs
 * 
 * Generates various reports (PDF, Excel) and stores them for download
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ReportJobData } from '../job-queue';
import { db } from '@/db';
import { claims, members, grievances } from '@/db/schema';
import { eq, and, between, gte, lte, desc } from 'drizzle-orm';
import { generatePDF } from '../pdf-generator';
import { generateExcel } from '../excel-generator';
import fs from 'fs/promises';
import path from 'path';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const REPORTS_DIR = process.env.REPORTS_DIR || './reports';

/**
 * Ensure reports directory exists
 */
async function ensureReportsDir() {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating reports directory:', error);
  }
}

/**
 * Generate claims report
 */
async function generateClaimsReport(
  tenantId: string,
  parameters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    format: 'pdf' | 'excel';
  }
) {
  console.log('Generating claims report', parameters);

  // Build query
  let query = db
    .select()
    .from(claims)
    .where(eq(claims.tenantId, tenantId));

  // Add filters
  if (parameters.startDate && parameters.endDate) {
    query = query.where(
      between(claims.createdAt, new Date(parameters.startDate), new Date(parameters.endDate))
    );
  }

  if (parameters.status) {
    query = query.where(eq(claims.status, parameters.status));
  }

  // Execute query
  const data = await query.orderBy(desc(claims.createdAt));

  // Generate report based on format
  if (parameters.format === 'pdf') {
    return await generatePDF({
      title: 'Claims Report',
      data,
      template: 'claims-report',
    });
  } else {
    return await generateExcel({
      title: 'Claims Report',
      data,
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Member', key: 'memberId' },
        { header: 'Status', key: 'status' },
        { header: 'Priority', key: 'priority' },
        { header: 'Created', key: 'createdAt' },
        { header: 'Updated', key: 'updatedAt' },
      ],
    });
  }
}

/**
 * Generate members report
 */
async function generateMembersReport(
  tenantId: string,
  parameters: {
    status?: string;
    format: 'pdf' | 'excel';
  }
) {
  console.log('Generating members report', parameters);

  // Build query
  let query = db
    .select()
    .from(members)
    .where(eq(members.tenantId, tenantId));

  // Add filters
  if (parameters.status) {
    query = query.where(eq(members.status, parameters.status));
  }

  // Execute query
  const data = await query.orderBy(desc(members.createdAt));

  // Generate report
  if (parameters.format === 'pdf') {
    return await generatePDF({
      title: 'Members Report',
      data,
      template: 'members-report',
    });
  } else {
    return await generateExcel({
      title: 'Members Report',
      data,
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Status', key: 'status' },
        { header: 'Joined', key: 'createdAt' },
      ],
    });
  }
}

/**
 * Generate grievances report
 */
async function generateGrievancesReport(
  tenantId: string,
  parameters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    format: 'pdf' | 'excel';
  }
) {
  console.log('Generating grievances report', parameters);

  // Build query
  let query = db
    .select()
    .from(grievances)
    .where(eq(grievances.tenantId, tenantId));

  // Add filters
  if (parameters.startDate && parameters.endDate) {
    query = query.where(
      between(grievances.createdAt, new Date(parameters.startDate), new Date(parameters.endDate))
    );
  }

  if (parameters.status) {
    query = query.where(eq(grievances.status, parameters.status));
  }

  // Execute query
  const data = await query.orderBy(desc(grievances.createdAt));

  // Generate report
  if (parameters.format === 'pdf') {
    return await generatePDF({
      title: 'Grievances Report',
      data,
      template: 'grievances-report',
    });
  } else {
    return await generateExcel({
      title: 'Grievances Report',
      data,
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Member', key: 'memberId' },
        { header: 'Type', key: 'type' },
        { header: 'Status', key: 'status' },
        { header: 'Filed', key: 'createdAt' },
        { header: 'Resolved', key: 'resolvedAt' },
      ],
    });
  }
}

/**
 * Generate usage analytics report
 */
async function generateUsageReport(
  tenantId: string,
  parameters: {
    startDate: string;
    endDate: string;
    format: 'pdf' | 'excel';
  }
) {
  console.log('Generating usage report', parameters);

  // TODO: Gather usage statistics
  const data = {
    period: { start: parameters.startDate, end: parameters.endDate },
    claims: {
      total: 0,
      byStatus: {},
      byPriority: {},
    },
    members: {
      total: 0,
      active: 0,
      new: 0,
    },
    grievances: {
      total: 0,
      byType: {},
      resolved: 0,
    },
  };

  // Generate report
  if (parameters.format === 'pdf') {
    return await generatePDF({
      title: 'Usage Analytics Report',
      data,
      template: 'usage-report',
    });
  } else {
    return await generateExcel({
      title: 'Usage Analytics',
      data: [data],
      columns: [
        { header: 'Period Start', key: 'period.start' },
        { header: 'Period End', key: 'period.end' },
        { header: 'Total Claims', key: 'claims.total' },
        { header: 'Total Members', key: 'members.total' },
        { header: 'Active Members', key: 'members.active' },
        { header: 'Total Grievances', key: 'grievances.total' },
      ],
    });
  }
}

/**
 * Process report generation job
 */
async function processReportJob(job: Job<ReportJobData>) {
  const { reportType, tenantId, userId, parameters } = job.data;

  console.log(`Processing report job ${job.id}: ${reportType}`);

  await ensureReportsDir();

  await job.updateProgress(10);

  // Generate report based on type
  let buffer: Buffer;
  let filename: string;

  try {
    switch (reportType) {
      case 'claims':
        buffer = await generateClaimsReport(tenantId, parameters);
        filename = `claims-report-${Date.now()}.${parameters.format}`;
        break;

      case 'members':
        buffer = await generateMembersReport(tenantId, parameters);
        filename = `members-report-${Date.now()}.${parameters.format}`;
        break;

      case 'grievances':
        buffer = await generateGrievancesReport(tenantId, parameters);
        filename = `grievances-report-${Date.now()}.${parameters.format}`;
        break;

      case 'usage':
        buffer = await generateUsageReport(tenantId, parameters);
        filename = `usage-report-${Date.now()}.${parameters.format}`;
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    await job.updateProgress(70);

    // Save report file
    const filepath = path.join(REPORTS_DIR, filename);
    await fs.writeFile(filepath, buffer);

    console.log(`Report saved: ${filepath}`);

    await job.updateProgress(90);

    // TODO: Notify user that report is ready
    // await addNotificationJob({
    //   userId,
    //   title: 'Report Ready',
    //   message: `Your ${reportType} report is ready for download`,
    //   channels: ['email', 'in-app'],
    //   data: { reportUrl: `/api/reports/${filename}` },
    // });

    await job.updateProgress(100);

    return {
      success: true,
      filename,
      filepath,
      size: buffer.length,
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

// Create worker
export const reportWorker = new Worker(
  'reports',
  async (job: Job<ReportJobData>) => {
    return await processReportJob(job);
  },
  {
    connection,
    concurrency: 2, // Process 2 reports concurrently
  }
);

// Event handlers
reportWorker.on('completed', (job) => {
  console.log(`Report job ${job.id} completed`);
});

reportWorker.on('failed', (job, err) => {
  console.error(`Report job ${job?.id} failed:`, err.message);
});

reportWorker.on('error', (err) => {
  console.error('Report worker error:', err);
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down report worker...');
  await reportWorker.close();
  await connection.quit();
  console.log('Report worker stopped');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
