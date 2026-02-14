/**
 * Member Export API Route
 * GET /api/members/export - Export members data
 */

import { NextRequest, NextResponse } from "next/server";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { listMembers } from "@/lib/services/member-service";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * GET /api/members/export
 * Export members data as CSV or JSON
 * 
 * Query params:
 * - organizationId: string (required)
 * - format: "csv" | "json" (default: "csv")
 * - status: string[] (comma-separated)
 * - role: string[] (comma-separated)
 * - department: string
 */
export const GET = withRoleAuth(20, async (request, context) => {
  const { userId, organizationId } = context;

  // Check rate limit for export operations
  const rateLimitResult = await checkRateLimit(
    `member-export:${userId}`,
    RATE_LIMITS.MEMBER_EXPORT
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please try again later.',
        resetIn: rateLimitResult.resetIn 
      },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
        const { searchParams } = new URL(request.url);
        const orgIdParam = searchParams.get("organizationId");
  if (orgIdParam && orgIdParam !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


        if (!orgIdParam) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), 
            userId,
            endpoint: '/api/members/export',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'MEMBER_DATA',
            details: { reason: 'organizationId is required' },
          });
          return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required'
    );
        }

        const format = searchParams.get("format") || "csv";
        
        // Build filters
        const filters = { organizationId };
        
        const status = searchParams.get("status");
        if (status) {
          filters.status = status.split(",");
        }

        const role = searchParams.get("role");
        if (role) {
          filters.role = role.split(",");
        }

        const department = searchParams.get("department");
        if (department) {
          filters.department = department;
        }

        // Get all members (no pagination for export)
        const { members } = await listMembers(filters, { limit: 10000 });

        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: '/api/members/export',
          method: 'GET',
          eventType: 'success',
          severity: 'medium',
          dataType: 'MEMBER_DATA',
          details: { organizationId, format, memberCount: members.length, filters },
        });

        if (format === "json") {
          return NextResponse.json(members);
        }

        // Generate CSV
        if (members.length === 0) {
          return new NextResponse("No data to export", {
            status: 200,
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": `attachment; filename="members-export-${Date.now()}.csv"`,
            },
          });
        }

        // CSV headers
        const headers = [
          "ID",
          "Name",
          "Email",
          "Phone",
          "Role",
          "Status",
          "Department",
          "Position",
          "Membership Number",
          "Hire Date",
          "Union Join Date",
          "Created At",
        ];

        // CSV rows
        const rows = members.map((member) => [
          member.id,
          member.name,
          member.email,
          member.phone || "",
          member.role,
          member.status,
          member.department || "",
          member.position || "",
          member.membershipNumber || "",
          member.hireDate ? new Date(member.hireDate).toISOString().split("T")[0] : "",
          member.unionJoinDate ? new Date(member.unionJoinDate).toISOString().split("T")[0] : "",
          new Date(member.createdAt).toISOString().split("T")[0],
        ]);

        // Combine into CSV
        const csv = [
          headers.join(","),
          ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="members-export-${Date.now()}.csv"`,
          },
        });
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/members/export',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          dataType: 'MEMBER_DATA',
          details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
        });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to export members',
      error
    );
      }
});


