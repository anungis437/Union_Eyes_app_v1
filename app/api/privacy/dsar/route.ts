import { NextRequest, NextResponse } from "next/server";
import { ProvincialPrivacyService, type Province } from "@/services/provincial-privacy-service";
import { getServerSession } from "next-auth";

/**
 * POST /api/privacy/dsar
 * Create Data Subject Access Request (DSAR)
 * User can request: access, rectification, erasure, portability, restriction
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestType, province, requestDescription, requestedDataTypes } = body;

    if (!requestType || !province) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validTypes = ["access", "rectification", "erasure", "portability", "restriction"];
    if (!validTypes.includes(requestType)) {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }

    const dsar = await ProvincialPrivacyService.createDSAR({
      userId: session.user.id!,
      requestType,
      province: province as Province,
      requestDescription,
      requestedDataTypes,
    });

    return NextResponse.json({
      success: true,
      dsar,
      message: "Data subject access request created successfully",
      responseDeadline: dsar.responseDeadline,
    });
  } catch (error: any) {
    console.error("DSAR creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create DSAR" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/privacy/dsar/overdue
 * Get overdue DSARs (approaching 30-day deadline)
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Check if user has admin/privacy officer role

    const dsars = await ProvincialPrivacyService.getOverdueDSARs();

    return NextResponse.json({ dsars, count: dsars.length });
  } catch (error: any) {
    console.error("DSAR retrieval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve DSARs" },
      { status: 500 }
    );
  }
}
