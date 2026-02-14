/**
 * Public Read-Only Reporting API
 * 
 * External systems can query reports and analytics (with API token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiAccessTokens } from '@/db/schema/integration-schema';
import { organizationMembers } from '@/db/schema/organization-members-schema';
import { and } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Validate API access token
 */
async function validateAPIToken(req: NextRequest): Promise<{ valid: boolean; organizationId?: string; scopes?: string[] }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }
  
  const token = authHeader.substring(7);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const [tokenRecord] = await db
    .select()
    .from(apiAccessTokens)
    .where(
      and(
        eq(apiAccessTokens.tokenHash, tokenHash),
        eq(apiAccessTokens.enabled, true)
      )
    );
  
  if (!tokenRecord) {
    return { valid: false };
  }
  
  // Check expiry
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    return { valid: false };
  }
  
  // Update usage stats
  await db
    .update(apiAccessTokens)
    .set({
      lastUsedAt: new Date(),
      usageCount: (tokenRecord.usageCount || 0) + 1,
    })
    .where(eq(apiAccessTokens.id, tokenRecord.id));
  
  return {
    valid: true,
    organizationId: tokenRecord.organizationId,
    scopes: tokenRecord.scopes || [],
  };
}

/**
 * GET /api/v1/reports/membership
 * Get membership statistics (read-only)
 */
export async function GET(req: NextRequest) {
  try {
    // Validate API token
    const auth = await validateAPIToken(req);
    if (!auth.valid || !auth.organizationId) {
      return NextResponse.json(
        { error: 'Invalid or missing API token' },
        { status: 401 }
      );
    }
    
    // Check scope
    if (!auth.scopes?.includes('read:reports') && !auth.scopes?.includes('read:*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', requiredScope: 'read:reports' },
        { status: 403 }
      );
    }
    
    // Get membership statistics
    const [stats] = await db
      .select({
        totalMembers: sql<number>`COUNT(*)::int`,
        activeMembers: sql<number>`COUNT(*) FILTER (WHERE ${organizationMembers.status} = 'active')::int`,
        inactiveMembers: sql<number>`COUNT(*) FILTER (WHERE ${organizationMembers.status} = 'inactive')::int`,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.orgId, auth.organizationId));
    
    return NextResponse.json({
      organizationId: auth.organizationId,
      period: new Date().toISOString().split('T')[0],
      membership: {
        total: stats.totalMembers,
        active: stats.activeMembers,
        inactive: stats.inactiveMembers,
      },
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching membership report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership report', details: error.message },
      { status: 500 }
    );
  }
}
