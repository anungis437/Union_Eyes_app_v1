/**
 * Members Bulk Operations API Route
 * POST /api/members/bulk - Perform bulk operations on members
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  bulkImportMembers,
  bulkUpdateMemberStatus,
  bulkUpdateMemberRole
} from "@/lib/services/member-service";

/**
 * POST /api/members/bulk
 * Perform bulk operations on members
 * 
 * Body:
 * - operation: "import" | "updateStatus" | "updateRole" (required)
 * - members: array (for import operation)
 * - memberIds: string[] (for update operations)
 * - status: string (for updateStatus operation)
 * - role: string (for updateRole operation)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.operation) {
      return NextResponse.json({ error: "operation is required" }, { status: 400 });
    }

    let result;

    switch (body.operation) {
      case "import":
        if (!body.members || !Array.isArray(body.members) || body.members.length === 0) {
          return NextResponse.json({ error: "members array is required for import operation" }, { status: 400 });
        }
        result = await bulkImportMembers(body.members);
        break;

      case "updateStatus":
        if (!body.memberIds || !Array.isArray(body.memberIds) || body.memberIds.length === 0) {
          return NextResponse.json({ error: "memberIds array is required" }, { status: 400 });
        }
        if (!body.status) {
          return NextResponse.json({ error: "status is required for updateStatus operation" }, { status: 400 });
        }
        result = await bulkUpdateMemberStatus(body.memberIds, body.status);
        break;

      case "updateRole":
        if (!body.memberIds || !Array.isArray(body.memberIds) || body.memberIds.length === 0) {
          return NextResponse.json({ error: "memberIds array is required" }, { status: 400 });
        }
        if (!body.role) {
          return NextResponse.json({ error: "role is required for updateRole operation" }, { status: 400 });
        }
        result = await bulkUpdateMemberRole(body.memberIds, body.role);
        break;

      default:
        return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error performing bulk member operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
