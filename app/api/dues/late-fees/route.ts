import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DuesCalculationEngine } from '@/lib/dues-calculation-engine';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { db } from '@/db';
import { tenantUsers } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

// Validation schema for late fees calculation
const lateFeeSchema = z.object({
  lateFeeRate: z.number().min(0).max(1).optional().default(0.02),
});

// Check if user is admin
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const admin = await db
      .select({ role: tenantUsers.role })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId))
      .limit(1);
    return admin.length > 0 && admin[0].role === 'admin';
  } catch (_error) {
    return false;
  }
}

/**
 * Calculate and apply late fees to overdue transactions
 * Admin only endpoint - typically called by cron job
 */
export const POST = withRoleAuth('steward', async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = lateFeeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      // Verify admin role
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/dues/late-fees',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'Admin role required' },
        });
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { lateFeeRate } = body;

      const tenantId = organizationId;

      const result = await DuesCalculationEngine.calculateLateFees(
        tenantId,
        lateFeeRate
      );

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/late-fees',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          lateFeeRate,
          processedTransactions: result.transactionsProcessed || 0,
          totalFeesApplied: result.totalFeesApplied || 0,
        },
      });

      return NextResponse.json(result);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/late-fees',
        method: 'POST',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return NextResponse.json(
        { error: 'Failed to calculate late fees' },
        { status: 500 }
      );
    }
});

