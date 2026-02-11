import { NextResponse } from "next/server";
import { auth } from "@/lib/api-auth-guard";
import { getProfileByUserId, updateProfile } from "@/db/queries/profiles-queries";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export async function POST() {
  try {
    const { userId } = auth();

    if (!userId) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Profile not found'
    );
    }

    let updatedProfile = profile;
    let changed = false;

    if (profile.membership === "free" && profile.billingCycleEnd) {
      const billingCycleEnd = new Date(profile.billingCycleEnd);
      const now = new Date();

      if (now > billingCycleEnd && (profile.usageCredits || 0) > 5) {
        const updateData: Record<string, unknown> = {
          usageCredits: 5,
          usedCredits: 0,
          status: "canceled",
        };

        if (!profile.nextCreditRenewal) {
          const nextRenewal = new Date();
          nextRenewal.setDate(nextRenewal.getDate() + 28);
          updateData.nextCreditRenewal = nextRenewal;
        }

        updatedProfile = await updateProfile(profile.userId, updateData);
        changed = true;
      }
    }

    return NextResponse.json({ changed, profile: updatedProfile });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to check expired credits',
      error
    );
  }
}
