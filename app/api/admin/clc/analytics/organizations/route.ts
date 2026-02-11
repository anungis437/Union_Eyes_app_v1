/**
 * CLC Analytics - Organization Performance API
 * 
 * GET /api/admin/clc/analytics/organizations
 * 
 * Returns organization performance analysis and benchmarking data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { analyzeOrganizationPerformance } from '@/services/clc/compliance-reports';
import { db } from '@/database';
import { perCapitaRemittances } from '@/db/schema/clc-per-capita-schema';
import { sql } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

  try {
        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const minOrganizations = parseInt(searchParams.get('minOrgs') || '5');

        // Fetch remittances from perCapitaRemittances table
        const remittances = await db
          .select()
          .from(perCapitaRemittances)
          .where(sql`${perCapitaRemittances.remittanceYear} = ${year}`)
          .orderBy(perCapitaRemittances.fromOrganizationId, perCapitaRemittances.remittanceMonth);
        
        const performance = await analyzeOrganizationPerformance(remittances, year);

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/analytics/organizations',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { dataType: 'ANALYTICS', year, remittanceCount: remittances.length },
        });

        return NextResponse.json(performance, {
          headers: {
            'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
          }
        });

      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/analytics/organizations',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error('Analytics organizations error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch organization performance data' },
          { status: 500 }
        );
      }
      })(request);
};


