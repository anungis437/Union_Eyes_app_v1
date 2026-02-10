/**
 * Clause Suggestions API
 * 
 * POST /api/onboarding/suggest-clauses
 * 
 * Suggest relevant clauses based on:
 * - Parent organization hierarchy
 * - Sector/province similarity
 * - Sharing level availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/role-middleware';
import { suggestRelevantClauses } from '@/lib/utils/smart-onboarding';
import { logger } from '@/lib/logger';
import { eventBus, AppEvents } from '@/lib/events';

export const POST = withRoleAuth('officer', async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { organizationId: reqOrgId } = await request.json();

    if (!reqOrgId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const suggestions = await suggestRelevantClauses(reqOrgId);

    logger.info('Clause suggestions generated', { 
      userId,
      organizationId: reqOrgId,
      suggestionCount: suggestions.length,
    });

    // Emit audit event
    eventBus.emit(AppEvents.AUDIT_LOG, {
      userId,
      action: 'clause_suggestions',
      resource: 'onboarding',
      details: { organizationId: reqOrgId, suggestionCount: suggestions.length },
    });

    return NextResponse.json({
      success: true,
      suggestions,
      metadata: {
        totalSuggestions: suggestions.length,
        topRelevanceScore: suggestions[0]?.relevanceScore || 0,
      },
    });

  } catch (error) {
    logger.error('Clause suggestions failed', { error });
    return NextResponse.json(
      { 
        error: 'Failed to suggest clauses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
