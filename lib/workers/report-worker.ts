/**
 * Report Worker - Processes report generation jobs
 * 
 * Generates various reports (PDF, Excel) and stores them for download
 */

// Only import bullmq in runtime, not during build
let Worker: any, Job: any, IORedis: any;

if (typeof window === 'undefined' && !process.env.__NEXT_BUILDING) {
  try {
    const bullmq = require('bullmq');
    Worker = bullmq.Worker;
    Job = bullmq.Job;
    IORedis = require('ioredis');
  } catch (e) {
    // Fail silently during build
  }
}

import { ReportJobData } from '../job-queue';
import { db } from '../../db/db';
import { claims } from '../../db/schema/claims-schema';
import { organizationMembers as members } from '../../db/schema/organization-members-schema';
// TODO: Create grievance schema - currently commented out
// import { grievances } from '../../db/schema/grievance-schema';
import { eq, and, between, gte, lte, desc } from 'drizzle-orm';
// TODO: Create PDF generator module
// import { generatePDF } from '../pdf-generator';
// TODO: Create Excel generator module
// import { generateExcel } from '../excel-generator';
import fs from 'fs/promises';
import path from 'path';

// Stub functions until generators are implemented
async function generatePDF(options: any): Promise<Buffer> {
  throw new Error('PDF generation not yet implemented');
}

async function generateExcel(options: any): Promise<Buffer> {
  throw new Error('Excel generation not yet implemented');
}

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

  // Build query with combined where conditions
  const conditions: any[] = [eq(claims.organizationId, tenantId)];
  
  if (parameters.startDate && parameters.endDate) {
    conditions.push(
      between(claims.createdAt, new Date(parameters.startDate), new Date(parameters.endDate))
    );
  }

  if (parameters.status) {
    conditions.push(eq(claims.status, parameters.status as any));
  }

  // Execute query
  const data = await db
    .select()
    .from(claims)
    .where(and(...conditions))
    .orderBy(desc(claims.createdAt));

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

  // Build query with combined where conditions
  const conditions: any[] = [eq(members.organizationId, tenantId)];
  
  if (parameters.status) {
    conditions.push(eq(members.status, parameters.status as any));
  }

  // Execute query
  const data = await db
    .select()
    .from(members)
    .where(and(...conditions))
    .orderBy(desc(members.createdAt));

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
 * TODO: Enable when grievance schema is created
 */
/* async function generateGrievancesReport(
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
    .where(eq(grievances.organizationId, tenantId));

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
} */

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
    // TODO: Enable when grievance schema is created
    // grievances: {
    //   total: 0,
    //   byType: {},
    //   resolved: 0,
    // },
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
        // TODO: Enable when grievance schema is created
        // { header: 'Total Grievances', key: 'grievances.total' },
      ],
    });
  }
}

/**
 * Process report generation job
 */
async function processReportJob(job: any) {
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
        buffer = await generateClaimsReport(tenantId, parameters as any);
        filename = `claims-report-${Date.now()}.${parameters.format}`;
        break;

      case 'members':
        buffer = await generateMembersReport(tenantId, parameters as any);
        filename = `members-report-${Date.now()}.${parameters.format}`;
        break;

      // TODO: Enable grievances reports when schema is created
      // case 'grievances':
      //   buffer = await generateGrievancesReport(tenantId, parameters);
      //   filename = `grievances-report-${Date.now()}.${parameters.format}`;
      //   break;

      case 'usage':
        buffer = await generateUsageReport(tenantId, parameters as any);
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
  async (job: any) => {
    return await processReportJob(job);
  },
  {
    connection,
    concurrency: 2, // Process 2 reports concurrently
  }
);

// Event handlers
reportWorker.on('completed', (job: any) => {
  console.log(`Report job ${job.id} completed`);
});

reportWorker.on('failed', (job: any, err: any) => {
  console.error(`Report job ${job?.id} failed:`, err.message);
});

reportWorker.on('error', (err: any) => {
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
