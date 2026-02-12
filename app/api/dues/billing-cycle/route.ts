import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DuesCalculationEngine } from '@/lib/dues-calculation-engine';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { db } from '@/db';
import { organizationUsers } from '@/db/schema/domains/member';
import { eq } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// Validation schema for billing cycle generation
const billingCycleSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period start must be in YYYY-MM-DD format'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period end must be in YYYY-MM-DD format'),
});

// Check if user is admin
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const admin = await db
      .select({ role: organizationUsers.role })
      .from(organizationUsers)
      .where(eq(organizationUsers.userId, userId))
      .limit(1);
    return admin.length > 0 && admin[0].role === 'admin';
  } catch (_error) {
    return false;
  }
}

/**
 * Generate dues transactions for a billing cycle
 * Admin only endpoint
 */
export const POST = withRoleAuth('steward', async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = billingCycleSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      // Verify admin role
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/dues/billing-cycle',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'Admin role required' },
        });
        return standardErrorResponse(ErrorCode.FORBIDDEN, 'Admin access required');
      }

      const { periodStart, periodEnd } = body;

      const result = await DuesCalculationEngine.generateBillingCycle(
        organizationId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/billing-cycle',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          periodStart,
          periodEnd,
          transactionsGenerated: result.transactionsGenerated || 0,
          totalAmount: result.totalAmount || 0,
        },
      });

      return NextResponse.json(result);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/billing-cycle',
        method: 'POST',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate billing cycle',
      error
    );
    }
});


