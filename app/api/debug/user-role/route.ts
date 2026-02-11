import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationMembers } from '@/db/schema-organizations';
import { eq } from 'drizzle-orm';
import { getUserRoleInOrganization, getOrganizationIdForUser } from '@/lib/organization-utils';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { standardErrorResponse, ErrorCode } from '@/lib/api/standardized-responses';

const DEFAULT_ORG_ID = '458a56cb-251a-4c91-a0b5-81bb8ac39087';

export const GET = async () => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Get membership in Default Organization only
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId))
        .where(eq(organizationMembers.organizationId, DEFAULT_ORG_ID))
        .limit(1);

      // Get the role using the same function as dashboard
      const resolvedOrgId = await getOrganizationIdForUser(userId);
      const resolvedRole = await getUserRoleInOrganization(userId, resolvedOrgId);

      return NextResponse.json({
        userId,
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
return standardErrorResponse(ErrorCode.INTERNAL_ERROR);
    }
    })(request);
};

