import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pacContributions, members } from '@/services/financial-service/src/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

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

    // TODO: Add admin role check here
    // For now, any member can generate reports

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const electionCycle = searchParams.get('electionCycle');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json'; // json or csv

    if (!electionCycle && (!startDate || !endDate)) {
      return NextResponse.json({ 
        error: 'Either electionCycle or startDate+endDate is required' 
      }, { status: 400 });
    }

    // Build query
    let whereConditions = [
      eq(pacContributions.tenantId, member.tenantId),
      eq(pacContributions.status, 'completed'),
    ];

    if (electionCycle) {
      whereConditions.push(eq(pacContributions.electionCycle, electionCycle));
    } else {
      if (startDate) {
        whereConditions.push(gte(pacContributions.contributionDate, startDate));
      }
      if (endDate) {
        whereConditions.push(lte(pacContributions.contributionDate, endDate));
      }
    }

    // Get contributions with member details
    const contributions = await db
      .select({
        contributionId: pacContributions.id,
        contributionDate: pacContributions.contributionDate,
        amount: pacContributions.amount,
        electionCycle: pacContributions.electionCycle,
        committeeName: pacContributions.committeeName,
        // Member information
        name: members.name,
        email: members.email,
        // FEC required fields
        employer: pacContributions.contributorEmployer,
        occupation: pacContributions.contributorOccupation,
        address: pacContributions.contributorAddress,
        city: pacContributions.contributorCity,
        state: pacContributions.contributorState,
        zip: pacContributions.contributorZip,
      })
      .from(pacContributions)
      .innerJoin(members, eq(pacContributions.memberId, members.id))
      .where(and(...whereConditions))
      .orderBy(desc(pacContributions.contributionDate));

    // Calculate totals
    const [totals] = await db
      .select({
        totalAmount: sql<string>`COALESCE(SUM(${pacContributions.amount}), 0)`,
        totalCount: sql<number>`COUNT(*)`,
        averageAmount: sql<string>`COALESCE(AVG(${pacContributions.amount}), 0)`,
      })
      .from(pacContributions)
      .where(and(...whereConditions));

    // Format based on requested format
    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Date',
        'Name',
        'Email',
        'Address',
        'City',
        'State',
        'Zip',
        'Employer',
        'Occupation',
        'Amount',
        'Election Cycle',
        'Committee Name',
      ];

      const rows = contributions.map(c => [
        c.contributionDate,
        c.name,
        c.email,
        c.address || '',
        c.city || '',
        c.state || '',
        c.zip || '',
        c.employer || '',
        c.occupation || '',
        c.amount,
        c.electionCycle,
        c.committeeName,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="fec-report-${electionCycle || 'custom'}-${Date.now()}.csv"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      report: {
        electionCycle: electionCycle || `${startDate} to ${endDate}`,
        dateRange: {
          startDate,
          endDate,
        },
        summary: {
          totalAmount: parseFloat(totals.totalAmount || '0'),
          totalCount: totals.totalCount,
          averageAmount: parseFloat(totals.averageAmount || '0'),
        },
        contributions: contributions.map(c => {
          const nameParts = (c.name || '').split(' ');
          return {
            id: c.contributionId,
            date: c.contributionDate,
            contributor: {
              name: c.name,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: c.email,
              address: c.address,
              city: c.city,
              state: c.state,
              zip: c.zip,
              employer: c.employer,
              occupation: c.occupation,
            },
            amount: parseFloat(c.amount || '0'),
            electionCycle: c.electionCycle,
            committeeName: c.committeeName,
          };
        }),
      },
    });

  } catch (error) {
    console.error('FEC report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate FEC report' },
      { status: 500 }
    );
  }
}
