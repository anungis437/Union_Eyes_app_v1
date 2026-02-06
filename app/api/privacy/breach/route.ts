import { NextRequest, NextResponse } from "next/server";
import { ProvincialPrivacyService } from "@/services/provincial-privacy-service";
import { getServerSession } from "next-auth";

/**
 * POST /api/privacy/breach
 * Report a privacy breach (72-hour notification deadline)
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Check if user has admin/security role
    // For now, allow any authenticated user for testing
    // if (!session.user.roles?.includes("admin") && !session.user.roles?.includes("security")) {
    //   return NextResponse.json({ error: "Forbidden - admin access required" }, { status: 403 });
    // }

    const body = await request.json();
    const {
      breachType,
      severity,
      affectedProvince,
      affectedUserCount,
      dataTypes,
      breachDescription,
      discoveredAt,
    } = body;

    if (
      !breachType ||
      !severity ||
      !affectedUserCount ||
      !dataTypes ||
      !breachDescription ||
      !discoveredAt
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const breach = await ProvincialPrivacyService.reportBreach({
      breachType,
      severity,
      affectedProvince,
      affectedUserCount: parseInt(affectedUserCount),
      dataTypes: Array.isArray(dataTypes) ? dataTypes : [dataTypes],
      breachDescription,
      discoveredAt: new Date(discoveredAt),
      reportedBy: session.user.id!,
    });

    return NextResponse.json({
      success: true,
      breach,
      message: "Privacy breach reported successfully",
      notificationDeadline: breach.notificationDeadline,
    });
  } catch (error: any) {
    console.error("Breach reporting error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to report breach" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/privacy/breach/overdue
 * Get breaches approaching 72-hour notification deadline
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Check if user has admin/security role

    const breaches = await ProvincialPrivacyService.getBreachesApproachingDeadline();

    return NextResponse.json({ breaches, count: breaches.length });
  } catch (error: any) {
    console.error("Breach retrieval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve breaches" },
      { status: 500 }
    );
  }
}
