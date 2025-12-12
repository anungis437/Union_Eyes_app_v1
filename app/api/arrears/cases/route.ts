import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { arrearsCases, members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

// List arrears cases with filters
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
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
    const status = searchParams.get('status');
    const minDaysOverdue = searchParams.get('minDaysOverdue');
    const maxDaysOverdue = searchParams.get('maxDaysOverdue');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build base query
    let whereConditions = [eq(arrearsCases.tenantId, member.tenantId)];

    if (status) {
      whereConditions.push(eq(arrearsCases.status, status));
    }
    if (minDaysOverdue) {
      whereConditions.push(gte(arrearsCases.daysOverdue, minDaysOverdue));
    }
    if (maxDaysOverdue) {
      whereConditions.push(lte(arrearsCases.daysOverdue, maxDaysOverdue));
    }
    if (minAmount) {
      whereConditions.push(gte(arrearsCases.totalOwed, minAmount));
    }
    if (maxAmount) {
      whereConditions.push(lte(arrearsCases.totalOwed, maxAmount));
    }

    // Get cases with member details
    const cases = await db
      .select({
        case: arrearsCases,
        member: {
          id: members.id,
          name: members.name,
          email: members.email,
          status: members.status,
        },
      })
      .from(arrearsCases)
      .innerJoin(members, eq(arrearsCases.memberId, members.id))
      .where(and(...whereConditions))
      .orderBy(desc(arrearsCases.totalOwed))
      .limit(limit);

    // Filter by search if provided
    let filteredCases = cases;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCases = cases.filter(c => 
        c.member.name?.toLowerCase().includes(searchLower) ||
        c.member.email?.toLowerCase().includes(searchLower) ||
        c.case.caseNumber.toLowerCase().includes(searchLower)
      );
    }

    // Get summary statistics
    const [summary] = await db
      .select({
        totalCases: sql<number>`COUNT(*)`,
        totalOwed: sql<string>`COALESCE(SUM(${arrearsCases.totalOwed}), 0)`,
        avgDaysOverdue: sql<string>`COALESCE(AVG(${arrearsCases.daysOverdue}), 0)`,
      })
      .from(arrearsCases)
      .where(and(...whereConditions));

    return NextResponse.json({
      cases: filteredCases,
      summary: {
        totalCases: summary.totalCases,
        totalOwed: parseFloat(summary.totalOwed || '0'),
        avgDaysOverdue: Math.round(parseFloat(summary.avgDaysOverdue || '0')),
      },
    });

  } catch (error) {
    console.error('List arrears cases error:', error);
    return NextResponse.json(
      { error: 'Failed to list arrears cases' },
      { status: 500 }
    );
  }
}
