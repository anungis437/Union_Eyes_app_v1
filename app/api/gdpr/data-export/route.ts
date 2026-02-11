/**
 * GDPR Data Export API (Article 15)
 * POST /api/gdpr/data-export - Request data export
 * GET /api/gdpr/data-export - Download exported data
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { GdprRequestManager } from "@/lib/gdpr/consent-manager";
import { getReportQueue } from "@/lib/job-queue";
import { logger } from "@/lib/logger";
import fs from "fs";
import path from "path";

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
    const format = preferredFormat || "json";

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    if (!['json', 'csv', 'xml'].includes(format)) {
      return NextResponse.json(
        { error: "Unsupported export format" },
        { status: 400 }
      );
    }

    // Create data access request
    const request = await GdprRequestManager.requestDataAccess({
      userId: userId,
      tenantId,
      requestDetails: {
        preferredFormat: format,
        ...requestDetails,
      },
      verificationMethod: "email",
    });

    await GdprRequestManager.updateRequestStatus(request.id, "in_progress", {
      processedBy: "system",
    });

    try {
      const queue = getReportQueue();
      if (!queue) {
        throw new Error("Report queue not available");
      }

      await queue.add(
        "gdpr-export",
        {
          reportType: "gdpr_export",
          tenantId,
          userId,
          parameters: {
            requestId: request.id,
            format,
          },
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 2000 },
        }
      );
    } catch (queueError) {
      logger.error("Failed to queue GDPR export job", queueError as Error);
    }

    return NextResponse.json({
      success: true,
      requestId: request.id,
      status: "processing",
      message: "Your data export request has been received and is being processed",
      estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
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

    const responseData = request.responseData as any;
    const fileName = responseData?.fileName;
    const expiresAt = responseData?.expiresAt ? new Date(responseData.expiresAt) : null;

    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Export link has expired" },
        { status: 410 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: "Export file not available" },
        { status: 404 }
      );
    }

    const reportsDir = process.env.REPORTS_DIR || "./reports";
    const filePath = path.join(reportsDir, fileName);

    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat) {
      return NextResponse.json(
        { error: "Export file not found" },
        { status: 404 }
      );
    }

    const format = request.requestDetails?.preferredFormat || "json";
    const contentType = format === "csv"
      ? "text/csv"
      : format === "xml"
      ? "application/xml"
      : "application/json";

    const stream = fs.createReadStream(filePath);

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": stat.size.toString(),
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

