import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * GDPR Right to be Forgotten API (Article 17)
 * POST /api/gdpr/data-erasure - Request data erasure
 * DELETE /api/gdpr/data-erasure - Execute data erasure (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { GdprRequestManager, DataErasureService } from "@/lib/gdpr/consent-manager";
import { logger } from "@/lib/logger";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

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
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId, reason, requestDetails } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID required" },
        { status: 400 }
      );
    }

    // Check if data can be erased
    const { canErase, reasons } = await DataErasureService.canEraseData(
      user.id,
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
      userId: user.id,
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
}

export const DELETE = async (req: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Check if user is admin/DPO
      const isAdmin = await checkAdminOrDPORole(user.id);

      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { requestId, user.id: targetUserId, tenantId, confirmation } = body;

      if (!requestId || !targetUserId || !tenantId) {
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
      logger.info('Data erasure initiated', { adminId: user.id, targetUserId, tenantId });

      // Execute erasure
      await DataErasureService.eraseUserData(
        targetUserId,
        tenantId,
        requestId,
        user.id
      );

      return NextResponse.json({
        success: true,
        message: "User data has been permanently erased",
        executedAt: new Date(),
        executedBy: user.id,
      });
    } catch (error) {
      console.error("Data erasure execution error:", error);
      return NextResponse.json(
        { error: "Failed to execute data erasure" },
        { status: 500 }
      );
    }
  })
  })(request);
};

/**
 * Get erasure request status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID required" },
        { status: 400 }
      );
    }

    const requests = await GdprRequestManager.getUserRequests(
      user.id,
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
}
