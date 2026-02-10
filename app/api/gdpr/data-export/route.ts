/**
 * GDPR Data Export API (Article 15)
 * POST /api/gdpr/data-export - Request data export
 * GET /api/gdpr/data-export - Download exported data
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { GdprRequestManager, DataExportService } from "@/lib/gdpr/consent-manager";

/**
 * Request data export
 */
export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = user.id;
    const body = await request.json();
    const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, preferredFormat, requestDetails } = body;
    const organizationId = organizationIdFromBody ?? tenantIdFromBody;
    const tenantId = organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Create data access request
    const request = await GdprRequestManager.requestDataAccess({
      userId: userId,
      tenantId,
      requestDetails: {
        preferredFormat: preferredFormat || "json",
        ...requestDetails,
      },
      verificationMethod: "email",
    });

    // Start async export process (in real app, use queue/background job)
    // For now, we'll generate it immediately for small datasets
    try {
      const exportData = await DataExportService.exportUserData( userId,
        tenantId,
        preferredFormat || "json"
      );

      // In production, upload to secure storage (S3, etc.) and provide download link
      const downloadUrl = `/api/gdpr/data-export/${request.id}`;

      // Update request with download info
      await GdprRequestManager.updateRequestStatus(request.id, "completed", {
        processedBy: "system",
        responseData: {
          format: preferredFormat || "json",
          fileUrl: downloadUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        },
      });

      return NextResponse.json({
        success: true,
        requestId: request.id,
        downloadUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        message: "Your data export is ready for download",
      });
    } catch (exportError) {
      console.error("Export generation failed:", exportError);
      
      // Mark as in progress, will be processed by background job
      await GdprRequestManager.updateRequestStatus(request.id, "in_progress", {
        processedBy: "system",
      });

      return NextResponse.json({
        success: true,
        requestId: request.id,
        status: "processing",
        message: "Your data export request has been received and is being processed",
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
    }
  } catch (error) {
    console.error("Data export request error:", error);
    return NextResponse.json(
      { error: "Failed to process data export request" },
      { status: 500 }
    );
  }
});

/**
 * Download exported data
 */
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");
    const organizationIdFromQuery = (searchParams.get("organizationId") ?? searchParams.get("tenantId"));
    const tenantId = organizationIdFromQuery;

    if (!requestId || !tenantId) {
      return NextResponse.json(
        { error: "Request ID and Organization ID required" },
        { status: 400 }
      );
    }

    // Get request status
    const requests = await GdprRequestManager.getUserRequests( userId,
      tenantId
    );
    const request = requests.find((r) => r.id === requestId);

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "completed") {
      return NextResponse.json(
        {
          status: request.status,
          message: "Export is still being processed",
        },
        { status: 202 }
      );
    }

    // Generate fresh export data
    const exportData = await DataExportService.exportUserData( userId,
      tenantId,
      request.requestDetails?.preferredFormat || "json"
    );

    // Return as downloadable file
    const format = request.requestDetails?.preferredFormat || "json";
    const filename = `union-eyes-data-export-${userId}-${Date.now()}.${format}`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('Data export request error', error as Error);
    return NextResponse.json(
      { error: "Failed to download data export" },
      { status: 500 }
    );
  }
});
