/**
 * AI Clause Extraction API Route
 * 
 * POST /api/ai/extract-clauses
 * Extract clauses from CBA PDFs using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { extractClausesFromPDF, batchExtractClauses } from '@/lib/services/ai/clause-extraction-service';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      pdfUrl,
      cbaId,
      organizationId,
      autoSave = true,
      batch = false,
      cbas = [],
    } = body;

    // Batch extraction
    if (batch && cbas.length > 0) {
      const results = await batchExtractClauses(cbas, {
        autoSave,
        concurrency: 3,
      });

      const resultsArray = Array.from(results.entries()).map(([cbaId, result]) => ({
        cbaId,
        ...result,
      }));

      return NextResponse.json({
        success: true,
        batch: true,
        results: resultsArray,
        totalCBAs: cbas.length,
        successfulExtractions: resultsArray.filter(r => r.success).length,
      });
    }

    // Single extraction
    if (!pdfUrl || !cbaId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: pdfUrl, cbaId, organizationId' },
        { status: 400 }
      );
    }

    const result = await extractClausesFromPDF(pdfUrl, cbaId, {
      organizationId,
      autoSave,
    });

    return NextResponse.json({
      success: result.success,
      totalClauses: result.totalClauses,
      processingTime: result.processingTime,
      clauses: result.clauses,
      errors: result.errors,
    });
  } catch (error) {
    console.error('AI extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract clauses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
