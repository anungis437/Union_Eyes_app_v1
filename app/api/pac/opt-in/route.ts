import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
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

    const body = await req.json();
    const { recurringAmount, recurringFrequency, disclosureAccepted } = body;

    // Validate disclosure acceptance
    if (!disclosureAccepted) {
      return NextResponse.json({ 
        error: 'You must accept the PAC disclosure to opt in' 
      }, { status: 400 });
    }

    // Check if already opted in
    const [existing] = await db
      .select()
      .from(pacOptIns)
      .where(
        and(
          eq(pacOptIns.tenantId, member.tenantId),
          eq(pacOptIns.memberId, member.id)
        )
      )
      .limit(1);

    if (existing && existing.isActive) {
      return NextResponse.json({ 
        error: 'You are already opted into PAC contributions' 
      }, { status: 400 });
    }

    // Calculate next contribution date based on frequency
    const getNextContributionDate = (frequency: string): Date => {
      const now = new Date();
      switch (frequency) {
        case 'monthly':
          return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        case 'quarterly':
          return new Date(now.getFullYear(), now.getMonth() + 3, 1);
        case 'annually':
          return new Date(now.getFullYear() + 1, 0, 1);
        default:
          return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
    };

    const nextContributionDate = recurringAmount && recurringFrequency 
      ? getNextContributionDate(recurringFrequency) 
      : null;

    // Create or update opt-in
    if (existing) {
      await db
        .update(pacOptIns)
        .set({
          isActive: true,
          optInDate: new Date().toISOString().split('T')[0],
          optOutDate: null,
          recurringAmount,
          recurringFrequency,
          nextContributionDate: nextContributionDate?.toISOString().split('T')[0],
          disclosureAccepted: true,
          disclosureDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pacOptIns.id, existing.id));
    } else {
      await db.insert(pacOptIns).values({
        tenantId: member.tenantId,
        memberId: member.id,
        optInDate: new Date().toISOString().split('T')[0],
        isActive: true,
        recurringAmount,
        recurringFrequency,
        nextContributionDate: nextContributionDate?.toISOString().split('T')[0],
        disclosureAccepted: true,
        disclosureDate: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully opted into PAC contributions',
      nextContributionDate,
    });

  } catch (error) {
    console.error('PAC opt-in error:', error);
    return NextResponse.json(
      { error: 'Failed to process opt-in' },
      { status: 500 }
    );
  }
}

// Get opt-in status
export async function GET(req: NextRequest) {
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

    // Get opt-in status
    const [optIn] = await db
      .select()
      .from(pacOptIns)
      .where(
        and(
          eq(pacOptIns.tenantId, member.tenantId),
          eq(pacOptIns.memberId, member.id)
        )
      )
      .limit(1);

    return NextResponse.json({
      isOptedIn: optIn?.isActive || false,
      optInDate: optIn?.optInDate,
      recurringAmount: optIn?.recurringAmount,
      recurringFrequency: optIn?.recurringFrequency,
      nextContributionDate: optIn?.nextContributionDate,
    });

  } catch (error) {
    console.error('Get PAC opt-in error:', error);
    return NextResponse.json(
      { error: 'Failed to get opt-in status' },
      { status: 500 }
    );
  }
}
