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
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { generateRemittanceFile } from '@/services/clc/remittance-exporter';

// =====================================================================================
// GET - Export remittances
// =====================================================================================

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set session context for RLS
    await db.execute(sql`SET app.current_user_id = ${userId}`);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') as 'csv' | 'xml' | 'statcan' | null;
    const remittanceIdsParam = searchParams.get('remittanceIds');
    const fiscalYearParam = searchParams.get('fiscalYear');

    // Validate format
    if (!format || !['csv', 'xml', 'statcan'].includes(format)) {
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
      return NextResponse.json(
        { error: 'remittanceIds required for CSV and XML formats' },
        { status: 400 }
      );
    }

    if (format === 'statcan' && !fiscalYearParam) {
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
    console.error('Error exporting remittances:', error);
    return NextResponse.json(
      { error: 'Failed to export remittances' },
      { status: 500 }
    );
  }
}
