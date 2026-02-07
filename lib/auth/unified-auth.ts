import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { organizationMembers } from '@/db/schema';

export interface UnifiedUserContext {
  userId: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  memberId?: string;
}

export async function getUserContext(): Promise<UnifiedUserContext | null> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return null;
  }

  let membership = null;

  if (orgId) {
    membership = await db.query.organizationMembers.findFirst({
      where: (om, { eq, and }) => and(eq(om.userId, userId), eq(om.organizationId, orgId)),
    });
  }

  if (!membership) {
    membership = await db.query.organizationMembers.findFirst({
      where: (om, { eq }) => eq(om.userId, userId),
    });
  }

  if (!membership) {
    return null;
  }

  const role = membership.role || 'member';

  return {
    userId,
    organizationId: membership.organizationId,
    roles: [role],
    permissions: getPermissionsForRole(role),
    memberId: membership.id,
  };
}

export async function getUserContextForOrganization(
  organizationId: string,
  userIdOverride?: string
): Promise<UnifiedUserContext | null> {
  const userId = userIdOverride || (await auth()).userId;

  if (!userId) {
    return null;
  }

  const membership = await db.query.organizationMembers.findFirst({
    where: (om, { eq, and }) => and(eq(om.userId, userId), eq(om.organizationId, organizationId)),
  });

  if (!membership) {
    return null;
  }

  const role = membership.role || 'member';

  return {
    userId,
    organizationId: membership.organizationId,
    roles: [role],
    permissions: getPermissionsForRole(role),
    memberId: membership.id,
  };
}

export async function requireUser(): Promise<UnifiedUserContext> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const user = await getUserContext();
  if (!user) {
    throw new Error('Forbidden');
  }

  return user;
}

export async function requireUserForOrganization(
  organizationId: string,
  userIdOverride?: string
): Promise<UnifiedUserContext> {
  const userId = userIdOverride || (await auth()).userId;

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const user = await getUserContextForOrganization(organizationId, userId);
  if (!user) {
    throw new Error('Forbidden');
  }

  return user;
}

export async function requireRole(role: string): Promise<UnifiedUserContext> {
  const user = await requireUser();
  if (!user.roles.includes(role) && !user.roles.includes('admin')) {
    throw new Error('Forbidden');
  }
  return user;
}

function getPermissionsForRole(role: string): string[] {
  const permissions: Record<string, string[]> = {
    admin: ['*'],
    member: ['read:organization', 'submit:claims'],
    officer: ['manage:members', 'create:voting'],
    treasurer: ['view:finances', 'approve:payments'],
  };
  return permissions[role] || [];
}
