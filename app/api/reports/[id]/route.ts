/**
 * Report Details API
 * 
 * GET /api/reports/[id] - Get report details
 * PUT /api/reports/[id] - Update report
 * DELETE /api/reports/[id] - Delete report
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth, OrganizationContext } from '@/lib/organization-middleware';
import { db } from '@/db';
import { sql } from '@/db';

async function getHandler(
  req: NextRequest,
  context: OrganizationContext,
  params?: { id: string }
) {
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
      LEFT JOIN organization_members om ON om.id = r.created_by AND om.tenant_id = r.tenant_id
      WHERE r.id = ${params.id} AND r.tenant_id = ${context.organizationId}
    `);

    if (!reportResult || reportResult.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report: reportResult[0] });
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

async function putHandler(
  req: NextRequest,
  context: OrganizationContext,
  params?: { id: string }
) {
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
      WHERE id = ${params.id} AND tenant_id = ${context.organizationId}
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
      WHERE id = ${params.id} AND tenant_id = ${context.organizationId}
      RETURNING *
    `);

    return NextResponse.json({ report: updatedResult[0] });
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  req: NextRequest,
  context: OrganizationContext,
  params?: { id: string }
) {
  try {
    if (!params?.id) {
      return NextResponse.json(
        { error: 'Report ID required' },
        { status: 400 }
      );
    }

    // Verify ownership or admin
    const existingResult = await db.execute(sql`
      SELECT created_by FROM reports 
      WHERE id = ${params.id} AND tenant_id = ${context.organizationId}
    `);

    if (!existingResult || existingResult.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Delete report
    await db.execute(sql`
      DELETE FROM reports
      WHERE id = ${params.id} AND tenant_id = ${context.organizationId}
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(getHandler);
export const PUT = withOrganizationAuth(putHandler);
export const DELETE = withOrganizationAuth(deleteHandler);
