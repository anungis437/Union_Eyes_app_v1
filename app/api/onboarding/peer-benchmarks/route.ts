/**
 * Peer Benchmarking API
 * 
 * GET /api/onboarding/peer-benchmarks?organizationId=xxx
 * 
 * Compare organization metrics to peers:
 * - Member count
 * - Per-capita rates
 * - Industry benchmarks
 * - National averages
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/role-middleware';
import { getPeerBenchmarks } from '@/lib/utils/smart-onboarding';
import { logger } from '@/lib/logger';
import { eventBus, AppEvents } from '@/lib/events';

export const GET = withRoleAuth('member', async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const reqOrgId = searchParams.get('organizationId');

    if (!reqOrgId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const benchmarks = await getPeerBenchmarks(reqOrgId);

    logger.info('Peer benchmarks generated', { 
      userId,
      organizationId: reqOrgId,
      benchmarkCount: benchmarks.length,
    });

    // Emit audit event
    eventBus.emit(AppEvents.AUDIT_LOG, {
      userId,
      action: 'peer_benchmarks',
      resource: 'onboarding',
      details: { organizationId: reqOrgId, benchmarkCount: benchmarks.length },
    });

    return NextResponse.json({
      success: true,
      benchmarks,
      metadata: {
        totalBenchmarks: benchmarks.length,
        categories: [...new Set(benchmarks.map(b => b.category))],
      },
    });

  } catch (error) {
    logger.error('Peer benchmarking failed', { error });
    return NextResponse.json(
      { 
        error: 'Failed to get peer benchmarks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
