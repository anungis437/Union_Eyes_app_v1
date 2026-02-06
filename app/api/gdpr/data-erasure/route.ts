/**
 * GDPR Right to be Forgotten API (Article 17)
 * POST /api/gdpr/data-erasure - Request data erasure
 * DELETE /api/gdpr/data-erasure - Execute data erasure (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { GdprRequestManager, DataErasureService } from "@/lib/gdpr/consent-manager";

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

/**
 * Execute data erasure (Admin only)
 * This is a destructive operation!
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin/DPO
    // TODO: Implement proper admin check
    const isAdmin = user.publicMetadata?.role === "admin" || 
                    user.publicMetadata?.role === "dpo";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { requestId, userId, tenantId, confirmation } = body;

    if (!requestId || !userId || !tenantId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Require explicit confirmation
    if (confirmation !== `DELETE_USER_DATA_${userId}`) {
      return NextResponse.json(
        { error: "Invalid confirmation code" },
        { status: 400 }
      );
    }

    // Execute erasure
    await DataErasureService.eraseUserData(
      userId,
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
}

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
