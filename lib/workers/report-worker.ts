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
import { 
  grievanceWorkflows,
  grievanceStages,
  grievanceTransitions,
  grievanceAssignments,
  grievanceSettlements 
} from '../../db/schema/grievance-workflow-schema';
import { getNotificationService } from '../services/notification-service';
import { eq, and, between, gte, lte, desc } from 'drizzle-orm';
import { generatePDF } from '../utils/pdf-generator';
import { generateExcel } from '../utils/excel-generator';
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
 */
async function generateGrievancesReport(
  tenantId: string,
  parameters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    stageType?: string;
    format: 'pdf' | 'excel';
  }
) {
  console.log('Generating grievances report', parameters);

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

  // Query grievance claims with latest transition info
  const data = await db
    .select({
      id: claims.claimId,
      claimNumber: claims.claimNumber,
      subject: claims.subject,
      description: claims.description,
      status: claims.status,
      priority: claims.priority,
      memberId: claims.memberId,
      createdAt: claims.createdAt,
      updatedAt: claims.updatedAt,
      resolvedAt: claims.resolvedAt,
      // Could join with transitions/assignments for more info
    })
    .from(claims)
    .where(and(...conditions))
    .orderBy(desc(claims.createdAt));

  // Generate report based on format
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
        { header: 'Claim #', key: 'claimNumber' },
        { header: 'Subject', key: 'subject' },
        { header: 'Member ID', key: 'memberId' },
        { header: 'Status', key: 'status' },
        { header: 'Priority', key: 'priority' },
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

  // Gather usage statistics
  const claimsData = await db
    .select()
    .from(claims)
    .where(
      and(
        eq(claims.organizationId, tenantId),
        between(claims.createdAt, new Date(parameters.startDate), new Date(parameters.endDate))
      )
    );

  const membersData = await db
    .select()
    .from(members)
    .where(eq(members.organizationId, tenantId));

  const newMembers = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.organizationId, tenantId),
        between(members.createdAt, new Date(parameters.startDate), new Date(parameters.endDate))
      )
    );

  // Count grievances (claims with grievance workflows)
  const grievanceTransitionsData = await db
    .select()
    .from(grievanceTransitions)
    .where(eq(grievanceTransitions.organizationId, tenantId));

  const data = {
    period: { start: parameters.startDate, end: parameters.endDate },
    claims: {
      total: claimsData.length,
      byStatus: claimsData.reduce((acc: any, claim) => {
        acc[claim.status] = (acc[claim.status] || 0) + 1;
        return acc;
      }, {}),
      byPriority: claimsData.reduce((acc: any, claim) => {
        acc[claim.priority] = (acc[claim.priority] || 0) + 1;
        return acc;
      }, {}),
    },
    members: {
      total: membersData.length,
      active: membersData.filter((m) => m.status === 'active').length,
      new: newMembers.length,
    },
    grievances: {
      total: grievanceTransitionsData.length,
      resolved: claimsData.filter((c) => c.resolvedAt !== null).length,
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
        { header: 'Resolved Grievances', key: 'grievances.resolved' },
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

      case 'grievances':
        buffer = await generateGrievancesReport(tenantId, parameters as any);
        filename = `grievances-report-${Date.now()}.${parameters.format}`;
        break;

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

    // Notify user that report is ready
    try {
      const user = await db.query.profiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, userId),
      });

      if (user?.email) {
        const notificationService = getNotificationService();
        await notificationService.send({
          organizationId: 'system',
          recipientId: userId,
          recipientEmail: user.email,
          type: 'email',
          priority: 'normal',
          subject: 'Your Report is Ready',
          body: `Your ${reportType} report has been generated and is ready for download.\n\nClick the link below to download your report.`,
          actionUrl: `/api/reports/${filename}`,
          actionLabel: 'Download Report',
          userId: 'system',
        }).catch((err) => {
          console.error('Failed to send report ready notification', { error: err, userId });
        });

        console.log(`Report ready notification sent to ${user.email}`);
      }
    } catch (notificationError) {
      console.error('Error sending report notification:', notificationError);
      // Don't fail the job if notification fails
    }

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
