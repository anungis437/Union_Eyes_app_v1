import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationMembers } from '@/db/schema-organizations';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

const DEFAULT_ORG_ID = '458a56cb-251a-4c91-a0b5-81bb8ac39087';

const SUPER_ADMINS = [
  'user_37vyDm8LHilksYNuVBcenvdktBW', // a_nungisa@yahoo.ca
  'user_37Zo7OrvP4jy0J0MU5APfkDtE2V'  // michel@nungisalaw.ca
];

/**
 * Validation schema - empty body is OK, just confirms admin intent
 */
const fixRolesSchema = z.object({}).strict();

/**
 * Helper to check admin role
 */
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const member = await db.query.organizationMembers.findFirst({
      where: (om, { eq: eqOp }) => eqOp(om.userId, userId),
    });
    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (_error) {
    return false;
  }
}

/**
 * POST /api/admin/fix-super-admin-roles
 * Fix and verify super admin role assignments (admin only)
 */
export const POST = withEnhancedRoleAuth(90, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = fixRolesSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const user = { id: context.userId, organizationId: context.organizationId };

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      // Check if calling user is admin
      const isAdmin = await checkAdminRole(user.id);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/admin/fix-super-admin-roles',
          method: 'POST',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted super admin correction' },
        });
        return NextResponse.json(
          { error: 'Forbidden - Admin role required' },
          { status: 403 }
        );
      }

      const results = [];
      
      for (const userId of SUPER_ADMINS) {
        // Update to super_admin
        await db
          .update(organizationMembers)
          .set({
            role: 'super_admin',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.organizationId, DEFAULT_ORG_ID)
            )
          );

        // Verify the update
        const [updated] = await db
          .select({
            userId: organizationMembers.userId,
            name: organizationMembers.name,
            email: organizationMembers.email,
            role: organizationMembers.role,
            status: organizationMembers.status
          })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.organizationId, DEFAULT_ORG_ID)
            )
          )
          .limit(1);

        results.push(updated);
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/admin/fix-super-admin-roles',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: { count: results.length, updatedUsers: results.map(r => r?.email) },
      });

      return NextResponse.json({
        success: true,
        message: 'Super admin roles updated successfully',
        updates: results
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/admin/fix-super-admin-roles',
        method: 'POST',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      console.error('Error updating super admin roles:', error);
      return NextResponse.json(
        { error: 'Failed to update super admin roles' },
        { status: 500 }
      );
    }
});
