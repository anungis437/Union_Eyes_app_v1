/**
 * Reports API
 * 
 * GET /api/reports - List all reports
 * POST /api/reports - Create new report
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser, BaseAuthContext } from '@/lib/api-auth-guard';
import { getReports, createReport } from '@/db/queries/analytics-queries';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
import { checkEntitlement, getCreditCost } from '@/lib/services/entitlements';

async function getHandler(req: NextRequest, context: BaseAuthContext) {
  const { userId, organizationId } = context;

  // Check entitlement for advanced analytics
  const entitlement = await checkEntitlement(organizationId!, 'advanced_analytics');
  if (!entitlement.allowed) {
    return NextResponse.json(
      { 
        error: entitlement.reason || 'Upgrade required for advanced analytics',
        upgradeUrl: entitlement.upgradeUrl,
        feature: 'advanced_analytics',
        tier: entitlement.tier
      },
      { status: 403 }
    );
  }

  // Rate limit reports list
  const rateLimitResult = await checkRateLimit(
    `reports-list:${userId}`,
    RATE_LIMITS.ANALYTICS_QUERY
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.'
    );
  }

  try {
    if (!organizationId || !userId) {
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

    const reports = await getReports(organizationId, userId, filters);

    // Log audit event
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/reports',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      details: { count: reports.length, filters },
    });

    return standardSuccessResponse({ 
      reports,
      count: reports.length,
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch reports',
      error
    );
  }
}

async function postHandler(req: NextRequest, context: BaseAuthContext) {
  const { userId, organizationId } = context;

  // Check entitlement for advanced analytics (report builder)
  const entitlement = await checkEntitlement(organizationId!, 'advanced_analytics');
  if (!entitlement.allowed) {
    return NextResponse.json(
      { 
        error: entitlement.reason || 'Upgrade required for advanced analytics',
        upgradeUrl: entitlement.upgradeUrl,
        feature: 'advanced_analytics',
        tier: entitlement.tier
      },
      { status: 403 }
    );
  }

  // Rate limit report creation
  const rateLimitResult = await checkRateLimit(
    `reports-create:${userId}`,
    RATE_LIMITS.REPORT_BUILDER
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.'
    );
  }

  try {
    if (!organizationId || !userId) {
      return standardErrorResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Organization ID and User ID required'
      );
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.config) {
      return standardErrorResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Missing required fields: name, config'
      );
    }

    const report = await createReport(organizationId, userId, {
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
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/reports',
      method: 'POST',
      eventType: 'success',
      severity: 'low',
      details: { reportId: report.id, reportType: body.reportType, category: body.category },
    });

    return standardSuccessResponse({ 
      report,
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create report',
      error
    );
  }
}

export const GET = withRoleAuth('member', getHandler);

const reportsSchema = z.object({
  name: z.string().min(1, 'name is required'),
  config: z.unknown().optional(),
  description: z.string().optional(),
  reportType: z.unknown().optional(),
  category: z.unknown().optional(),
  isPublic: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
  templateId: z.string().uuid('Invalid templateId'),
});


export const POST = withRoleAuth('steward', postHandler);

