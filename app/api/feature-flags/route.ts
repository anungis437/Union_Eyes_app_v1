/**
 * Feature Flags API Route
 * 
 * Returns enabled features for the current user.
 */

import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { evaluateFeatures, LRO_FEATURES } from '@/lib/services/feature-flags';

export async function GET(request: Request) {
  try {
    const { userId, orgId } = await getAuth(request as any);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Evaluate all LRO features for this user
    const featureNames = Object.values(LRO_FEATURES);
    
    const flags = await evaluateFeatures(featureNames, {
      userId,
      organizationId: orgId || undefined,
    });
    
    return NextResponse.json({
      flags,
      userId,
      organizationId: orgId || null,
    });
  } catch (error) {
    console.error('[FeatureFlags API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to evaluate feature flags',
        flags: {}, // Fail safe: all features disabled
      },
      { status: 500 }
    );
  }
}

