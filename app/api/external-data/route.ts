/**
 * External Data Integration API Routes
 * 
 * Handles all external data source integrations:
 * - Statistics Canada wage and labor data
 * - Provincial Labour Relations Board data
 * - CLC Partnership data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { wageEnrichmentService } from '@/lib/services/external-data/wage-enrichment-service';
import { statCanClient, provinceToGeographyCode } from '@/lib/services/external-data/statcan-client';
import { db } from '@/db/db';
import { wageBenchmarks, unionDensity as unionDensityTable, costOfLivingData } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET /api/external-data - List available endpoints and sync status
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list': {
        return NextResponse.json({
          endpoints: {
            'GET /api/external-data?action=sync-status': 'Check sync status',
            'GET /api/external-data?action=wages&noc=6513&geo=35': 'Get wage data',
            'GET /api/external-data?action=union-density&geo=35': 'Get union density',
            'GET /api/external-data?action=cola&geo=35': 'Get COLA data',
            'POST /api/external-data/sync/wages': 'Sync wage data',
            'POST /api/external-data/sync/union-density': 'Sync union density',
            'POST /api/external-data/sync/cola': 'Sync COLA data',
          },
          sources: [
            { name: 'Statistics Canada', type: 'api', status: 'available' },
            { name: 'Ontario LRB', type: 'scraper', status: 'pending' },
            { name: 'BC LRB', type: 'api', status: 'pending' },
            { name: 'CLC Partnership', type: 'oauth', status: 'planned' },
          ],
        });
      }

      case 'sync-status': {
        const history = await wageEnrichmentService.getSyncHistory(5);
        return NextResponse.json({ 
          syncHistory: history,
          lastSync: history[0] || null,
        });
      }

      case 'wages': {
        const noc = searchParams.get('noc');
        const geo = searchParams.get('geo') || '01';
        const year = searchParams.get('year');

        if (!noc) {
          return NextResponse.json({ error: 'NOC code required' }, { status: 400 });
        }

        const wages = await statCanClient.getWageData({
          nocCode: noc,
          geography: geo,
          year: year ? parseInt(year) : undefined,
        });

        return NextResponse.json({ wages, count: wages.length });
      }

      case 'union-density': {
        const geo = searchParams.get('geo') || '01';
        const naics = searchParams.get('naics');
        const year = searchParams.get('year');

        const density = await statCanClient.getUnionDensity({
          geography: geo,
          naicsCode: naics || undefined,
          year: year ? parseInt(year) : undefined,
        });

        return NextResponse.json({ unionDensity: density, count: density.length });
      }

      case 'cola': {
        const geo = searchParams.get('geo') || '35';
        const startYear = searchParams.get('startYear') || '2018';
        const endYear = searchParams.get('endYear') || new Date().getFullYear().toString();

        const cola = await statCanClient.getCOLAData({
          geography: geo,
          startYear: parseInt(startYear),
          endYear: parseInt(endYear),
        });

        return NextResponse.json({ cola, count: cola.length });
      }

      case 'benchmarks': {
        // Get benchmarks from database
        const nocCodes = searchParams.get('nocCodes')?.split(',') || [];
        const geo = searchParams.get('geo') || '35';

        if (nocCodes.length === 0) {
          return NextResponse.json({ error: 'nocCodes required' }, { status: 400 });
        }

        const benchmarks = await db.select()
          .from(wageBenchmarks)
          .where(
            and(
              eq(wageBenchmarks.geographyCode, geo),
            )
          )
          .orderBy(desc(wageBenchmarks.refDate))
          .limit(100);

        return NextResponse.json({ benchmarks, count: benchmarks.length });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/external-data - Trigger sync operations
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'sync-wages': {
        if (!params?.nocCodes || !Array.isArray(params.nocCodes)) {
          return NextResponse.json({ error: 'nocCodes array required' }, { status: 400 });
        }

        const result = await wageEnrichmentService.syncWageData({
          nocCodes: params.nocCodes,
          geography: params.geography,
          year: params.year,
        });

        return NextResponse.json(result);
      }

      case 'sync-union-density': {
        const result = await wageEnrichmentService.syncUnionDensity({
          geography: params?.geography,
          naicsCode: params?.naicsCode,
          year: params?.year,
        });

        return NextResponse.json(result);
      }

      case 'sync-cola': {
        if (!params?.geography) {
          return NextResponse.json({ error: 'geography required' }, { status: 400 });
        }

        const result = await wageEnrichmentService.syncCOLAData({
          geography: params.geography,
          startYear: params.startYear,
          endYear: params.endYear,
        });

        return NextResponse.json(result);
      }

      case 'sync-contributions': {
        const result = await wageEnrichmentService.syncContributionRates(params?.year);
        return NextResponse.json(result);
      }

      case 'full-sync': {
        // Run all sync operations
        const results = {
          wages: await wageEnrichmentService.syncWageData({
            nocCodes: ['6513', '6721', '7611', '7622'], // Common union occupations
            geography: '35', // Ontario default
          }),
          unionDensity: await wageEnrichmentService.syncUnionDensity({
            geography: '35',
          }),
          cola: await wageEnrichmentService.syncCOLAData({
            geography: '35',
          }),
          contributions: await wageEnrichmentService.syncContributionRates(),
        };

        return NextResponse.json({
          success: true,
          results,
          completedAt: new Date().toISOString(),
        });
      }

      case 'get-benchmarks': {
        if (!params?.nocCodes || !params?.geography) {
          return NextResponse.json({ error: 'nocCodes and geography required' }, { status: 400 });
        }

        const benchmarks = await wageEnrichmentService.getBenchmarksForCBA({
          nocCodes: params.nocCodes,
          geography: params.geography,
          year: params.year,
        });

        return NextResponse.json(benchmarks);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

