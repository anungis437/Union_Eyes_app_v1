import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  exportAwardsToCSV,
  exportLedgerToCSV,
  exportBudgetsToCSV,
  exportRedemptionsToCSV,
  exportAnalyticsToCSV,
} from '@/lib/services/rewards/export-service';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // 1. Authenticate and check admin role
      const { user.id, orgId } = await auth();
      
      if (!user.id || !orgId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check admin role
      const member = await db.query.organizationMembers.findFirst({
        where: (members, { eq, and }) =>
          and(
            eq(members.user.id, user.id),
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
      const userIdFilter = searchParams.get('user.id');
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
            user.id: userIdFilter || undefined,
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
  })(request);
};
