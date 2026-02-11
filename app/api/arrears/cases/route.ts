import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { arrearsCases, members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

// Validation schema for GET query parameters
const listArrearsSchema = z.object({
  status: z.string().optional(),
  minDaysOverdue: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  maxDaysOverdue: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().default('100').transform(v => Math.min(parseInt(v), 500)),
});

// List arrears cases with filters
export const GET = withRoleAuth(10, async (request, context) => {
  const parsed = listArrearsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["tenantId"] ?? (query as Record<string, unknown>)["tenant_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      // Get member to verify tenant
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.userId, userId))
        .limit(1);

      if (!member) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/arrears/cases',
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'medium',
          details: { reason: 'Member not found' },
        });
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      // Build base query with validated parameters
      let whereConditions = [eq(arrearsCases.tenantId, member.tenantId)];

      if (query.status) {
        whereConditions.push(eq(arrearsCases.status, query.status));
      }
      if (query.minDaysOverdue) {
        whereConditions.push(gte(arrearsCases.daysOverdue, query.minDaysOverdue.toString()));
      }
      if (query.maxDaysOverdue) {
        whereConditions.push(lte(arrearsCases.daysOverdue, query.maxDaysOverdue.toString()));
      }
      if (query.minAmount) {
        whereConditions.push(gte(arrearsCases.totalOwed, query.minAmount));
      }
      if (query.maxAmount) {
        whereConditions.push(lte(arrearsCases.totalOwed, query.maxAmount));
      }

      // Get cases with member details
      const cases = await db
        .select({
          case: arrearsCases,
          member: {
            id: members.id,
            name: members.name,
            email: members.email,
            status: members.status,
          },
        })
        .from(arrearsCases)
        .innerJoin(members, eq(arrearsCases.memberId, members.id))
        .where(and(...whereConditions))
        .orderBy(desc(arrearsCases.totalOwed))
        .limit(query.limit);

      // Filter by search if provided
      let filteredCases = cases;
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        filteredCases = cases.filter(c => 
          c.member.name?.toLowerCase().includes(searchLower) ||
          c.member.email?.toLowerCase().includes(searchLower) ||
          c.case.caseNumber.toLowerCase().includes(searchLower)
        );
      }

      // Get summary statistics
      const [summary] = await db
        .select({
          totalCases: sql<number>`COUNT(*)`,
          totalOwed: sql<string>`COALESCE(SUM(${arrearsCases.totalOwed}), 0)`,
          avgDaysOverdue: sql<string>`COALESCE(AVG(${arrearsCases.daysOverdue}), 0)`,
        })
        .from(arrearsCases)
        .where(and(...whereConditions));

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/arrears/cases',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: { 
          dataType: 'FINANCIAL',
          casesReturned: filteredCases.length,
          filters: query,
        },
      });

      return NextResponse.json({
        cases: filteredCases,
        summary: {
          totalCases: summary.totalCases,
          totalOwed: parseFloat(summary.totalOwed || '0'),
          avgDaysOverdue: Math.round(parseFloat(summary.avgDaysOverdue || '0')),
        },
      });

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/arrears/cases',
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return NextResponse.json(
        { error: 'Failed to list arrears cases' },
        { status: 500 }
      );
    }
});


