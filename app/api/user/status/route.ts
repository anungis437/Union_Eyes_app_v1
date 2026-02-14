
import { getProfileByUserId } from "@/db/queries/profiles-queries";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { requireApiAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * GET /api/user/status
 * Get current user's status
 * 
 * GUARDED: requireApiAuth
 */
export async function GET() {
  try {
    // Authentication guard
    const { userId } = await requireApiAuth();
    
    if (!userId) {
      return NextResponse.json({ status: null }, { status: 401 });
    }
    
    // Get profile info directly - no need for caching since polling is removed
    const profile = await getProfileByUserId(userId);
    
    // Return minimal profile data
    return NextResponse.json({
      status: profile?.status || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch status',
      error
    );
  }
} 
