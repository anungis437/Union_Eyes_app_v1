import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/api-auth-guard";
import { getUserRole } from "@/lib/auth/rbac-server";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * GET /api/auth/user-role
 * Fetch the current user's role from the database
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch user role',
      error
    );
  }
}
