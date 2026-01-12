/**
 * Admin authentication utilities for API routes
 * Provides consistent admin role checking using organizationMembers table
 */

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { organizationMembers } from "@/db/schema/organization-schema";
import { eq, and } from "drizzle-orm";
import { getOrganizationIdForUser } from "@/lib/organization-utils";
import { NextResponse } from "next/server";

/**
 * Check if the current user has admin privileges
 * Returns { authorized: true, userId: string } if admin
 * Returns { authorized: false, response: NextResponse } if not admin
 */
export async function requireAdmin(): Promise<
  | { authorized: true; userId: string; organizationId: string }
  | { authorized: false; response: NextResponse }
> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Unauthorized - Authentication required" },
          { status: 401 }
        ),
      };
    }

    const organizationId = await getOrganizationIdForUser(userId);

    const adminCheck = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, "active")
        )
      )
      .limit(1);

    const role = adminCheck[0]?.role;

    // Check if user has admin or super_admin role
    if (!role || (role !== "admin" && role !== "super_admin")) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      userId,
      organizationId,
    };
  } catch (error) {
    console.error("[requireAdmin] Error checking admin status:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Simplified admin check that returns boolean
 * Useful for conditional logic within authenticated routes
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const organizationId = await getOrganizationIdForUser(userId);

    const result = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, "active")
        )
      )
      .limit(1);

    const role = result[0]?.role;
    return role === "admin" || role === "super_admin";
  } catch (error) {
    console.error("[isAdmin] Error checking admin status:", error);
    return false;
  }
}
