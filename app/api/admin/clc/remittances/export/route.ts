/**
 * CLC Per-Capita Remittance Export API
 * Purpose: Export remittance data in various formats (CSV, XML, StatCan)
 * 
 * Endpoint:
 * - GET /api/admin/clc/remittances/export - Export remittances
 * 
 * Query Parameters:
 * - format: 'csv' | 'xml' | 'statcan'
 * - remittanceIds: comma-separated list of remittance IDs (for csv/xml)
 * - fiscalYear: year for StatCan export
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { generateRemittanceFile } from '@/services/clc/remittance-exporter';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

// =====================================================================================
// GET - Export remittances
// =====================================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
        // Set session context for RLS
        await db.execute(sql`SET app.current_user_id = ${user.id}`);

        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') as 'csv' | 'xml' | 'statcan' | null;
        const remittanceIdsParam = searchParams.get('remittanceIds');
        const fiscalYearParam = searchParams.get('fiscalYear');

        // Validate format
        if (!format || !['csv', 'xml', 'statcan'].includes(format)) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/admin/clc/remittances/export',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { reason: 'Invalid format', format },
          });
          return NextResponse.json(
            { error: 'Invalid format. Must be csv, xml, or statcan' },
            { status: 400 }
          );
        }

        // Parse remittance IDs
        const remittanceIds = remittanceIdsParam
          ? remittanceIdsParam.split(',').map(id => id.trim())
          : [];

        // Validate format-specific requirements
        if ((format === 'csv' || format === 'xml') && remittanceIds.length === 0) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/admin/clc/remittances/export',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { reason: 'remittanceIds required for CSV/XML', format },
          });
          return NextResponse.json(
            { error: 'remittanceIds required for CSV and XML formats' },
            { status: 400 }
          );
        }

        if (format === 'statcan' && !fiscalYearParam) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/admin/clc/remittances/export',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { reason: 'fiscalYear required for StatCan', format },
          });
          return NextResponse.json(
            { error: 'fiscalYear required for StatCan format' },
            { status: 400 }
          );
        }

        const fiscalYear = fiscalYearParam ? parseInt(fiscalYearParam) : undefined;

        // Generate file
        const { filename, content, mimeType } = await generateRemittanceFile({
          format,
          remittanceIds,
          fiscalYear,
        });

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/admin/clc/remittances/export',
          method: 'GET',
          eventType: 'success',
          severity: 'high',
          details: {
            dataType: 'FINANCIAL',
            format,
            remittanceCount: remittanceIds.length,
            fiscalYear,
            filename,
          },
        });

        // Return file as download
        const response = new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': Buffer.byteLength(content, 'utf-8').toString(),
          },
        });

        return response;
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/admin/clc/remittances/export',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error('Error exporting remittances:', error);
        return NextResponse.json(
          { error: 'Failed to export remittances' },
          { status: 500 }
        );
      }
  })(request);
};
