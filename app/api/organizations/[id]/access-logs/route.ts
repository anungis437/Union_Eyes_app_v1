import { NextRequest, NextResponse } from "next/server";
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { requireUser } from '@/lib/api-auth-guard';

import { createClient } from "@/packages/supabase/server";
import { logger } from '@/lib/logger';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * GET /api/organizations/[id]/access-logs
 * Retrieve cross-organization access logs for audit trail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null;
  try {
    const authResult = await requireUser();
    userId = authResult.userId;
    if (!userId) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const organizationId = params.id;
  if (authResult.organizationId && organizationId !== authResult.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }

    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    // Verify user has admin/officer access to this organization
    const { data: userOrgs } = await supabase.rpc("get_user_organizations");
    const hasAccess = (userOrgs as unknown as Array<Record<string, unknown>>)?.some(
      (org: Record<string, unknown>) => org.id === organizationId && ["admin", "officer"].includes(org.user_role)
    );

    if (!hasAccess) {
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Access denied - admin or officer role required'
    );
    }

    // Parse query parameters
    const resourceType = searchParams.get("resourceType"); // clause, precedent, analytics
    const accessType = searchParams.get("accessType"); // view, download, compare, cite
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // Build query for logs where this org is the resource owner
    let query = supabase
      .from("cross_org_access_log")
      .select(
        `
        id,
        resource_type,
        resource_id,
        access_type,
        accessed_at,
        ip_address,
        user_agent,
        user:user_id (
          id,
          email,
          full_name
        ),
        user_org:user_organization_id (
          id,
          name,
          type
        ),
        resource_owner_org:resource_owner_org_id (
          id,
          name,
          type
        )
      `,
        { count: "exact" }
      )
      .eq("resource_owner_org_id", organizationId)
      .order("accessed_at", { ascending: false });

    // Apply filters
    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }
    if (accessType) {
      query = query.eq("access_type", accessType);
    }
    if (fromDate) {
      query = query.gte("accessed_at", fromDate);
    }
    if (toDate) {
      query = query.lte("accessed_at", toDate);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: logs, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calculate stats
    const { data: stats } = await supabase
      .from("cross_org_access_log")
      .select("access_type, resource_type")
      .eq("resource_owner_org_id", organizationId);

    const accessTypeStats = stats?.reduce((acc: Record<string, unknown>, log: Record<string, unknown>) => {
      acc[log.access_type] = (acc[log.access_type] || 0) + 1;
      return acc;
    }, {});

    const resourceTypeStats = stats?.reduce((acc: Record<string, unknown>, log: Record<string, unknown>) => {
      acc[log.resource_type] = (acc[log.resource_type] || 0) + 1;
      return acc;
    }, {});

    // Get unique accessing organizations
    const uniqueOrgs = new Set(
      logs?.map((log: Record<string, unknown>) => log.user_org?.id).filter(Boolean)
    );

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      stats: {
        totalAccesses: count || 0,
        uniqueOrganizations: uniqueOrgs.size,
        byAccessType: accessTypeStats || {},
        byResourceType: resourceTypeStats || {},
      },
    });
  } catch (error) {
    logger.error('Error fetching access logs', error as Error, {
      organizationId: params.id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch access logs',
      error
    );
  }
}
