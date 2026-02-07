import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Aged Receivables Report API
 * 
 * GET /api/financial/reports/aged-receivables
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

      const agedReceivables = await erpConnector.getAgedReceivablesReport(new Date(asOfDate));

      await erpConnector.disconnect();

      return NextResponse.json({
        success: true,
        data: {
          ...agedReceivables,
          totalCurrent: agedReceivables.totalCurrent.toString(),
          total1to30: agedReceivables.total1to30.toString(),
          total31to60: agedReceivables.total31to60.toString(),
          total61to90: agedReceivables.total61to90.toString(),
          totalOver90: agedReceivables.totalOver90.toString(),
          totalOutstanding: agedReceivables.totalOutstanding.toString(),
          customers: agedReceivables.customers.map(customer => ({
            ...customer,
            current: customer.current.toString(),
            days1to30: customer.days1to30.toString(),
            days31to60: customer.days31to60.toString(),
            days61to90: customer.days61to90.toString(),
            daysOver90: customer.daysOver90.toString(),
            total: customer.total.toString(),
            invoices: customer.invoices.map(invoice => ({
              ...invoice,
              amount: invoice.amount.toString(),
            })),
          })),
        },
      });
    } catch (error) {
      console.error('Aged receivables report error:', error);
      return NextResponse.json(
        { error: 'Failed to generate aged receivables report', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};
