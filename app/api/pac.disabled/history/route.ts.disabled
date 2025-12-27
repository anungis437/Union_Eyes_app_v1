import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pacContributions, members } from '@/services/financial-service/src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const electionCycle = searchParams.get('electionCycle');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where conditions
    const whereConditions = electionCycle
      ? and(
          eq(pacContributions.tenantId, member.tenantId),
          eq(pacContributions.memberId, member.id),
          eq(pacContributions.electionCycle, electionCycle)
        )
      : and(
          eq(pacContributions.tenantId, member.tenantId),
          eq(pacContributions.memberId, member.id)
        );

    // Execute query
    const contributions = await db
      .select({
        id: pacContributions.id,
        amount: pacContributions.amount,
        contributionDate: pacContributions.contributionDate,
        electionCycle: pacContributions.electionCycle,
        committeeName: pacContributions.committeeName,
        paymentMethod: pacContributions.paymentMethod,
        status: pacContributions.status,
      })
      .from(pacContributions)
      .where(whereConditions)
      .orderBy(desc(pacContributions.contributionDate))
      .limit(limit);

    // Get total contributed
    const [totals] = await db
      .select({
        totalAmount: sql<string>`COALESCE(SUM(${pacContributions.amount}), 0)`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(pacContributions)
      .where(
        and(
          eq(pacContributions.tenantId, member.tenantId),
          eq(pacContributions.memberId, member.id),
          eq(pacContributions.status, 'completed')
        )
      );

    // Get total by election cycle
    const cycleBreakdown = await db
      .select({
        electionCycle: pacContributions.electionCycle,
        totalAmount: sql<string>`COALESCE(SUM(${pacContributions.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(pacContributions)
      .where(
        and(
          eq(pacContributions.tenantId, member.tenantId),
          eq(pacContributions.memberId, member.id),
          eq(pacContributions.status, 'completed')
        )
      )
      .groupBy(pacContributions.electionCycle)
      .orderBy(desc(sql`SUM(${pacContributions.amount})`));

    return NextResponse.json({
      contributions,
      summary: {
        totalAmount: parseFloat(totals.totalAmount || '0'),
        totalCount: totals.totalCount,
        cycleBreakdown: cycleBreakdown.map(cycle => ({
          electionCycle: cycle.electionCycle,
          totalAmount: parseFloat(cycle.totalAmount || '0'),
          count: cycle.count,
        })),
      },
    });

  } catch (error) {
    console.error('Get PAC history error:', error);
    return NextResponse.json(
      { error: 'Failed to get contribution history' },
      { status: 500 }
    );
  }
}
