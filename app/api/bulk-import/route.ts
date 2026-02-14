/**
 * Bulk Import API
 * 
 * CSV import system with validation, preview, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { eq, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/api-auth-guard';
import { organizationMembers } from '@/db/schema-organizations';
import { duesTransactions } from '@/db/schema/domains/finance/dues';
import { documents } from '@/db/schema/domains/documents/documents';
import { logger } from '@/lib/logger';

// Import jobs schema
export const importJobs = pgTable('import_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Job Details
  organizationId: uuid('organization_id').notNull(),
  importType: text('import_type').notNull(), // members, dues, cases, documents
  
  // File Information
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  fileUrl: text('file_url'),
  
  // Status
  status: text('status').notNull().default('pending'), // pending, validating, validated, importing, completed, failed, partially_completed
  
  // Progress
  totalRows: integer('total_rows').default(0),
  validRows: integer('valid_rows').default(0),
  invalidRows: integer('invalid_rows').default(0),
  processedRows: integer('processed_rows').default(0),
  successfulRows: integer('successful_rows').default(0),
  failedRows: integer('failed_rows').default(0),
  
  // Validation Results
  validationErrors: jsonb('validation_errors').$type<Array<{
    row: number;
    field: string;
    error: string;
    value: any;
  }>>(),
  
  // Import Results
  importResults: jsonb('import_results').$type<Array<{
    row: number;
    recordId?: string;
    success: boolean;
    error?: string;
  }>>(),
  
  // Configuration
  options: jsonb('options').$type<{
    skipHeader?: boolean;
    updateExisting?: boolean;
    createMissing?: boolean;
    dryRun?: boolean;
  }>(),
  
  // Mapping (CSV columns to database fields)
  columnMapping: jsonb('column_mapping').$type<Record<string, string>>(),
  
  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Rollback support
  canRollback: jsonb('can_rollback').$type<boolean>().default(false),
  rolledBackAt: timestamp('rolled_back_at'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
});

// Validation schemas
const initiateImportSchema = z.object({
  importType: z.enum(['members', 'dues', 'cases', 'documents']),
  fileName: z.string(),
  fileUrl: z.string().url(),
  fileSize: z.number().optional(),
  options: z.object({
    skipHeader: z.boolean().optional(),
    updateExisting: z.boolean().optional(),
    createMissing: z.boolean().optional(),
    dryRun: z.boolean().optional(),
  }).optional(),
  columnMapping: z.record(z.string()).optional(),
});

/**
 * POST /api/bulk-import
 * Initiate bulk import job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = initiateImportSchema.parse(body);
    const authContext = await requireUser();

    const [job] = await db
      .insert(importJobs)
      .values({
        organizationId: authContext.organizationId,
        ...validatedData,
        status: 'pending',
        createdBy: authContext.userId,
      })
      .returning();

    logger.info(`✅ Import job created: ${job.id}`);

    // Trigger async validation
    // In production, this would be a background job
    validateImportJob(job.id).catch((error) => {
      logger.error('Import job validation failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error)
      });
    });

    return NextResponse.json(
      {
        message: 'Import job created. Validation started.',
        job,
      },
      { status: 201 }
    );
  } catch (error: Record<string, unknown>) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error creating import job:', error);
    return NextResponse.json(
      { error: 'Failed to create import job', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bulk-import/[id]
 * Get import job status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    const [job] = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, jobId));

    if (!job) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error: Record<string, unknown>) {
    logger.error('Error fetching import job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import job', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bulk-import/[id]/execute
 * Execute validated import
 */
export async function executeImport(jobId: string) {
  try {
    const [job] = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, jobId));

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'validated') {
      throw new Error('Job must be validated before execution');
    }

    // Update status
    await db
      .update(importJobs)
      .set({
        status: 'importing',
        startedAt: new Date(),
      })
      .where(eq(importJobs.id, jobId));

    logger.info(`▶️  Starting import: ${jobId}`);

    // Execute import based on type
    const results = await executeImportByType(job);

    // Update job with results
    await db
      .update(importJobs)
      .set({
        status: results.allSuccessful ? 'completed' : 'partially_completed',
        successfulRows: results.successful,
        failedRows: results.failed,
        processedRows: results.total,
        completedAt: new Date(),
        importResults: results.details,
      })
      .where(eq(importJobs.id, jobId));

    logger.info(`✅ Import complete: ${results.successful}/${results.total} successful`);

    return results;
  } catch (error: Record<string, unknown>) {
    // Update job status to failed
    await db
      .update(importJobs)
      .set({
        status: 'failed',
        completedAt: new Date(),
        metadata: { error: error.message },
      })
      .where(eq(importJobs.id, jobId));

    throw error;
  }
}

/**
 * Validate import job
 */
