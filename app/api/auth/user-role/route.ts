import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/api-auth-guard";
import { getUserRole } from "@/lib/auth/rbac-server";

/**
 * GET /api/auth/user-role
 * Fetch the current user's role from the database
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use userId from URL params if provided (for admin use), otherwise use authenticated user
    const searchParams = req.nextUrl.searchParams;
    const queryUserId = searchParams.get('userId');
    const targetUserId = queryUserId || userId;

    // Fetch role from database/Clerk
    const role = await getUserRole(targetUserId);

    return NextResponse.json({ role });
  } catch (error) {
return NextResponse.json(
      { error: "Failed to fetch user role" },
      { status: 500 }
    );
  }
}
