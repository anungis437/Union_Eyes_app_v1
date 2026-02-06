/**
 * Member Export API Route
 * GET /api/members/export - Export members data
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listMembers } from "@/lib/services/member-service";

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
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const format = searchParams.get("format") || "csv";
    
    // Build filters
    const filters: any = { organizationId };
    
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
    console.error("Error exporting members:", error);
    return NextResponse.json(
      { error: "Failed to export members", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
