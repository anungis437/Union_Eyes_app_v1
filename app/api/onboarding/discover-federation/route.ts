/**
 * Federation Discovery API
 * 
 * POST /api/onboarding/discover-federation
 * 
 * Auto-detect potential parent federations based on:
 * - Province/jurisdiction
 * - Industry sector
 * - Organization size
 * - CLC affiliation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/role-middleware';
import { autoDetectParentFederation } from '@/lib/utils/smart-onboarding';
import { logger } from '@/lib/logger';
import { eventBus, AppEvents } from '@/lib/events';

export const POST = withRoleAuth('officer', async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { province, sector, estimatedMemberCount } = await request.json();

    if (!province) {
      return NextResponse.json(
        { error: 'province is required' },
        { status: 400 }
      );
    }

    const suggestions = await autoDetectParentFederation(
      province,
      sector || null,
      estimatedMemberCount
    );

    logger.info('Federation discovery completed', { 
      userId,
      province,
      sector,
      suggestionCount: suggestions.length,
    });

    // Emit audit event
    eventBus.emit(AppEvents.AUDIT_LOG, {
      userId,
      action: 'federation_discovery',
      resource: 'onboarding',
      details: { province, sector, suggestionCount: suggestions.length },
    });

    return NextResponse.json({
      success: true,
      suggestions,
      metadata: {
        province,
        sector,
        totalSuggestions: suggestions.length,
      },
    });

  } catch (error) {
    logger.error('Federation discovery failed', { error });
    return NextResponse.json(
      { 
        error: 'Failed to discover federations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
