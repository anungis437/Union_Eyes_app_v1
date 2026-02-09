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

/**
 * Helper to check if user is admin/DPO
 */
async function checkAdminOrDPORole(userId: string): Promise<boolean> {
  try {
    const member = await db.query.organizationMembers.findFirst({
      where: (organizationMembers, { eq }) =>
        eq(organizationMembers.userId, userId),
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = user.id;
    const body = await request.json();
    const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, reason, requestDetails } = body;
    const organizationId = organizationIdFromBody ?? tenantIdFromBody;
    const tenantId = organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
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
    console.error("Data erasure request error:", error);
    return NextResponse.json(
      { error: "Failed to process data erasure request" },
      { status: 500 }
    );
  }
});

export const DELETE = withRoleAuth('admin', async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Check if user is admin/DPO
    const isAdmin = await checkAdminOrDPORole(userId);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, userId: targetUserId, organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, confirmation } = body;
    const organizationId = organizationIdFromBody ?? tenantIdFromBody;
    const tenantId = organizationId;

    if (!requestId || !targetUserId || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Require explicit confirmation
    if (confirmation !== `DELETE_USER_DATA_${targetUserId}`) {
      return NextResponse.json(
        { error: "Invalid confirmation code" },
        { status: 400 }
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
    console.error("Data erasure execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute data erasure" },
      { status: 500 }
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const organizationIdFromQuery = (searchParams.get("organizationId") ?? searchParams.get("tenantId"));
    const tenantId = organizationIdFromQuery;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
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
    console.error("Get erasure requests error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve requests" },
      { status: 500 }
    );
  }
});
