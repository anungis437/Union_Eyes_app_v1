import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Aged Receivables Report API
 * 
 * GET /api/financial/reports/aged-receivables
 */

import { NextRequest, NextResponse } from 'next/server';
import { ERPConnectorRegistry } from '@/packages/financial/src/erp/connector-interface';
import { db } from '@/db';
import { erpConnectors } from '@/db/schema/domains/infrastructure';
import { and } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to generate aged receivables report',
      error
    );
    }
    })(request);
};

