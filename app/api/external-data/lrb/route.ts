/**
 * LRB Agreements API Routes
 * 
 * Provides endpoints for:
 * - Searching LRB agreements
 * - Triggering sync operations
 * - Getting wage comparisons
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { unifiedLRBService } from '@/lib/services/external-data/lrb-unified-service';
import { db } from '@/db/db';
import { lrbAgreements, lrbSyncLog } from '@/db/schema/lrb-agreements-schema';
import { eq, desc } from 'drizzle-orm';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// GET /api/external-data/lrb - Search agreements
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'search';

    switch (action) {
      case 'search': {
        const result = await unifiedLRBService.search({
          source: searchParams.get('source') as any || undefined,
          employerName: searchParams.get('employer') || undefined,
          unionName: searchParams.get('union') || undefined,
          jurisdiction: searchParams.get('jurisdiction') || undefined,
          sector: searchParams.get('sector') || undefined,
          status: searchParams.get('status') || 'active',
          page: parseInt(searchParams.get('page') || '1'),
          limit: parseInt(searchParams.get('limit') || '20'),
        });

        return NextResponse.json(result);
      }

      case 'get': {
        const id = searchParams.get('id');
        if (!id) {
          return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Agreement ID required'
    );
        }

        const agreement = await unifiedLRBService.getById(id);
        if (!agreement) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Agreement not found'
    );
        }

        return NextResponse.json({ agreement });
      }

      case 'wage-comparison': {
        const nocCode = searchParams.get('noc');
        const jurisdiction = searchParams.get('jurisdiction') || undefined;

        if (!nocCode) {
          return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'NOC code required'
    );
        }

        const comparisons = await unifiedLRBService.getWageComparisons(nocCode, jurisdiction);
        return NextResponse.json({ 
          nocCode, 
          jurisdiction,
          comparisons,
          count: comparisons.length 
        });
      }

      case 'sync-status': {
        const source = searchParams.get('source') || undefined;
        const history = await unifiedLRBService.getSyncHistory(source, 5);
        return NextResponse.json({ 
          syncHistory: history,
          lastSync: history[0] || null,
        });
      }

      case 'statistics': {
        const stats = await unifiedLRBService.getStatistics();
        return NextResponse.json(stats);
      }

      default:
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid action'
    );
    }
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
  }
}

// POST /api/external-data/lrb - Trigger sync operations
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'sync-ontario': {
        const result = await unifiedLRBService.syncOntario();
        return NextResponse.json(result);
      }

      case 'sync-bc': {
        const result = await unifiedLRBService.syncBC();
        return NextResponse.json(result);
      }

      case 'sync-all': {
        const result = await unifiedLRBService.syncAll();
        return NextResponse.json({
          success: result.ontario.success && result.bc.success,
          ontario: result.ontario,
          bc: result.bc,
          totalInserted: result.totalInserted,
          totalUpdated: result.totalUpdated,
        });
      }

      case 'search': {
        const result = await unifiedLRBService.search(params || {});
        return NextResponse.json(result);
      }

      default:
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid action'
    );
    }
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
  }
}

