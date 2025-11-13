import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClaimStatistics } from "@/db/queries/claims-queries";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // TODO: Get tenant ID from user's profile/organization
    // For now, we'll use a default tenant ID
    // In production, fetch this from the user's profile or organization membership
    const tenantId = "default-tenant-id";
    
    const statistics = await getClaimStatistics(tenantId);
    
    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