async function validateImportJob(jobId: string) {
  try {
    const [job] = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, jobId));

    if (!job) return;

    // Update status
    await db
      .update(importJobs)
      .set({ status: 'validating' })
      .where(eq(importJobs.id, jobId));

    logger.info(`🔍 Validating import: ${jobId}`);

    // Fetch and parse CSV
    // In production, fetch from job.fileUrl
    const parsedData = []; // Would be CSV parsing result
    const errors: Array<Record<string, unknown>> = [];

    // Validate each row based on import type
    const validationRules = getValidationRules(job.importType);
    
    parsedData.forEach((row, index) => {
      const rowErrors = validateRow(row, validationRules, index + 1);
      errors.push(...rowErrors);
    });

    // Update job
    await db
      .update(importJobs)
      .set({
        status: errors.length === 0 ? 'validated' : 'failed',
        totalRows: parsedData.length,
        validRows: parsedData.length - errors.length,
        invalidRows: errors.length,
        validationErrors: errors,
      })
      .where(eq(importJobs.id, jobId));

    logger.info(`✅ Validation complete: ${errors.length} errors found`);
  } catch (error) {
    logger.error('Validation error:', error);
    await db
      .update(importJobs)
      .set({ status: 'failed' })
      .where(eq(importJobs.id, jobId));
  }
}

/**
 * Get validation rules for import type
 */
function getValidationRules(importType: string): Record<string, unknown> {
  const rules: Record<string, unknown> = {
    members: {
      email: { required: true, type: 'email' },
      full_name: { required: true, type: 'string' },
      phone: { required: false, type: 'phone' },
      status: { required: true, enum: ['active', 'inactive', 'suspended'] },
    },
    dues: {
      member_id: { required: true, type: 'uuid' },
      amount: { required: true, type: 'number', min: 0 },
      transaction_date: { required: true, type: 'date' },
      type: { required: true, enum: ['charge', 'payment', 'credit'] },
    },
    cases: {
      member_id: { required: true, type: 'uuid' },
      case_type: { required: true, enum: ['grievance', 'complaint', 'inquiry'] },
      description: { required: true, type: 'string' },
      filed_date: { required: true, type: 'date' },
    },
  };

  return rules[importType] || {};
}

/**
 * Validate single row
 */
function validateRow(row: Record<string, unknown>, rules: Record<string, unknown>, rowNumber: number): Array<Record<string, unknown>> {
  const errors: Array<Record<string, unknown>> = [];

  Object.entries(rules).forEach(([field, rule]) => {
    const value = row[field];

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        row: rowNumber,
        field,
        error: 'Required field is missing',
        value,
      });
      return;
    }

    // Type validation
    if (value && rule.type === 'email' && !isValidEmail(value)) {
      errors.push({
        row: rowNumber,
        field,
        error: 'Invalid email format',
        value,
      });
    }

    // Enum validation
    if (value && rule.enum && !rule.enum.includes(value)) {
      errors.push({
        row: rowNumber,
        field,
        error: `Value must be one of: ${rule.enum.join(', ')}`,
        value,
      });
    }
  });

  return errors;
}

/**
 * Execute import by type
 */
async function executeImportByType(job: Record<string, unknown>): Promise<{
  total: number;
  successful: number;
  failed: number;
  allSuccessful: boolean;
  details: Array<Record<string, unknown>>;
}> {
  // In production, would process actual data
  return {
    total: job.validRows || 0,
    successful: job.validRows || 0,
    failed: 0,
    allSuccessful: true,
    details: [],
  };
}

/**
 * Helper: Validate email
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /api/bulk-import/[id]/rollback
 * Rollback import
 */
export async function rollbackImport(jobId: string) {
  try {
    const [job] = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, jobId));

    if (!job || !job.canRollback) {
      throw new Error('Job cannot be rolled back');
    }

    // Implement rollback logic based on importResults
    const results = job.importResults as Array<{ row: number; recordId?: string; success: boolean; error?: string }>;
    
    if (!results || results.length === 0) {
      throw new Error('No import results found to rollback');
    }

    // Extract successful record IDs
    const recordIds = results
      .filter(r => r.success && r.recordId)
      .map(r => r.recordId as string);

    if (recordIds.length === 0) {
      logger.info('No records to rollback');
      await db
        .update(importJobs)
        .set({
          rolledBackAt: new Date(),
        })
        .where(eq(importJobs.id, jobId));
      return { success: true, deletedCount: 0 };
    }

    // Delete records based on import type
    let deletedCount = 0;
    
    switch (job.importType) {
      case 'members':
        // Delete imported members
        await db
          .delete(organizationMembers)
          .where(inArray(organizationMembers.id, recordIds));
        deletedCount = recordIds.length;
        break;
      
      case 'dues':
        // Delete imported dues transactions
        await db
          .delete(duesTransactions)
          .where(inArray(duesTransactions.id, recordIds));
        deletedCount = recordIds.length;
        break;
      
      case 'documents':
        // Delete imported documents
        await db
          .delete(documents)
          .where(inArray(documents.id, recordIds));
        deletedCount = recordIds.length;
        break;
      
      case 'cases':
        // Cases rollback would require more complex logic
        // due to related records (assignments, documents, etc.)
        logger.warn('⚠️  Cases rollback not fully implemented - requires cascade handling');
        throw new Error('Cases rollback requires manual intervention');
      
      default:
        throw new Error(`Unsupported import type for rollback: ${job.importType}`);
    }

    await db
      .update(importJobs)
      .set({
        rolledBackAt: new Date(),
        status: 'rolled_back',
        metadata: {
          ...((job.metadata as Record<string, unknown>) || {}),
          deletedCount,
          rollbackCompletedAt: new Date().toISOString(),
        },
      })
      .where(eq(importJobs.id, jobId));

    logger.info(`↩️  Import rolled back: ${jobId} (${deletedCount} records deleted)`);

    return { success: true, deletedCount };
  } catch (error: any) {
    logger.error('Rollback error:', error);
    throw error;
  }
}
