/**
 * Feature Flags Admin API
 * 
 * GET /api/admin/feature-flags - List all flags
 * PATCH /api/admin/feature-flags - Toggle a flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllFeatureFlags, toggleFeatureFlag } from '@/lib/feature-flags';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get all feature flags
 */
export async function GET() {
  try {
    // Check if user is admin
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user has admin role
    // For now, allow all authenticated users

    const flags = await getAllFeatureFlags();
    return NextResponse.json(flags);
  } catch (error) {
    console.error('Failed to fetch feature flags', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

/**
 * Toggle a feature flag
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check if user is admin
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user has admin role

    const body = await request.json();
    const { name, enabled } = body;

    if (!name || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    await toggleFeatureFlag(name, enabled);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to toggle feature flag', error);
    return NextResponse.json(
      { error: 'Failed to toggle feature flag' },
      { status: 500 }
    );
  }
}
