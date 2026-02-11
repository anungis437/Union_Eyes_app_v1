import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { withApiAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const { userId, organizationId: organizationIdFromBody, tenantId: tenantIdFromBody } = await req.json();
    const organizationId = organizationIdFromBody ?? tenantIdFromBody;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Query organizationMembers to find the user's role
    const memberRecord = await withRLSContext({ organizationId }, async (db) => {
      return await db.query.organizationMembers.findFirst({
        where: (organizationMembers, { eq }) => eq(organizationMembers.userId, userId),
      });
    });

    if (!memberRecord) {
      logger.info('User has no organization membership', { userId });
      return NextResponse.json(
        { role: 'user', roles: [] },
        { status: 200 }
      );
    }

    // Extract roles from the member record
    const roles = [];
    if (memberRecord.role) {
      roles.push(memberRecord.role);
    }

    logger.info('Retrieved user roles', { userId, role: memberRecord.role, roles });

    return NextResponse.json(
      {
        role: memberRecord.role || 'user',
        roles,
        organizationId: memberRecord.organizationId,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to get user roles', { error });
    return NextResponse.json(
      { error: 'Failed to retrieve user roles' },
      { status: 500 }
    );
  }
});

