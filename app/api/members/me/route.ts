import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { users } from '@/db/schema/user-management-schema';
import { claims } from '@/db/schema/claims-schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';

/**
 * GET /api/members/me
 * Get current user's profile and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user profile (using Clerk userId)
    // Note: Since we're using Clerk, we might not have all data in our DB
    // We'll construct profile from Clerk data + our database stats
    
    // Get claims statistics
    const [claimsStats] = await db
      .select({
        totalClaims: count(),
        activeClaims: sql<number>`COUNT(CASE WHEN status NOT IN ('resolved', 'rejected', 'closed') THEN 1 END)`,
        resolvedClaims: sql<number>`COUNT(CASE WHEN status = 'resolved' THEN 1 END)`,
        rejectedClaims: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`,
      })
      .from(claims)
      .where(eq(claims.memberId, userId));

    // Get recent claims
    const recentClaims = await db
      .select({
        claimId: claims.claimId,
        claimNumber: claims.claimNumber,
        claimType: claims.claimType,
        status: claims.status,
        priority: claims.priority,
        createdAt: claims.createdAt,
      })
      .from(claims)
      .where(eq(claims.memberId, userId))
      .orderBy(desc(claims.createdAt))
      .limit(5);

    return NextResponse.json({
      profile: {
        userId,
        // Additional profile data would come from Clerk or our database
        claimsStats: {
          total: claimsStats.totalClaims || 0,
          active: claimsStats.activeClaims || 0,
          resolved: claimsStats.resolvedClaims || 0,
          rejected: claimsStats.rejectedClaims || 0,
        },
        recentClaims,
      },
    });
  } catch (error) {
    console.error('Error fetching member profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/members/me
 * Update current user's profile preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { timezone, locale, phone, displayName } = body;

    // Validate inputs
    const updates: any = {};
    
    if (timezone) {
      updates.timezone = timezone;
    }
    
    if (locale) {
      updates.locale = locale;
    }
    
    if (phone !== undefined) {
      updates.phone = phone;
    }
    
    if (displayName !== undefined) {
      updates.displayName = displayName;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();

    // Update user in database
    // Note: This assumes we have user records in our DB
    // If using Clerk exclusively, preferences might be stored differently
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.userId, userId))
      .returning();

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        userId: updatedUser.userId,
        displayName: updatedUser.displayName,
        timezone: updatedUser.timezone,
        locale: updatedUser.locale,
        phone: updatedUser.phone,
      },
    });
  } catch (error) {
    console.error('Error updating member profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
