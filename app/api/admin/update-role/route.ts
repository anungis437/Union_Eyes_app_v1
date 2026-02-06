import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationMembers } from '@/db/schema-organizations';
import { eq, and } from 'drizzle-orm';

const DEFAULT_ORG_ID = '458a56cb-251a-4c91-a0b5-81bb8ac39087';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    // Update to super_admin
    const result = await db
      .update(organizationMembers)
      .set({
        role: 'super_admin',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, DEFAULT_ORG_ID)
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      updated: result[0] || null
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
