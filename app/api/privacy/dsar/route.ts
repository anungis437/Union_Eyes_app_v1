import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ProvincialPrivacyService, type Province } from "@/services/provincial-privacy-service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Helper to check if user has admin/privacy officer role
 */
async function checkPrivacyPermissions(userId: string): Promise<boolean> {
  try {
    // Check for admin roles that can manage privacy requests
    const member = await db.query.organizationMembers.findFirst({
      where: (organizationMembers, { eq }) =>
        eq(organizationMembers.userId, userId),
    });

    // Allow admin and super_admin roles to access privacy officer functions
    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (error) {
    logger.error('Failed to check privacy permissions:', { error });
    return false;
  }
}

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
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
        user.id,
        requestType,
        province: province as Province,
        requestDescription,
        requestedDataTypes,
      });

      logger.info('DSAR created', { user.id, requestType, province });

      return NextResponse.json({
        success: true,
        dsar,
        message: "Data subject access request created successfully",
        responseDeadline: dsar.responseDeadline,
      });
    } catch (error: any) {
      logger.error("DSAR creation error:", { error });
      return NextResponse.json(
        { error: error.message || "Failed to create DSAR" },
        { status: 500 }
      );
    }
  })
  })(request);
};

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Check if user has admin/privacy officer role
      const hasPermission = await checkPrivacyPermissions(user.id);
      if (!hasPermission) {
        return NextResponse.json(
          { error: "Forbidden - admin or privacy officer role required" },
          { status: 403 }
        );
      }

      const dsars = await ProvincialPrivacyService.getOverdueDSARs();

      logger.info('Retrieved overdue DSARs', { user.id, count: dsars.length });

      return NextResponse.json({ dsars, count: dsars.length });
    } catch (error: any) {
      logger.error("DSAR retrieval error:", { error });
      return NextResponse.json(
        { error: error.message || "Failed to retrieve DSARs" },
        { status: 500 }
      );
    }
  })
  })(request);
};


