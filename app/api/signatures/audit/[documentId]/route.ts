/**
 * Signature Audit Trail API
 * GET /api/signatures/audit/[documentId] - Get document audit trail
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { AuditTrailService } from "@/lib/signature/signature-service";

export const GET = withApiAuth(async (
  req: NextRequest,
  { params }: { params: { documentId: string } }
) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.documentId;
    
    // Get query params
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format"); // 'json' or 'report'

    if (format === "report") {
      // Generate comprehensive audit report
      const report = await AuditTrailService.generateAuditReport(documentId);
      
      return NextResponse.json({
        report,
        message: "Audit report generated successfully",
      });
    } else {
      // Return raw audit trail
      const auditTrail = await AuditTrailService.getDocumentAudit(documentId);
      
      return NextResponse.json({
        documentId,
        events: auditTrail,
        totalEvents: auditTrail.length,
      });
    }
  } catch (error) {
return NextResponse.json(
      { error: "Failed to retrieve audit trail" },
      { status: 500 }
    );
  }
});
