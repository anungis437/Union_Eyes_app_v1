/**
 * Report Details API
 * 
 * GET /api/reports/[id] - Get report details
 * PUT /api/reports/[id] - Update report
 * DELETE /api/reports/[id] - Delete report
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { sql } from '@/lib/db';

async function getHandler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const report = await sql`
      SELECT 
        r.*,
        om.first_name || ' ' || om.last_name AS created_by_name
      FROM reports r
      LEFT JOIN organization_members om ON om.id = r.created_by AND om.tenant_id = r.tenant_id
      WHERE r.id = ${params.id} AND r.tenant_id = ${tenantId}
    `;

    if (!report || report.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report: report[0] });
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
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    const userId = req.headers.get('x-user-id');
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID required' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Verify ownership or admin
    const existing = await sql`
      SELECT created_by FROM reports 
      WHERE id = ${params.id} AND tenant_id = ${tenantId}
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Update report
    const updated = await sql`
      UPDATE reports
      SET name = ${body.name || sql`name`},
          description = ${body.description !== undefined ? body.description : sql`description`},
          category = ${body.category !== undefined ? body.category : sql`category`},
          config = ${body.config ? JSON.stringify(body.config) : sql`config`},
          is_public = ${body.isPublic !== undefined ? body.isPublic : sql`is_public`},
          updated_at = NOW()
      WHERE id = ${params.id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    return NextResponse.json({ report: updated[0] });
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
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    const userId = req.headers.get('x-user-id');
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID required' },
        { status: 400 }
      );
    }

    // Verify ownership or admin
    const existing = await sql`
      SELECT created_by FROM reports 
      WHERE id = ${params.id} AND tenant_id = ${tenantId}
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Delete report
    await sql`
      DELETE FROM reports
      WHERE id = ${params.id} AND tenant_id = ${tenantId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    );
  }
}

export const GET = withTenantAuth(getHandler);
export const PUT = withTenantAuth(putHandler);
export const DELETE = withTenantAuth(deleteHandler);
