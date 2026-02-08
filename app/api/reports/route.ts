/**
 * Reports API
 * 
 * GET /api/reports - List all reports
 * POST /api/reports - Create new report
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { getReports, createReport } from '@/db/queries/analytics-queries';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

async function getHandler(req: NextRequest, context) {
  const { userId, organizationId } = context;

  // Rate limit reports list
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.ANALYTICS_QUERY,
    `reports-list:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
      { status: 429 }
    );
  }

  try {
    const tenantId = organizationId;
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Organization ID and User ID required' },
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

    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'reports_list',
      resourceType: 'report',
      resourceId: 'all',
      metadata: { count: reports.length, filters },
      dataType: 'ANALYTICS',
    });

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
  const { userId, organizationId } = context;

  // Rate limit report creation
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.REPORT_BUILDER,
    `reports-create:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
      { status: 429 }
    );
  }

  try {
    const tenantId = organizationId;
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Organization ID and User ID required' },
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

    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'report_create',
      resourceType: 'report',
      resourceId: report.id,
      metadata: { reportType: body.reportType, category: body.category },
      dataType: 'ANALYTICS',
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

export const GET = withEnhancedRoleAuth(30, getHandler);
export const POST = withEnhancedRoleAuth(50, postHandler);
