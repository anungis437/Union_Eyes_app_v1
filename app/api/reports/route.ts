/**
 * Reports API
 * 
 * GET /api/reports - List all reports
 * POST /api/reports - Create new report
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { getReports, createReport } from '@/db/queries/analytics-queries';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

async function getHandler(req: NextRequest, context) {
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

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const filters = {
      category: searchParams.get('category') || undefined,
      isTemplate: searchParams.get('isTemplate') === 'true' ? true : searchParams.get('isTemplate') === 'false' ? false : undefined,
      isPublic: searchParams.get('isPublic') === 'true' ? true : searchParams.get('isPublic') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
    };

    const reports = await getReports(tenantId, userId, filters);

    return NextResponse.json({ 
      reports,
      count: reports.length,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest, context) {
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
    if (!body.name || !body.config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, config' },
        { status: 400 }
      );
    }

    const report = await createReport(tenantId, userId, {
      name: body.name,
      description: body.description,
      reportType: body.reportType || 'custom',
      category: body.category || 'custom',
      config: body.config,
      isPublic: body.isPublic || false,
      isTemplate: body.isTemplate || false,
      templateId: body.templateId,
    });

    return NextResponse.json({ 
      report,
      message: 'Report created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(getHandler);
export const POST = withOrganizationAuth(postHandler);
