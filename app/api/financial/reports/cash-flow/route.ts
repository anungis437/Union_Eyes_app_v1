import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Cash Flow Statement API
 * 
 * GET /api/financial/reports/cash-flow
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
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const connectorId = searchParams.get('connectorId');

      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate parameters required (YYYY-MM-DD)' },
          { status: 400 }
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
        return NextResponse.json({ error: 'ERP connector not found' }, { status: 404 });
      }

      const erpConnector = ERPConnectorRegistry.create({
        systemType: connector.systemType,
        credentials: JSON.parse(connector.encryptedCredentials),
        settings: connector.config as any,
      });

      await erpConnector.connect();

      const cashFlowStatement = await erpConnector.getCashFlowStatement({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      await erpConnector.disconnect();

      return NextResponse.json({
        success: true,
        data: {
          ...cashFlowStatement,
          netCashFlow: cashFlowStatement.netCashFlow.toString(),
          beginningCash: cashFlowStatement.beginningCash.toString(),
          endingCash: cashFlowStatement.endingCash.toString(),
          operatingActivities: {
            ...cashFlowStatement.operatingActivities,
            subtotal: cashFlowStatement.operatingActivities.subtotal.toString(),
            items: cashFlowStatement.operatingActivities.items.map(item => ({
              ...item,
              amount: item.amount.toString(),
            })),
          },
          investingActivities: {
            ...cashFlowStatement.investingActivities,
            subtotal: cashFlowStatement.investingActivities.subtotal.toString(),
            items: cashFlowStatement.investingActivities.items.map(item => ({
              ...item,
              amount: item.amount.toString(),
            })),
          },
          financingActivities: {
            ...cashFlowStatement.financingActivities,
            subtotal: cashFlowStatement.financingActivities.subtotal.toString(),
            items: cashFlowStatement.financingActivities.items.map(item => ({
              ...item,
              amount: item.amount.toString(),
            })),
          },
        },
      });
    } catch (error) {
      console.error('Cash flow statement generation error:', error);
      return NextResponse.json(
        { error: 'Failed to generate cash flow statement', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};
