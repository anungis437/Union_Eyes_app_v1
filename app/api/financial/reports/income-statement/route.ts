import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Income Statement (Profit & Loss) API
 * 
 * GET /api/financial/reports/income-statement
 */

import { NextRequest, NextResponse } from 'next/server';
import { ERPConnectorRegistry } from '@/packages/financial/src/erp/connector-interface';
import { db } from '@/db';
import { erpConnectors } from '@/db/schema/domains/infrastructure';
import { eq, and } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const connectorId = searchParams.get('connectorId');

      if (!startDate || !endDate) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'startDate and endDate parameters required (YYYY-MM-DD)'
    );
      }

      const [connector] = await db
        .select()
        .from(erpConnectors)
        .where(
          and(
            eq(erpConnectors.id, connectorId || ''),
            eq(erpConnectors.isActive, true)
          )
        )
        .limit(1);

      if (!connector) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'ERP connector not found'
    );
      }

      const erpConnector = ERPConnectorRegistry.create({
        systemType: connector.systemType,
        credentials: JSON.parse(connector.encryptedCredentials),
        settings: connector.config as any,
      });

      await erpConnector.connect();

      const incomeStatement = await erpConnector.getIncomeStatement({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      await erpConnector.disconnect();

      return NextResponse.json({
        success: true,
        data: {
          ...incomeStatement,
          totalRevenue: incomeStatement.totalRevenue.toString(),
          totalExpenses: incomeStatement.totalExpenses.toString(),
          netIncome: incomeStatement.netIncome.toString(),
          grossProfit: incomeStatement.grossProfit?.toString(),
          operatingIncome: incomeStatement.operatingIncome?.toString(),
          revenue: {
            ...incomeStatement.revenue,
            subtotal: incomeStatement.revenue.subtotal.toString(),
            accounts: incomeStatement.revenue.accounts.map(acc => ({
              ...acc,
              amount: acc.amount.toString(),
            })),
          },
          expenses: {
            ...incomeStatement.expenses,
            subtotal: incomeStatement.expenses.subtotal.toString(),
            accounts: incomeStatement.expenses.accounts.map(acc => ({
              ...acc,
              amount: acc.amount.toString(),
            })),
          },
        },
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate income statement',
      error
    );
    }
    })(request);
};

