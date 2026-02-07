import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationMembers } from '@/db/schema-organizations';
import { eq } from 'drizzle-orm';
import { getUserRoleInOrganization, getOrganizationIdForUser } from '@/lib/organization-utils';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

const DEFAULT_ORG_ID = '458a56cb-251a-4c91-a0b5-81bb8ac39087';

export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Get membership in Default Organization only
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.user.id, user.id))
        .where(eq(organizationMembers.organizationId, DEFAULT_ORG_ID))
        .limit(1);

      // Get the role using the same function as dashboard
      const resolvedOrgId = await getOrganizationIdForUser(user.id);
      const resolvedRole = await getUserRoleInOrganization(user.id, resolvedOrgId);

      return NextResponse.json({
        user.id,
        defaultOrganizationId: DEFAULT_ORG_ID,
        membership: membership || null,
        hasMembership: !!membership,
        isActive: membership?.status === 'active',
        role: membership?.role || null,
        // Dashboard resolution (what the sidebar sees)
        dashboardResolution: {
          organizationId: resolvedOrgId,
          role: resolvedRole || 'member'
        }
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      return NextResponse.json({ 
        error: 'Internal error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }
  })
  })(request);
};
