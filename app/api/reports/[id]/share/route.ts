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

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { sql } from 'drizzle-orm';
import { db } from '@/db/db';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { NotificationService } from '@/lib/services/notification-service';

/**
 * GET - Get all shares for a report
 */
async function getHandler(
  req: NextRequest,
  context: any,
  params?: any
) {
  const reportId = params?.id || context?.params?.id;
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    const userId = context.userId;
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID required' },
        { status: 400 }
      );
    }

    // Verify user owns the report
    const report = await db.execute(sql`
      SELECT * FROM reports
      WHERE id = ${reportId} AND tenant_id = ${tenantId} AND created_by = ${userId}
    `);

    if (report.length === 0) {
      return NextResponse.json(
        { error: 'Report not found or access denied' },
        { status: 404 }
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
      WHERE rs.report_id = ${reportId} AND rs.tenant_id = ${tenantId}
      ORDER BY rs.created_at DESC
    `);

    return NextResponse.json({ 
      shares,
      count: shares.length,
    });

  } catch (error: any) {
    console.error('Get report shares error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report shares' },
      { status: 500 }
    );
  }
}

/**
 * POST - Share report with user(s)
 */
async function postHandler(
  req: NextRequest,
  context: any,
  params?: any
) {
  const reportId = params?.id || context?.params?.id;
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    const userId = context.userId;
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID required' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate required fields
    if (!body.sharedWith) {
      return NextResponse.json(
        { error: 'sharedWith is required' },
        { status: 400 }
      );
    }

    // Verify user owns the report
    const report = await db.execute(sql`
      SELECT * FROM reports
      WHERE id = ${reportId} AND tenant_id = ${tenantId} AND created_by = ${userId}
    `);

    if (report.length === 0) {
      return NextResponse.json(
        { error: 'Report not found or access denied' },
        { status: 404 }
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
          AND tenant_id = ${tenantId}
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
            report_id, tenant_id, shared_by, shared_with,
            can_edit, can_execute, expires_at
          ) VALUES (
            ${reportId}, ${tenantId}, ${userId}, ${sharedWithId},
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
      const reportDetails = report[0] as any;
      
      for (const sharedWithId of sharedWithList) {
        // Get user email
        const userResult = await db.execute(sql`
          SELECT email, first_name, last_name FROM users WHERE id = ${sharedWithId}
        `);
        
        if (userResult.length > 0) {
          const user = userResult[0] as any;
          const sharerResult = await db.execute(sql`
            SELECT email, first_name, last_name FROM users WHERE id = ${userId}
          `);
          const sharer = sharerResult.length > 0 ? (sharerResult[0] as any) : { first_name: 'A user' };
          
          await notificationService.send({
            organizationId: tenantId,
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
      console.error('Failed to send share notifications:', error);
      // Don't fail the share operation if notifications fail
    }

    return NextResponse.json({ 
      shares,
      message: `Report shared with ${shares.length} user(s)`,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Share report error:', error);
    return NextResponse.json(
      { error: 'Failed to share report' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Revoke report share
 */
async function deleteHandler(
  req: NextRequest,
  context: any,
  params?: any
) {
  const reportId = params?.id || context?.params?.id;
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    const userId = context.userId;
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'shareId query parameter required' },
        { status: 400 }
      );
    }

    // Verify user owns the report
    const report = await db.execute(sql`
      SELECT * FROM reports
      WHERE id = ${reportId} AND tenant_id = ${tenantId} AND created_by = ${userId}
    `);

    if (report.length === 0) {
      return NextResponse.json(
        { error: 'Report not found or access denied' },
        { status: 404 }
      );
    }

    // Delete share
    await db.execute(sql`
      DELETE FROM report_shares
      WHERE id = ${shareId} 
        AND report_id = ${reportId}
        AND tenant_id = ${tenantId}
    `);

    return NextResponse.json({ 
      message: 'Report share revoked successfully',
    });

  } catch (error: any) {
    console.error('Revoke report share error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke report share' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(getHandler);
export const POST = withApiAuth(postHandler);
export const DELETE = withApiAuth(deleteHandler);
