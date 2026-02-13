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
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkEntitlement } from '@/lib/services/entitlements';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      // 1. Authenticate and check admin role
      const { userId, organizationId } = context;
      
      if (!userId || !organizationId) {
        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
      }

      // Check entitlement for bulk export
      const entitlement = await checkEntitlement(organizationId, 'bulk_export');
      if (!entitlement.allowed) {
        return NextResponse.json(
          { 
            error: entitlement.reason || 'Upgrade required for bulk export',
            upgradeUrl: entitlement.upgradeUrl,
            feature: 'bulk_export',
            tier: entitlement.tier
          },
          { status: 403 }
        );
      }

      // Check admin role
      const member = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.organizationMembers.findFirst({
          where: (members, { eq, and }) =>
            and(
              eq(members.userId, userId),
              eq(members.organizationId, organizationId)
            ),
        });
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
          csv = await exportAwardsToCSV(organizationId, {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            status,
            programId: programId || undefined,
          });
          filename = `awards-export-${Date.now()}.csv`;
          break;

        case 'ledger':
          csv = await exportLedgerToCSV(organizationId, {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            userId: userIdFilter || undefined,
            eventType,
  });
        filename = `ledger-export-${Date.now()}.csv`;
        break;

      case 'budgets':
        csv = await exportBudgetsToCSV(organizationId, {
          programId: programId || undefined,
          activeOnly: searchParams.get('activeOnly') === 'true',
        });
        filename = `budgets-export-${Date.now()}.csv`;
        break;

      case 'redemptions':
        csv = await exportRedemptionsToCSV(organizationId, {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          status,
        });
        filename = `redemptions-export-${Date.now()}.csv`;
        break;

      case 'analytics':
        if (!startDate || !endDate) {
          return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'startDate and endDate are required for analytics export'
    );
        }
        csv = await exportAnalyticsToCSV(
          organizationId,
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
return NextResponse.json(
      { error: error.message || 'Failed to export data' },
      { status: 500 }
    );
  }
  })(request);
};

