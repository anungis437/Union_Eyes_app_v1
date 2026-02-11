/**
 * CLC Per-Capita Remittances API Routes
 * Purpose: List and calculate remittances
 * 
 * Endpoints:
 * - GET /api/admin/clc/remittances - List remittances with filters
 * - POST /api/admin/clc/remittances/calculate - Trigger manual calculation
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - Removed manual SET app.current_user_id commands
 * - Removed redundant checkAdminRole() function (role check via withEnhancedRoleAuth)
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - Transaction-scoped isolation prevents context leakage
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { organizations, perCapitaRemittances } from '@/db/schema';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { 
  PerCapitaCalculator,
  calculatePerCapita,
  calculateAllPerCapita,
  savePerCapitaRemittances 
} from '@/services/clc/per-capita-calculator';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

/**
 * Query schema for listing remittances
 */
const listRemittancesSchema = z.object({
  status: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  month: z.string().optional().transform(v => v ? parseInt(v) : null),
  year: z.string().optional().transform(v => v ? parseInt(v) : null),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  page: z.string().default('1').transform(v => parseInt(v)),
  pageSize: z.string().default('50').transform(v => Math.min(parseInt(v), 100)),
});

/**
 * Body schema for calculating remittances
 */
const calculateRemittancesSchema = z.object({
  organizationId: z.string().uuid().optional(),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  saveResults: z.boolean().optional().default(false),
});

// =====================================================================================
// GET - List remittances with filters
// =====================================================================================

export const GET = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting: 50 CLC operations per hour per user
      const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.CLC_OPERATIONS);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Too many CLC requests.',
            resetIn: rateLimitResult.resetIn 
          },
          { 
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams;
      const status = searchParams.get('status');
      const organizationId = searchParams.get('organizationId');
      const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
      const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null;
      const dueDateFrom = searchParams.get('dueDateFrom');
      const dueDateTo = searchParams.get('dueDateTo');
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '50');
      const offset = (page - 1) * pageSize;

      // All database operations wrapped in withRLSContext for automatic context setting
      return withRLSContext(async (tx) => {
        // Build WHERE conditions
        const conditions = [];
        
        if (status) {
          conditions.push(eq(perCapitaRemittances.status, status as any));
        }
        
        if (organizationId) {
          // Filter by either from_organization_id OR to_organization_id
          conditions.push(
            sql`(${perCapitaRemittances.fromOrganizationId} = ${organizationId} OR ${perCapitaRemittances.toOrganizationId} = ${organizationId})`
          );
        }
        
        if (month !== null) {
          conditions.push(eq(perCapitaRemittances.remittanceMonth, month));
        }
        
        if (year !== null) {
          conditions.push(eq(perCapitaRemittances.remittanceYear, year));
        }
        
        if (dueDateFrom) {
          conditions.push(gte(perCapitaRemittances.dueDate, dueDateFrom));
        }
        
        if (dueDateTo) {
          conditions.push(lte(perCapitaRemittances.dueDate, dueDateTo));
        }

        // Fetch remittances with organization details
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        
        const remittances = await tx
          .select({
            id: perCapitaRemittances.id,
            remittanceMonth: perCapitaRemittances.remittanceMonth,
            remittanceYear: perCapitaRemittances.remittanceYear,
            fromOrganizationId: perCapitaRemittances.fromOrganizationId,
            toOrganizationId: perCapitaRemittances.toOrganizationId,
            totalMembers: perCapitaRemittances.totalMembers,
            goodStandingMembers: perCapitaRemittances.goodStandingMembers,
            remittableMembers: perCapitaRemittances.remittableMembers,
            perCapitaRate: perCapitaRemittances.perCapitaRate,
            totalAmount: perCapitaRemittances.totalAmount,
            dueDate: perCapitaRemittances.dueDate,
            status: perCapitaRemittances.status,
            submittedDate: perCapitaRemittances.submittedDate,
            paidDate: perCapitaRemittances.paidDate,
            clcAccountCode: perCapitaRemittances.clcAccountCode,
            glAccount: perCapitaRemittances.glAccount,
            createdAt: perCapitaRemittances.createdAt,
            updatedAt: perCapitaRemittances.updatedAt,
          })
          .from(perCapitaRemittances)
          .where(whereClause)
          .orderBy(sql`${perCapitaRemittances.dueDate} DESC, ${perCapitaRemittances.createdAt} DESC`)
          .limit(pageSize)
          .offset(offset);

        // Get total count for pagination
        const [countResult] = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(perCapitaRemittances)
          .where(whereClause);
        
        const totalCount = Number(countResult.count);
        const totalPages = Math.ceil(totalCount / pageSize);

        // Fetch organization details for all remittances
        const orgIds = new Set<string>();
        remittances.forEach(r => {
          orgIds.add(r.fromOrganizationId);
          orgIds.add(r.toOrganizationId);
        });

        const orgs = await tx
          .select({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            charterNumber: organizations.charterNumber,
          })
          .from(organizations)
          .where(inArray(organizations.id, Array.from(orgIds)));

        const orgMap = new Map(orgs.map(o => [o.id, o]));

        // Enrich remittances with organization names
        const enrichedRemittances = remittances.map(r => ({
          ...r,
          fromOrganization: orgMap.get(r.fromOrganizationId),
          toOrganization: orgMap.get(r.toOrganizationId),
        }));

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/remittances',
          method: 'GET',
          eventType: 'success',
          severity: 'medium',
          details: {
            dataType: 'FINANCIAL',
            filters: { status, organizationId, month, year, dueDateFrom, dueDateTo },
            resultCount: enrichedRemittances.length,
            totalCount,
          },
        });

        return NextResponse.json({
          remittances: enrichedRemittances,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages,
          },
        });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/clc/remittances',
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      console.error('Error fetching remittances:', error);
      return NextResponse.json(
        { error: 'Failed to fetch remittances' },
        { status: 500 }
      );
    }
  })(request);
};

// =====================================================================================
// POST - Calculate remittances
// =====================================================================================

export const POST = withRoleAuth(90, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = calculateRemittancesSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  // Validate organization ID if provided (can't calculate for different org than user's context)
  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // All database operations wrapped in withRLSContext for automatic context setting
    return withRLSContext(async (tx) => {
      const { organizationId, month, year, saveResults } = body;

      // Calculate remittances
      let calculations;
      
      if (organizationId) {
        // Calculate for single organization
        const calculation = await calculatePerCapita(organizationId, month, year);
        calculations = calculation ? [calculation] : [];
      } else {
        // Calculate for all organizations
        calculations = await calculateAllPerCapita(month, year);
      }

      // Save to database if requested
      let saveResult = null;
      if (saveResults && calculations.length > 0) {
        saveResult = await savePerCapitaRemittances(calculations);
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/clc/remittances',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          organizationId,
          month,
          year,
          calculationCount: calculations.length,
          saveResults,
          savedCount: saveResult?.length || 0,
        },
      });

      return NextResponse.json({
        calculations,
        saveResult,
        message: organizationId
          ? `Calculated remittance for 1 organization`
          : `Calculated remittances for ${calculations.length} organizations`,
      });
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), userId,
      endpoint: '/api/admin/clc/remittances',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    console.error('Error calculating remittances:', error);
    return NextResponse.json(
      { error: 'Failed to calculate remittances' },
      { status: 500 }
    );
  }
});


