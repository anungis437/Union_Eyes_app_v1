import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Financial Reporting API
 * 
 * Endpoints for generating financial statements:
 * - Balance Sheet
 * - Income Statement (P&L)
 * - Cash Flow Statement
 * - Trial Balance
 * - Budget vs Actual
 * - Aged Receivables
 */

import { NextRequest, NextResponse } from 'next/server';
import { ERPConnectorRegistry } from '@/packages/financial/src/erp/connector-interface';
import { db } from '@/db';
import { erpConnectors } from '@/db/schema/domains/infrastructure';
import { and } from 'drizzle-orm';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const asOfDate = searchParams.get('asOfDate');
      const connectorId = searchParams.get('connectorId');

      if (!asOfDate) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'asOfDate parameter required (YYYY-MM-DD)'
    );
      }

      // Get ERP connector
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

      // Create connector instance
      const erpConnector = ERPConnectorRegistry.create({
        systemType: connector.systemType,
        credentials: JSON.parse(connector.encryptedCredentials),
        settings: connector.config as any,
      });

      await erpConnector.connect();

      // Generate balance sheet
      const balanceSheet = await erpConnector.getBalanceSheet(new Date(asOfDate));

      await erpConnector.disconnect();

      return NextResponse.json({
        success: true,
        data: {
          ...balanceSheet,
          // Convert Decimal to string for JSON
          totalAssets: balanceSheet.totalAssets.toString(),
          totalLiabilities: balanceSheet.totalLiabilities.toString(),
          totalEquity: balanceSheet.totalEquity.toString(),
          assets: {
            ...balanceSheet.assets,
            subtotal: balanceSheet.assets.subtotal.toString(),
            accounts: balanceSheet.assets.accounts.map(acc => ({
              ...acc,
              balance: acc.balance.toString(),
            })),
          },
          liabilities: {
            ...balanceSheet.liabilities,
            subtotal: balanceSheet.liabilities.subtotal.toString(),
            accounts: balanceSheet.liabilities.accounts.map(acc => ({
              ...acc,
              balance: acc.balance.toString(),
            })),
          },
          equity: {
            ...balanceSheet.equity,
            subtotal: balanceSheet.equity.subtotal.toString(),
            accounts: balanceSheet.equity.accounts.map(acc => ({
              ...acc,
              balance: acc.balance.toString(),
            })),
          },
        },
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate balance sheet',
      error
    );
    }
    })(request);
};

