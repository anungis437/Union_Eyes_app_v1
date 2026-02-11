/**
 * Members Merge API Route
 * 
 * Merge duplicate member records:
 * - POST: Merge two member records
 * - Consolidates data, activities, and history
 * - Creates audit trail
 * 
 * @module app/api/members/merge/route
 */

import { withRLSContext } from '@/lib/db/with-rls-context';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { db } from "@/db";
import {
  claims,
  eventAttendees,
  auditLogs,
} from "@/db/schema";
import { organizationMembers } from "@/db/schema/organization-members-schema";
import { memberDocuments } from "@/db/schema/domains/documents";
import { eq, sql } from "drizzle-orm";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * Helper function to get user's organization context
 */
async function getUserOrganization(userId: string): Promise<string | null> {
  try {
    const result = await withRLSContext(async (tx) => {
      return await tx.execute(
      sql`SELECT organization_id FROM organization_users WHERE user_id = ${userId} LIMIT 1`
    );
    });
    if (result.length > 0) {
      return result[0].organization_id as string;
    }
    return null;
  } catch (_error) {
    return null;
  }
}

const mergeSchema = z.object({
  primaryMemberId: z.string().uuid(),
  duplicateMemberId: z.string().uuid(),
  fieldSelections: z.record(z.enum(["primary", "duplicate"])),
  notes: z.string().min(10, "Notes must be at least 10 characters"),
});

/**
 * POST /api/members/merge
 * 
 * Merge two member records
 */
export const POST = withRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = mergeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      const { primaryMemberId, duplicateMemberId, fieldSelections, notes } = body;

      // Get user's organization
      const orgId = await getUserOrganization(userId);
      if (!orgId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/merge',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'medium',
          details: { reason: 'User organization not found' },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'User organization not found'
    );
      }

      // Prevent self-merge
      if (primaryMemberId === duplicateMemberId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/merge',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'low',
          details: { reason: 'Cannot merge member with itself' },
        });
        return NextResponse.json(
          { error: "Cannot merge a member with itself" },
          { status: 400 }
        );
      }

      // Fetch both members
      const [primaryMember] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.id, primaryMemberId));

      const [duplicateMember] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.id, duplicateMemberId));

      if (!primaryMember || !duplicateMember) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/merge',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'low',
          details: { reason: 'One or both members not found', primaryMemberId, duplicateMemberId },
        });
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'One or both members not found'
    );
      }

      // Verify both belong to same organization
      if (primaryMember.organizationId !== orgId || duplicateMember.organizationId !== orgId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/merge',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'Cross-organization merge attempt', primaryMemberId, duplicateMemberId },
        });
        return NextResponse.json(
          { error: "Members must belong to the same organization" },
          { status: 403 }
        );
      }

      // Build merged data based on field selections
      const mergedData: any = {
        id: primaryMemberId,
        organizationId: orgId,
      };

      Object.entries(fieldSelections).forEach(([field, source]) => {
        const sourceMember = source === "primary" ? primaryMember : duplicateMember;
        mergedData[field] = sourceMember[field as keyof typeof sourceMember];
      });

      // Update primary member with merged data
      await db
        .update(organizationMembers)
        .set({
          ...mergedData,
          updatedAt: new Date(),
        })
        .where(eq(organizationMembers.id, primaryMemberId));

      // Transfer claims
      await db
        .update(claims)
        .set({ memberId: primaryMemberId })
        .where(eq(claims.memberId, duplicateMemberId));

      // Transfer documents
      await db
        .update(memberDocuments)
        .set({ userId: primaryMemberId })
        .where(eq(memberDocuments.userId, duplicateMemberId));

      // Transfer event attendance
      await db
        .update(eventAttendees)
        .set({ userId: primaryMemberId })
        .where(eq(eventAttendees.userId, duplicateMemberId));

      // Archive duplicate member instead of deleting
      await db
        .update(organizationMembers)
        .set({
          status: "inactive",
          updatedAt: new Date(),
        })
        .where(eq(organizationMembers.id, duplicateMemberId));

      // Create audit log
      await db
        .insert(auditLogs)
        .values({
          organizationId: orgId,
          userId,
          action: "member_merge",
          resourceType: "member",
          resourceId: primaryMemberId,
          oldValues: duplicateMember,
          newValues: mergedData,
          metadata: {
            notes,
            mergedAt: new Date().toISOString(),
            fieldSelections,
          },
        });

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/members/merge',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: { primaryMemberId, duplicateMemberId, orgId, notes },
      });

      // Fetch updated member with consolidated counts
      const [updatedMember] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.id, primaryMemberId));

      return NextResponse.json({
        success: true,
        data: updatedMember,
        message: "Members merged successfully",
        details: {
          primaryMemberId,
          duplicateMemberId,
          transferredRecords: {
            claims: "transferred",
            documents: "transferred",
            eventAttendance: "transferred",
          },
        },
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/members/merge',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
return NextResponse.json(
        {
          error: "Failed to merge members",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
});

/**
 * GET /api/members/merge/candidates
 * 
 * Find potential duplicate members
 */
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        // Get user's organization
        const orgId = await getUserOrganization(userId);
        if (!orgId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/members/merge',
            method: 'GET',
            eventType: 'auth_failed',
            severity: 'medium',
            details: { reason: 'User organization not found' },
          });
          return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'User organization not found'
    );
        }

        // In production, implement sophisticated duplicate detection:
        // - Fuzzy name matching
        // - Similar email addresses
        // - Same SSN/employee ID
        // - Similar join dates and personal info
        
        const allMembers = await db
          .select()
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, orgId));

        // Simple duplicate detection (expand in production)
        const candidates: Array<{ primary: any; duplicates: any[] }> = [];
        
        // Example: Find members with exact same email
        const emailMap = new Map<string, any[]>();
        allMembers.forEach((member) => {
          if (member.email) {
            const existing = emailMap.get(member.email) || [];
            existing.push(member);
            emailMap.set(member.email, existing);
          }
        });

        emailMap.forEach((duplicates) => {
          if (duplicates.length > 1) {
            candidates.push({
              primary: duplicates[0],
              duplicates: duplicates.slice(1),
            });
          }
        });

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/merge',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { orgId, candidatesCount: candidates.length },
        });

        return NextResponse.json({
          success: true,
          data: candidates,
          count: candidates.length,
        });
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/merge',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to find duplicates',
      error
    );
      }
      })(request);
};


