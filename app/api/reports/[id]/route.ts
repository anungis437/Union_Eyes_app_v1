/**
 * Report Details API
 * 
 * GET /api/reports/[id] - Get report details
 * PUT /api/reports/[id] - Update report
 * DELETE /api/reports/[id] - Delete report
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { db } from '@/db';
import { sql } from '@/db';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

async function getHandler(
  req: NextRequest,
  context: any, Record<string, unknown>,
  params?: { id: string }
) {
  const { userId, organizationId } = context;

  // Rate limit report fetching
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.ANALYTICS_QUERY,
    `report-get:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.'
    );
  }

  try {
    if (!params?.id) {
      return NextResponse.json(
        { error: 'Report ID required' },
        { status: 400 }
      );
    }

    const reportResult = await db.execute(sql`
      SELECT 
        r.*,
        om.first_name || ' ' || om.last_name AS created_by_name
      FROM reports r
      LEFT JOIN organization_members om ON om.id = r.created_by AND om.organization_id = r.organization_id
      WHERE r.id = ${params.id} AND r.organization_id = ${organizationId}
    `);

    if (!reportResult || reportResult.length === 0) {
      return standardErrorResponse(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Report not found'
      );
    }

    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'report_fetch',
      resourceType: 'report',
      resourceId: params.id,
      dataType: 'ANALYTICS',
    });

    return standardSuccessResponse({ report: reportResult[0] });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch report',
      error
    );
  }
}

async function putHandler(
  req: NextRequest,
  context: any, Record<string, unknown>,
  params?: { id: string }
) {
  const { userId, organizationId } = context;

  // Rate limit report updates
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.REPORT_BUILDER,
    `report-update:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.'
    );
  }

  try {
    if (!params?.id) {
      return NextResponse.json(
        { error: 'Report ID required' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Verify ownership or admin
    const existingResult = await db.execute(sql`
      SELECT created_by FROM reports 
      WHERE id = ${params.id} AND organization_id = ${context.organizationId}
    `);

    if (!existingResult || existingResult.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Update report
    const updatedResult = await db.execute(sql`
      UPDATE reports
      SET name = ${body.name || sql`name`},
          description = ${body.description !== undefined ? body.description : sql`description`},
          category = ${body.category !== undefined ? body.category : sql`category`},
          config = ${body.config ? JSON.stringify(body.config) : sql`config`},
          is_public = ${body.isPublic !== undefined ? body.isPublic : sql`is_public`},
          updated_at = NOW()
      WHERE id = ${params.id} AND organization_id = ${context.organizationId}
      RETURNING *
    `);

    return standardSuccessResponse({ report: updatedResult[0] });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update report',
      error
    );
  }
}

async function deleteHandler(
  req: NextRequest,
  context: any, Record<string, unknown>,
  params?: { id: string }
) {
  const { userId, organizationId } = context;

  // Rate limit report deletion
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.REPORT_BUILDER,
    `report-delete:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.'
    );
  }

  try {
    if (!params?.id) {
      return standardErrorResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Report ID required'
      );
    }

    // Verify ownership or admin
    const existingResult = await db.execute(sql`
      SELECT created_by FROM reports 
      WHERE id = ${params.id} AND organization_id = ${organizationId}
    `);

    if (!existingResult || existingResult.length === 0) {
      return standardErrorResponse(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Report not found'
      );
    }

    // Delete report
    await db.execute(sql`
      DELETE FROM reports
      WHERE id = ${params.id} AND organization_id = ${organizationId}
    `);

    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'report_delete',
      resourceType: 'report',
      resourceId: params.id,
      dataType: 'ANALYTICS',
    });

    return standardSuccessResponse(null, 'Report deleted successfully');
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete report',
      error
    );
  }
}

export const GET = withEnhancedRoleAuth(30, getHandler);

const reportsSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  category: z.unknown().optional(),
  config: z.unknown().optional(),
  isPublic: z.boolean().optional(),
});


export const PUT = withEnhancedRoleAuth(50, putHandler);
export const DELETE = withEnhancedRoleAuth(60, deleteHandler);
