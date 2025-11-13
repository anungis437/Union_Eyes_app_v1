import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { users } from '@/db/schema/user-management-schema';
import { claims } from '@/db/schema/claims-schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/members/[id]
 * Get member profile by ID (admin/LRO only)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const memberId = params.id;

    // Check if user is accessing their own profile or is admin
    // For now, allow users to access their own profile
    if (userId !== memberId) {
      // TODO: Check if user has admin permissions
      // For now, restrict to own profile only
      return NextResponse.json(
        { error: 'Forbidden - can only access own profile' },
        { status: 403 }
      );
    }

    // Get member's claims statistics
    const [claimsStats] = await db
      .select({
        totalClaims: count(),
        activeClaims: sql<number>`COUNT(CASE WHEN status NOT IN ('resolved', 'rejected', 'closed') THEN 1 END)`,
        resolvedClaims: sql<number>`COUNT(CASE WHEN status = 'resolved' THEN 1 END)`,
        rejectedClaims: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`,
        pendingReview: sql<number>`COUNT(CASE WHEN status = 'under_review' THEN 1 END)`,
      })
      .from(claims)
      .where(eq(claims.memberId, memberId));

    // Get member's recent activity
    const recentClaims = await db
      .select({
        claimId: claims.claimId,
        claimNumber: claims.claimNumber,
        claimType: claims.claimType,
        status: claims.status,
        priority: claims.priority,
        createdAt: claims.createdAt,
        updatedAt: claims.updatedAt,
      })
      .from(claims)
      .where(eq(claims.memberId, memberId))
      .orderBy(desc(claims.createdAt))
      .limit(10);

    // Try to get user info from database
    const [userInfo] = await db
      .select({
        userId: users.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        phone: users.phone,
        timezone: users.timezone,
        locale: users.locale,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.userId, memberId));

    const memberInfo = userInfo || {};
    
    return NextResponse.json({
      member: {
        ...memberInfo,
        userId: memberId,
        statistics: {
          total: claimsStats.totalClaims || 0,
          active: claimsStats.activeClaims || 0,
          resolved: claimsStats.resolvedClaims || 0,
          rejected: claimsStats.rejectedClaims || 0,
          pendingReview: claimsStats.pendingReview || 0,
        },
        recentActivity: recentClaims,
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
 * PATCH /api/members/[id]
 * Update member profile (admin/LRO or own profile)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const memberId = params.id;

    // Check if user is updating their own profile or is admin
    if (userId !== memberId) {
      // TODO: Check if user has admin permissions
      return NextResponse.json(
        { error: 'Forbidden - can only update own profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      displayName,
      phone,
      timezone,
      locale,
    } = body;

    // Build update object
    const updates: any = { updatedAt: new Date() };

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (displayName !== undefined) updates.displayName = displayName;
    if (phone !== undefined) updates.phone = phone;
    if (timezone !== undefined) updates.timezone = timezone;
    if (locale !== undefined) updates.locale = locale;

    if (Object.keys(updates).length === 1) {
      // Only updatedAt, no actual changes
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.userId, memberId))
      .returning();

    if (!updatedUser) {
      // User doesn't exist in our DB, create a basic record
      const [newUser] = await db
        .insert(users)
        .values({
          userId: memberId,
          email: body.email || `${memberId}@temp.com`, // Should be provided
          ...updates,
        })
        .returning();

      return NextResponse.json({
        message: 'Profile created and updated successfully',
        member: {
          userId: newUser.userId,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          displayName: newUser.displayName,
          phone: newUser.phone,
          timezone: newUser.timezone,
          locale: newUser.locale,
        },
      });
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      member: {
        userId: updatedUser.userId,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        displayName: updatedUser.displayName,
        phone: updatedUser.phone,
        timezone: updatedUser.timezone,
        locale: updatedUser.locale,
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
