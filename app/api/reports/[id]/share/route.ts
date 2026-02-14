/**
 * Report Sharing API
 * 
 * POST /api/reports/[id]/share - Share report with users
 * GET /api/reports/[id]/share - Get report shares
 * DELETE /api/reports/[id]/share/[shareId] - Revoke share
 * 
 * Created: December 5, 2025
 * Part of: Phase 2 - Enhanced Analytics & Reports
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { db } from '@/db/db';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { NotificationService } from '@/lib/services/notification-service';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * GET - Get all shares for a report
 */
async function getHandler(
  req: NextRequest,
  context: any, Record<string, unknown>,
  params?: any
) {
  const reportId = params?.id || context?.params?.id;
  try {
    const organizationId = context.organizationId;
    const userId = context.userId;
    
    if (!organizationId || !userId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID and User ID required'
    );
    }

    // Verify user owns the report
    const report = await db.execute(sql`
      SELECT * FROM reports
      WHERE id = ${reportId} AND organization_id = ${organizationId} AND created_by = ${userId}
    `);

    if (report.length === 0) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Report not found or access denied'
    );
    }

    // Get all shares for this report
    const shares = await db.execute(sql`
      SELECT 
        rs.*,
        u.email as shared_with_email,
        u.first_name,
        u.last_name
      FROM report_shares rs
      LEFT JOIN users u ON u.id = rs.shared_with
      WHERE rs.report_id = ${reportId} AND rs.organization_id = ${organizationId}
      ORDER BY rs.created_at DESC
    `);

    return NextResponse.json({ 
      shares,
      count: shares.length,
    });

  } catch (error: Record<string, unknown>) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch report shares',
      error
    );
  }
}

/**
 * POST - Share report with user(s)
 */
async function postHandler(
  req: NextRequest,
  context: any, Record<string, unknown>,
  params?: any
) {
  const reportId = params?.id || context?.params?.id;
  try {
    const organizationId = context.organizationId;
    const userId = context.userId;
    
    if (!organizationId || !userId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID and User ID required'
    );
    }

    const body = await req.json();

    // Validate required fields
    if (!body.sharedWith) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'sharedWith is required'
    );
    }

    // Verify user owns the report
    const report = await db.execute(sql`
      SELECT * FROM reports
      WHERE id = ${reportId} AND organization_id = ${organizationId} AND created_by = ${userId}
    `);

    if (report.length === 0) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Report not found or access denied'
    );
    }

    // Create share (or shares if array provided)
    const sharedWithList = Array.isArray(body.sharedWith) ? body.sharedWith : [body.sharedWith];
    const shares = [];

    for (const sharedWithId of sharedWithList) {
      // Check if share already exists
      const existing = await db.execute(sql`
        SELECT id FROM report_shares
        WHERE report_id = ${reportId} 
          AND shared_with = ${sharedWithId}
          AND organization_id = ${organizationId}
      `);

      if (existing.length > 0) {
        // Update existing share
        await db.execute(sql`
          UPDATE report_shares
          SET can_edit = ${body.canEdit || false},
              can_execute = ${body.canExecute !== false},
              expires_at = ${body.expiresAt || null}
          WHERE id = ${existing[0].id}
        `);
        shares.push(existing[0]);
      } else {
        // Create new share
        const result = await db.execute(sql`
          INSERT INTO report_shares (
            report_id, organization_id, shared_by, shared_with,
            can_edit, can_execute, expires_at
          ) VALUES (
            ${reportId}, ${organizationId}, ${userId}, ${sharedWithId},
            ${body.canEdit || false}, ${body.canExecute !== false}, ${body.expiresAt || null}
          )
          RETURNING *
        `);
        shares.push(result[0]);
      }
    }

    // Send email notifications to shared users
    try {
      const notificationService = new NotificationService();
      const reportDetails = report[0] as Record<string, unknown>;
      
      for (const sharedWithId of sharedWithList) {
        // Get user email
        const userResult = await db.execute(sql`
          SELECT email, first_name, last_name FROM users WHERE id = ${sharedWithId}
        `);
        
        if (userResult.length > 0) {
          const user = userResult[0] as Record<string, unknown>;
          const sharerResult = await db.execute(sql`
            SELECT email, first_name, last_name FROM users WHERE id = ${userId}
          `);
          const sharer = sharerResult.length > 0 ? (sharerResult[0] as Record<string, unknown>) : { first_name: 'A user' };
          
          await notificationService.send({
            organizationId,
            recipientId: sharedWithId,
            recipientEmail: user.email,
            type: 'email',
            priority: 'normal',
            subject: 'Report Shared With You',
            body: `${sharer.first_name || 'A user'} has shared a report with you.\n\nReport ID: ${reportId}\nPermissions: ${body.canEdit ? 'Can Edit, ' : ''}Can Execute\n\nYou can now access this report.`,
            htmlBody: `
              <h2>Report Shared With You</h2>
              <p>${sharer.first_name || 'A user'} has shared a report with you.</p>
              <ul>
                <li><strong>Report ID:</strong> ${reportId}</li>
                <li><strong>Permissions:</strong> ${body.canEdit ? 'Can Edit, ' : ''}Can Execute</li>
                ${body.expiresAt ? `<li><strong>Expires:</strong> ${new Date(body.expiresAt).toLocaleDateString()}</li>` : ''}
              </ul>
              <p>You can now access this report from your dashboard.</p>
            `,
            actionUrl: `/reports/${reportId}`,
            actionLabel: 'View Report',
            metadata: {
              reportId,
              sharedBy: userId,
              canEdit: body.canEdit || false,
            },
          });
        }
      }
    } catch (error) {
// Don&apos;t fail the share operation if notifications fail
    }

    return NextResponse.json({ 
      shares,
      message: `Report shared with ${shares.length} user(s)`,
    }, { status: 201 });

  } catch (error: Record<string, unknown>) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to share report',
      error
    );
  }
}

/**
 * DELETE - Revoke report share
 */
async function deleteHandler(
  req: NextRequest,
  context: any, Record<string, unknown>,
  params?: any
) {
  const reportId = params?.id || context?.params?.id;
  try {
    const organizationId = context.organizationId;
    const userId = context.userId;
    
    if (!organizationId || !userId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID and User ID required'
    );
    }

    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'shareId query parameter required'
    );
    }

    // Verify user owns the report
    const report = await db.execute(sql`
      SELECT * FROM reports
      WHERE id = ${reportId} AND organization_id = ${organizationId} AND created_by = ${userId}
    `);

    if (report.length === 0) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Report not found or access denied'
    );
    }

    // Delete share
    await db.execute(sql`
      DELETE FROM report_shares
      WHERE id = ${shareId} 
        AND report_id = ${reportId}
        AND organization_id = ${organizationId}
    `);

    return NextResponse.json({ 
      message: 'Report share revoked successfully',
    });

  } catch (error: Record<string, unknown>) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to revoke report share',
      error
    );
  }
}

export const GET = withApiAuth(getHandler);

const reportsShareSchema = z.object({
  sharedWith: z.unknown().optional(),
  canEdit: z.unknown().optional(),
  canExecute: z.unknown().optional(),
  expiresAt: z.unknown().optional(),
});


export const POST = withApiAuth(postHandler);
export const DELETE = withApiAuth(deleteHandler);
