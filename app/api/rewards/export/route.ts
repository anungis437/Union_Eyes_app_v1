import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import {
  exportAwardsToCSV,
  exportLedgerToCSV,
  exportBudgetsToCSV,
  exportRedemptionsToCSV,
  exportAnalyticsToCSV,
} from '@/lib/services/rewards/export-service';

/**
 * CSV Export API Endpoint
 * 
 * GET /api/rewards/export?type=awards&startDate=...&endDate=...
 * 
 * Query Parameters:
 * - type: 'awards' | 'ledger' | 'budgets' | 'redemptions' | 'analytics'
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - status: Comma-separated statuses (optional)
 * - programId: Program UUID (optional)
 * - userId: User UUID (optional, for ledger)
 * 
 * Security: Admin-only access
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate and check admin role
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role
    const member = await db.query.organizationMembers.findFirst({
      where: (members, { eq, and }) =>
        and(
          eq(members.userId, userId),
          eq(members.organizationId, orgId)
        ),
    });

    if (!member || !['admin', 'owner'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'awards';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status')?.split(',');
    const programId = searchParams.get('programId');
    const userIdFilter = searchParams.get('userId');
    const eventType = searchParams.get('eventType')?.split(',');

    // 3. Generate CSV based on type
    let csv: string;
    let filename: string;

    switch (type) {
      case 'awards':
        csv = await exportAwardsToCSV(orgId, {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          status,
          programId: programId || undefined,
        });
        filename = `awards-export-${Date.now()}.csv`;
        break;

      case 'ledger':
        csv = await exportLedgerToCSV(orgId, {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          userId: userIdFilter || undefined,
          eventType,
        });
        filename = `ledger-export-${Date.now()}.csv`;
        break;

      case 'budgets':
        csv = await exportBudgetsToCSV(orgId, {
          programId: programId || undefined,
          activeOnly: searchParams.get('activeOnly') === 'true',
        });
        filename = `budgets-export-${Date.now()}.csv`;
        break;

      case 'redemptions':
        csv = await exportRedemptionsToCSV(orgId, {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          status,
        });
        filename = `redemptions-export-${Date.now()}.csv`;
        break;

      case 'analytics':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required for analytics export' },
            { status: 400 }
          );
        }
        csv = await exportAnalyticsToCSV(
          orgId,
          new Date(startDate),
          new Date(endDate)
        );
        filename = `analytics-export-${Date.now()}.csv`;
        break;

      default:
        return NextResponse.json(
          { error: `Invalid export type: ${type}` },
          { status: 400 }
        );
    }

    // 4. Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[CSV Export API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export data' },
      { status: 500 }
    );
  }
}
