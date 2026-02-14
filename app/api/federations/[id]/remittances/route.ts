/**
 * Federation Remittances API Route
 * 
 * Track per-capita tax remittances and financial flows for provincial federations.
 * Includes remittance history, compliance tracking, and financial summaries.
 * 
 * Authentication: Minimum role level 160 (fed_staff) or 180 (clc_staff)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { organizations } from '@/db/schema-organizations';
import { perCapitaRemittances } from '@/db/schema/clc-per-capita-schema';
import { and, desc, sum, count } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { standardSuccessResponse,
} from '@/lib/api/standardized-responses';

/**
 * GET /api/federations/[id]/remittances
 * Retrieve remittance history and financial data for a federation
 * 
 * Query parameters:
 * - from_date: Filter remittances from this date (YYYY-MM-DD)
 * - to_date: Filter remittances to this date (YYYY-MM-DD)
 * - from_year: Filter by fiscal year (e.g., 2024)
 * - from_month: Filter remittances from this month (1-12)
 * - to_month: Filter remittances to this month (1-12)
 * - status: Filter by remittance status (pending, submitted, approved, paid, late, disputed)
 * - affiliate_id: Filter by specific affiliate organization
 * - include_summary: Include financial summary (default: true)
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(160, async (request, context) => {
    const { userId } = context;

    try {
      const federationId = params.id;

      // Rate limiting: 50 remittance read operations per minute per user
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'federation-remittances-read',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many remittance read requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      const fromDate = searchParams.get('from_date');
      const toDate = searchParams.get('to_date');
      const fromYear = searchParams.get('from_year');
      const fromMonth = searchParams.get('from_month');
      const toMonth = searchParams.get('to_month');
      const status = searchParams.get('status');
      const affiliateId = searchParams.get('affiliate_id');
      const includeSummary = searchParams.get('include_summary') !== 'false';
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
      const offset = parseInt(searchParams.get('offset') || '0');

      return withRLSContext(async (tx) => {
        // Verify federation exists
        const [federation] = await tx
          .select({
            id: organizations.id,
            name: organizations.name,
            shortName: organizations.shortName,
            organizationType: organizations.organizationType,
          })
          .from(organizations)
          .where(
            and(
              eq(organizations.id, federationId),
              eq(organizations.organizationType, 'federation')
            )
          );

        if (!federation) {
          return standardErrorResponse(ErrorCode.NOT_FOUND, 'Federation not found');
        }

        // Build query conditions for remittances
        const conditions = [eq(perCapitaRemittances.toOrganizationId, federationId)];

        if (fromDate) {
          conditions.push(gte(perCapitaRemittances.remittanceDate, fromDate));
        }

        if (toDate) {
          conditions.push(lte(perCapitaRemittances.remittanceDate, toDate));
        }

        if (fromYear) {
          const year = parseInt(fromYear);
          conditions.push(eq(perCapitaRemittances.remittanceYear, year));
        }

        if (fromMonth) {
          conditions.push(gte(perCapitaRemittances.remittanceMonth, parseInt(fromMonth)));
        }

        if (toMonth) {
          conditions.push(lte(perCapitaRemittances.remittanceMonth, parseInt(toMonth)));
        }

        if (status) {
          conditions.push(eq(perCapitaRemittances.status, status as any));
        }

        if (affiliateId) {
          conditions.push(eq(perCapitaRemittances.fromOrganizationId, affiliateId));
        }

        // Fetch remittances with pagination
        const remittances = await tx
          .select({
            id: perCapitaRemittances.id,
            fromOrganizationId: perCapitaRemittances.fromOrganizationId,
            remittanceMonth: perCapitaRemittances.remittanceMonth,
            remittanceYear: perCapitaRemittances.remittanceYear,
            remittanceDate: perCapitaRemittances.remittanceDate,
            totalMembers: perCapitaRemittances.totalMembers,
            goodStandingMembers: perCapitaRemittances.goodStandingMembers,
            suspendedMembers: perCapitaRemittances.suspendedMembers,
            perCapitaRate: perCapitaRemittances.perCapitaRate,
            totalAmount: perCapitaRemittances.totalAmount,
            status: perCapitaRemittances.status,
            paymentMethod: perCapitaRemittances.paymentMethod,
            paymentDate: perCapitaRemittances.paymentDate,
            receiptNumber: perCapitaRemittances.receiptNumber,
            notes: perCapitaRemittances.notes,
            dueDate: perCapitaRemittances.dueDate,
            submittedAt: perCapitaRemittances.submittedAt,
            submittedBy: perCapitaRemittances.submittedBy,
            createdAt: perCapitaRemittances.createdAt,
          })
          .from(perCapitaRemittances)
          .where(and(...conditions))
          .orderBy(desc(perCapitaRemittances.remittanceDate))
          .limit(limit)
          .offset(offset);

        // Fetch affiliate organization names
        const affiliateIds = [...new Set(remittances.map((r) => r.fromOrganizationId))];
        const affiliates =
          affiliateIds.length > 0
            ? await tx
                .select({
                  id: organizations.id,
                  name: organizations.name,
                  shortName: organizations.shortName,
                })
                .from(organizations)
                .where(
                  sql`${organizations.id} IN (${sql.join(
                    affiliateIds.map((id) => sql`${id}`),
                    sql`, `
                  )})`
                )
            : [];

        const affiliateMap = new Map(
          affiliates.map((a) => [a.id, { name: a.name, shortName: a.shortName }])
        );

        // Enrich remittances with affiliate names
        const enrichedRemittances = remittances.map((remittance) => ({
          ...remittance,
          fromOrganization: affiliateMap.get(remittance.fromOrganizationId) || null,
        }));

        // Calculate summary if requested
        let summary = null;
        if (includeSummary) {
          const summaryResults = await tx
            .select({
              totalRemittances: count(),
              totalAmount: sum(perCapitaRemittances.totalAmount),
              totalMembers: sum(perCapitaRemittances.totalMembers),
              pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${perCapitaRemittances.status} = 'pending')`,
              submittedCount: sql<number>`COUNT(*) FILTER (WHERE ${perCapitaRemittances.status} = 'submitted')`,
              paidCount: sql<number>`COUNT(*) FILTER (WHERE ${perCapitaRemittances.status} = 'paid')`,
              lateCount: sql<number>`COUNT(*) FILTER (WHERE ${perCapitaRemittances.status} = 'late')`,
              disputedCount: sql<number>`COUNT(*) FILTER (WHERE ${perCapitaRemittances.status} = 'disputed')`,
            })
            .from(perCapitaRemittances)
            .where(and(...conditions));

          if (summaryResults.length > 0) {
            summary = {
              totalRemittances: summaryResults[0].totalRemittances,
              totalAmount: summaryResults[0].totalAmount || '0',
              totalMembers: summaryResults[0].totalMembers || 0,
              statusBreakdown: {
                pending: summaryResults[0].pendingCount || 0,
                submitted: summaryResults[0].submittedCount || 0,
                paid: summaryResults[0].paidCount || 0,
                late: summaryResults[0].lateCount || 0,
                disputed: summaryResults[0].disputedCount || 0,
              },
            };
          }
        }

        // Count total for pagination
        const [{ total }] = await tx
          .select({ total: count() })
          .from(perCapitaRemittances)
          .where(and(...conditions));

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/federations/${federationId}/remittances`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'FEDERATION',
          details: {
            federationId,
            totalRemittances: total,
            returnedCount: remittances.length,
            filters: { fromDate, toDate, fromYear, status, affiliateId },
          },
        });

        return NextResponse.json({
          remittances: enrichedRemittances,
          federation: {
            id: federation.id,
            name: federation.name,
            shortName: federation.shortName,
          },
          summary,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/federations/${params.id}/remittances`,
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        dataType: 'FEDERATION',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to fetch remittances'
      );
    }
  })(request, context);
};
