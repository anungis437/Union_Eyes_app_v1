/**
 * CLC Per-Capita Remittance Export API
 * 
 * GET /api/admin/clc/remittances/[id]/export
 * 
 * Export a remittance in various formats (CSV, XML, EDI, StatCan)
 * 
 * @route /api/admin/clc/remittances/[id]/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { remittanceExporter, RemittanceExportFormat } from '@/services/clc/remittance-export';
import { remittanceValidator } from '@/services/clc/remittance-validation';

/**
 * GET /api/admin/clc/remittances/[id]/export
 * 
 * Export remittance(s) in specified format
 * 
 * Query Parameters:
 * - format: Export format ('csv', 'xml', 'edi', 'statcan', 'excel')
 * - validate: Whether to validate before export (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set session context for RLS
    await db.execute(sql`SET app.current_user_id = ${userId}`);

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const format = (searchParams.get('format') || 'csv') as RemittanceExportFormat;
    const shouldValidate = searchParams.get('validate') !== 'false';

    // Validate format
    const validFormats: RemittanceExportFormat[] = ['csv', 'xml', 'edi', 'statcan', 'excel'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Export remittance(s)
    const exportFile = await remittanceExporter.exportRemittances({
      format,
      remittanceIds: [id],
    });

    // Optional validation
    if (shouldValidate) {
      // Note: Validation happens inside exportRemittances, but we could add additional checks here
    }

    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', exportFile.mimeType);
    headers.set('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
    headers.set('Content-Length', exportFile.size.toString());
    headers.set('X-Record-Count', exportFile.recordCount.toString());
    headers.set('X-Total-Amount', exportFile.totalAmount);
    headers.set('X-Checksum', exportFile.checksum);

    // Convert Buffer to Uint8Array if needed
    const content = typeof exportFile.content === 'string' 
      ? exportFile.content 
      : new Uint8Array(exportFile.content);

    return new NextResponse(content, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error exporting remittance:', error);
    
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
}
