import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DuesCalculationEngine } from '@/lib/dues-calculation-engine';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { db } from '@/db';
import { tenantUsers } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

// Validation schema for billing cycle generation
const billingCycleSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period start must be in YYYY-MM-DD format'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period end must be in YYYY-MM-DD format'),
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
 * Generate dues transactions for a billing cycle
 * Admin only endpoint
 */
export const POST = withEnhancedRoleAuth(60, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = billingCycleSchema.safeParse(rawBody);
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
          endpoint: '/api/dues/billing-cycle',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'Admin role required' },
        });
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { periodStart, periodEnd } = body;

      // TODO: Get tenantId from user session
      const tenantId = 'default-tenant';

      const result = await DuesCalculationEngine.generateBillingCycle(
        tenantId,
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
      return NextResponse.json(
        { error: 'Failed to generate billing cycle' },
        { status: 500 }
      );
    }
});

