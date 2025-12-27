import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pacOptIns, members } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if opted in
    const [existing] = await db
      .select()
      .from(pacOptIns)
      .where(
        and(
          eq(pacOptIns.tenantId, member.tenantId),
          eq(pacOptIns.memberId, member.id),
          eq(pacOptIns.isActive, true)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ 
        error: 'You are not currently opted into PAC contributions' 
      }, { status: 400 });
    }

    // Update opt-in to inactive
    await db
      .update(pacOptIns)
      .set({
        isActive: false,
        optOutDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      })
      .where(eq(pacOptIns.id, existing.id));

    return NextResponse.json({
      success: true,
      message: 'Successfully opted out of PAC contributions',
    });

  } catch (error) {
    console.error('PAC opt-out error:', error);
    return NextResponse.json(
      { error: 'Failed to process opt-out' },
      { status: 500 }
    );
  }
}
