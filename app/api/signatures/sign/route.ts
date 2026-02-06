/**
 * Signature Recording API
 * POST /api/signatures/sign - Record signature
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { SignatureService } from "@/lib/signature/signature-service";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      signerId,
      signatureImageUrl,
      signatureType,
      geolocation,
    } = body;

    if (!signerId || !signatureImageUrl || !signatureType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get IP and user agent
    const ipAddress = req.headers.get("x-forwarded-for") || 
                      req.headers.get("x-real-ip") || 
                      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const signer = await SignatureService.recordSignature({
      signerId,
      signatureImageUrl,
      signatureType,
      ipAddress,
      userAgent,
      geolocation,
    });

    return NextResponse.json({
      success: true,
      message: "Signature recorded successfully",
      signer,
    });
  } catch (error) {
    console.error("Record signature error:", error);
    return NextResponse.json(
      { error: "Failed to record signature" },
      { status: 500 }
    );
  }
}
