import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DuesCalculationEngine } from '@/lib/dues-calculation-engine';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

// Validation schema for dues calculation
const calculateDuesSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period start must be in YYYY-MM-DD format'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period end must be in YYYY-MM-DD format'),
  memberData: z.record(z.any()).optional(),
});

export const POST = withRoleAuth('steward', async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = calculateDuesSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  // Rate limiting: 100 financial read operations per hour per user
  const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.FINANCIAL_READ);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Too many financial read requests.',
        resetIn: rateLimitResult.resetIn 
      },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      const { memberId, periodStart, periodEnd, memberData } = body;

      const tenantId = organizationId;

      const calculation = await DuesCalculationEngine.calculateMemberDues({
        tenantId,
        memberId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        memberData,
      });

      if (!calculation) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/dues/calculate',
          method: 'POST',
          eventType: 'error',
          severity: 'medium',
          details: { reason: 'Unable to calculate dues', memberId },
        });
        return NextResponse.json(
          { error: 'Unable to calculate dues for this member' },
          { status: 404 }
        );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/calculate',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          memberId,
          periodStart,
          periodEnd,
          calculatedAmount: calculation.duesAmount,
        },
      });

      return NextResponse.json({
        success: true,
        calculation,
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/calculate',
        method: 'POST',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return NextResponse.json(
        { error: 'Failed to calculate dues' },
        { status: 500 }
      );
    }
});


