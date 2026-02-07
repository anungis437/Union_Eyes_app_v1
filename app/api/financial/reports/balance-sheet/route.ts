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
import { erpConnectors } from '@/db/schema/erp-integration-schema';
import { eq, and } from 'drizzle-orm';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const asOfDate = searchParams.get('asOfDate');
      const connectorId = searchParams.get('connectorId');

      if (!asOfDate) {
        return NextResponse.json({ error: 'asOfDate parameter required (YYYY-MM-DD)' }, { status: 400 });
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
        return NextResponse.json({ error: 'ERP connector not found' }, { status: 404 });
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
      console.error('Balance sheet generation error:', error);
      return NextResponse.json(
        { error: 'Failed to generate balance sheet', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};
