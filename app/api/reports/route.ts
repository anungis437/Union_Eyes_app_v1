/**
 * Reports API
 * 
 * GET /api/reports - List all reports
 * POST /api/reports - Create new report
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { getReports, createReport } from '@/db/queries/analytics-queries';

async function getHandler(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    const userId = req.headers.get('x-user-id');
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID required' },
        { status: 400 }
      );
    }

    const reports = await getReports(tenantId, userId);

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest) {
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
    
    // Validate required fields
    if (!body.name || !body.reportType || !body.config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, reportType, config' },
        { status: 400 }
      );
    }

    const report = await createReport(tenantId, userId, {
      name: body.name,
      description: body.description,
      reportType: body.reportType,
      category: body.category,
      config: body.config,
      isPublic: body.isPublic,
      isTemplate: body.isTemplate,
      templateId: body.templateId,
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

export const GET = withTenantAuth(getHandler);
export const POST = withTenantAuth(postHandler);
