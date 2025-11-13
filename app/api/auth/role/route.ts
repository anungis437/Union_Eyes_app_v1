/**
 * API route to fetch user role
 * GET /api/auth/role
 */

import { NextResponse } from "next/server";
import { getUserRole, requireAuth } from "@/lib/auth/rbac-server";

export async function GET() {
  try {
    const { userId, role } = await requireAuth();
    
    return NextResponse.json({ 
      userId,
      role,
      success: true 
    });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch user role",
        success: false 
      },
      { status: 401 }
    );
  }
}
