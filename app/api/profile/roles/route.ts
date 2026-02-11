import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { withApiAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const profileRolesSchema = z.object({
  userId: z.string().uuid('Invalid userId'),
  organizationId: z.string().uuid('Invalid organizationId').optional(),
  tenantId: z.string().uuid('Invalid tenantId').optional(),
}).refine((data) => data.organizationId || data.tenantId, {
  message: 'Either organizationId or tenantId is required'
});
export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    
    // Validate request body
    const validation = profileRolesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }

    const { userId, organizationId: organizationIdFromBody, tenantId: tenantIdFromBody } = validation.data;
    const organizationId = organizationIdFromBody ?? tenantIdFromBody;

    // Query organizationMembers to find the user's role
    const memberRecord = await withRLSContext({ organizationId }, async (db) => {
      return await db.query.organizationMembers.findFirst({
        where: (organizationMembers, { eq }) => eq(organizationMembers.userId, userId),
      });
    });

    if (!memberRecord) {
      logger.info('User has no organization membership', { userId });
      return standardSuccessResponse(
      {  role: 'user', roles: []  },
      undefined,
      200
    );
    }

    // Extract roles from the member record
    const roles = [];
    if (memberRecord.role) {
      roles.push(memberRecord.role);
    }

    logger.info('Retrieved user roles', { userId, role: memberRecord.role, roles });

    return standardSuccessResponse(
      { 
        role: memberRecord.role || 'user',
        roles,
        organizationId: memberRecord.organizationId,
       },
      undefined,
      200
    );
  } catch (error) {
    logger.error('Failed to get user roles', { error });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve user roles',
      error
    );
  }
});

