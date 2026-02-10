import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ProvincialPrivacyService, type Province } from "@/services/provincial-privacy-service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

/**
 * Helper to check if user has admin/privacy officer role
 */
async function checkPrivacyPermissions(userId: string, organizationId: string): Promise<boolean> {
  try {
    // Check for admin roles that can manage privacy requests
    const member = await withRLSContext({ organizationId }, async (db) => {
      return await db.query.organizationMembers.findFirst({
        where: (organizationMembers, { eq }) =>
          eq(organizationMembers.userId, userId),
      });
    });

    // Allow admin and super_admin roles to access privacy officer functions
    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (error) {
    logger.error('Failed to check privacy permissions:', { error });
    return false;
  }
}

export const POST = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

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
        userId,
        requestType,
        province: province as Province,
        requestDescription,
        requestedDataTypes,
      });

      logger.info('DSAR created', { userId, requestType, province });

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
    })(request);
};

export const GET = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Check if user has admin/privacy officer role
      const hasPermission = await checkPrivacyPermissions(userId, organizationId);
      if (!hasPermission) {
        return NextResponse.json(
          { error: "Forbidden - admin or privacy officer role required" },
          { status: 403 }
        );
      }

      const dsars = await ProvincialPrivacyService.getOverdueDSARs();

      logger.info('Retrieved overdue DSARs', { userId, count: dsars.length });

      return NextResponse.json({ dsars, count: dsars.length });
    } catch (error: any) {
      logger.error("DSAR retrieval error:", { error });
      return NextResponse.json(
        { error: error.message || "Failed to retrieve DSARs" },
        { status: 500 }
      );
    }
    })(request);
};


