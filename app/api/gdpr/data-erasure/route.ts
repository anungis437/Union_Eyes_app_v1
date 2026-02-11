import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * GDPR Right to be Forgotten API (Article 17)
 * POST /api/gdpr/data-erasure - Request data erasure
 * DELETE /api/gdpr/data-erasure - Execute data erasure (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, withRoleAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { db } from "@/db";
import { GdprRequestManager, DataErasureService } from "@/lib/gdpr/consent-manager";
import { logger } from "@/lib/logger";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { z } from 'zod';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const erasureRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  reason: z.string().min(10).max(500).optional(),
  requestDetails: z.record(z.any()).optional(),
}).refine((data) => data.organizationId || data.tenantId, {
  message: "Either organizationId or tenantId must be provided",
});

const erasureExecutionSchema = z.object({
  requestId: z.string().uuid(),
  confirmation: z.literal('DELETE_ALL_DATA'),
});
/**
 * Helper to check if user is admin/DPO
 */
async function checkAdminOrDPORole(userId: string, organizationId: string): Promise<boolean> {
  try {
    const member = await withRLSContext({ organizationId }, async (db) => {
      return await db.query.organizationMembers.findFirst({
        where: (organizationMembers, { eq }) =>
          eq(organizationMembers.userId, userId),
      });
    });

    // Allow admin and super_admin roles to perform data erasure
    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (error) {
    logger.error('Failed to check admin/DPO role:', { error });
    return false;
  }
}

/**
 * Request data erasure (RTBF)
 */
export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }
    
    const userId = user.id;
    const body = await request.json();
    
    // Validate input
    const validation = erasureRequestSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    
    const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, reason, requestDetails } = validation.data;
    const organizationId = organizationIdFromBody ?? tenantIdFromBody;
    const tenantId = organizationId;

    if (!organizationId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID required'
    );
    }

    // Check if data can be erased
    const { canErase, reasons } = await DataErasureService.canEraseData( userId,
      tenantId
    );

    if (!canErase) {
      return NextResponse.json(
        {
          error: "Data cannot be erased at this time",
          reasons,
        },
        { status: 400 }
      );
    }

    // Create erasure request
    const request = await GdprRequestManager.requestDataErasure({
      userId,
      tenantId,
      requestDetails: {
        reason,
        ...requestDetails,
      },
      verificationMethod: "email",
    });

    // In production, this would trigger a verification email
    // and require admin approval before execution

    return NextResponse.json({
      success: true,
      requestId: request.id,
      status: "pending",
      message:
        "Your data erasure request has been received. We will process it within 30 days as required by GDPR.",
      deadline: request.deadline,
      nextSteps: [
        "We will verify your identity via email",
        "Your request will be reviewed by our Data Protection Officer",
        "Once approved, all your personal data will be permanently deleted",
        "You will receive confirmation once the process is complete",
      ],
    });
  } catch (error) {
    logger.error("Data erasure request error", { error });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to process data erasure request',
      error
    );
  }
});

export const DELETE = withRoleAuth('admin', async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }
    
    const { userId, organizationId } = context;
    
    // Check if user is admin/DPO
    const isAdmin = await checkAdminOrDPORole(userId, organizationId);

    if (!isAdmin) {
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin access required'
    );
    }

    const body = await request.json();
    \n    // Validate input
    const validation = erasureExecutionSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    \n    const { requestId, confirmation } = validation.data;
    const targetUserId = body.userId; // Get from body but not validated by schema
    const organizationIdFromBody = body.organizationId || body.tenantId;
    const tenantId = organizationIdFromBody;

    if (!targetUserId || !organizationIdFromBody) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing userId or organizationId'
    );
    }
    }

    // Require explicit confirmation
    if (confirmation !== `DELETE_USER_DATA_${targetUserId}`) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid confirmation code'
    );
    }

    // Log the admin action
    logger.info('Data erasure initiated', { adminId: userId, targetUserId, tenantId });

    // Execute erasure
    await DataErasureService.eraseUserData(
      targetUserId,
      tenantId,
      requestId,
      userId
    );

    return NextResponse.json({
      success: true,
      message: "User data has been permanently erased",
      executedAt: new Date(),
      executedBy: userId,
    });
  } catch (error) {
    logger.error("Data erasure execution error", { error });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to execute data erasure',
      error
    );
  }
});

/**
 * Get erasure request status
 */
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }
    
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const organizationIdFromQuery = (searchParams.get("organizationId") ?? searchParams.get("tenantId"));
    const tenantId = organizationIdFromQuery;

    if (!tenantId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID required'
    );
    }

    const requests = await GdprRequestManager.getUserRequests( userId,
      tenantId
    );

    const erasureRequests = requests.filter(
      (r) => r.requestType === "erasure"
    );

    return NextResponse.json({
      requests: erasureRequests,
      pending: erasureRequests.filter((r) => r.status === "pending").length,
    });
  } catch (error) {
    logger.error("Get erasure requests error", { error });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve requests',
      error
    );
  }
});

