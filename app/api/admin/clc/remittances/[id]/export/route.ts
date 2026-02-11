/**
 * CLC Per-Capita Remittance Export API
 * 
 * GET /api/admin/clc/remittances/[id]/export
 * 
 * Export a remittance in various formats (CSV, XML, EDI, StatCan)
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - Removed manual SET app.current_user_id command
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * 
 * @route /api/admin/clc/remittances/[id]/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { organizations } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { remittanceExporter, RemittanceExportFormat } from '@/services/clc/remittance-export';
import { remittanceValidator } from '@/services/clc/remittance-validation';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

/**
 * GET /api/admin/clc/remittances/[id]/export
 * 
 * Export remittance(s) in specified format
 * 
 * Query Parameters:
 * - format: Export format ('csv', 'xml', 'edi', 'statcan', 'excel')
 * - validate: Whether to validate before export (default: true)
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId } = context;

    try {
      const { id } = await params;
      const searchParams = request.nextUrl.searchParams;
      
      const format = (searchParams.get('format') || 'csv') as RemittanceExportFormat;
      const shouldValidate = searchParams.get('validate') !== 'false';

      // Validate format
      const validFormats: RemittanceExportFormat[] = ['csv', 'xml', 'edi', 'statcan', 'excel'];
      if (!validFormats.includes(format)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/remittances/[id]/export',
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'Invalid format', format, remittanceId: id },
        });
        return NextResponse.json(
          { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
          { status: 400 }
        );
      }

      // All database operations wrapped in withRLSContext for automatic context setting
      return withRLSContext(async (tx) => {
        // Export remittance(s)
        const exportFile = await remittanceExporter.exportRemittances({
          format,
          remittanceIds: [id],
        });

        // Set response headers
        const headers = new Headers();
        headers.set('Content-Type', exportFile.mimeType);
        headers.set('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
        headers.set('Content-Length', exportFile.size.toString());
        headers.set('X-Record-Count', exportFile.recordCount.toString());
        headers.set('X-Total-Amount', exportFile.totalAmount);
        headers.set('X-Checksum', exportFile.checksum);

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/remittances/[id]/export',
          method: 'GET',
          eventType: 'success',
          severity: 'high',
          details: {
            dataType: 'FINANCIAL',
            remittanceId: id,
            format,
            filename: exportFile.filename,
            recordCount: exportFile.recordCount,
            totalAmount: exportFile.totalAmount,
          },
        });

        // Convert Buffer to Uint8Array if needed
        const content = typeof exportFile.content === 'string' 
          ? exportFile.content 
          : new Uint8Array(exportFile.content);

        return new NextResponse(content, {
          status: 200,
          headers,
        });
      });
    } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/remittances/[id]/export',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
if (error instanceof Error && error.message === 'No remittances found for export') {
          return NextResponse.json(
            { error: 'Remittance not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to export remittance' },
          { status: 500 }
        );
    }
  })(request, { params });
};
