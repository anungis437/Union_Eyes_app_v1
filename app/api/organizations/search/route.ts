import { requireUser } from '@/lib/api-auth-guard';
/**
 * API Route: Search Organizations
 * Search organizations by name, type, or other criteria
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, logApiAuditEvent } from '@/lib/middleware/api-security';

import { searchOrganizations } from '@/db/queries/organization-queries';
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations/search
 * Search organizations with filters
 * Query params:
 * - q: Search query (name, slug)
 * - type: Organization type filter (federation, union, local, chapter)
 * - sector: Sector filter
 * - jurisdiction: Jurisdiction filter
 * - isActive: Active status filter
 */
export async function GET(request: NextRequest) {
  let userId: string | null = null;
  let query = '';
  try {
    const authResult = await requireUser();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    query = searchParams.get('q') || '';
    const type = searchParams.get('type');
    const sector = searchParams.get('sector');
    const jurisdiction = searchParams.get('jurisdiction');
    const isActiveParam = searchParams.get('isActive');
    
    const filters: {
      type?: 'federation' | 'union' | 'local' | 'chapter';
      sector?: string;
      jurisdiction?: string;
      isActive?: boolean;
    } = {};

    if (type) {
      filters.type = type as any;
    }
    if (sector) {
      filters.sector = sector;
    }
    if (jurisdiction) {
      filters.jurisdiction = jurisdiction;
    }
    if (isActiveParam !== null) {
      filters.isActive = isActiveParam === 'true';
    }

    const limit = parseInt(searchParams.get('limit') || '20');
    let results = await searchOrganizations(query, limit);

    if (filters.type) {
      results = results.filter((org) => org.organizationType === filters.type);
    }
    if (filters.sector) {
      results = results.filter((org) => Array.isArray(org.sectors) && org.sectors.includes(filters.sector!));
    }
    if (filters.jurisdiction) {
      results = results.filter((org) => org.provinceTerritory === filters.jurisdiction);
    }
    if (filters.isActive !== undefined) {
      results = results.filter((org) => (org.status === 'active') === filters.isActive);
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      query,
      filters,
    });
  } catch (error) {
    logger.error('Error searching organizations', error as Error, {
      query,      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to search organizations' },
      { status: 500 }
    );
  }
}
