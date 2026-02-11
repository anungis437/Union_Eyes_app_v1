/**
 * CLC Analytics - Anomaly Detection API
 * 
 * GET /api/admin/clc/analytics/anomalies
 * 
 * Returns detected anomalies with severity levels and recommended actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { detectAnomalies } from '@/services/clc/compliance-reports';
import { db } from '@/database';
import { perCapitaRemittances } from '@/db/schema/clc-per-capita-schema';
import { sql } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId } = context;

  try {
        // Rate limiting: 50 CLC operations per hour per user
        const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.CLC_OPERATIONS);
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { 
              error: 'Rate limit exceeded. Too many CLC requests.',
              resetIn: rateLimitResult.resetIn 
            },
            { 
              status: 429,
              headers: createRateLimitHeaders(rateLimitResult),
            }
          );
        }

        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const minSeverity = searchParams.get('minSeverity') || 'medium';

        // Fetch remittances from perCapitaRemittances table
        const remittances = await db
          .select()
          .from(perCapitaRemittances)
          .where(sql`${perCapitaRemittances.remittanceYear} = ${year}`)
          .orderBy(perCapitaRemittances.remittanceMonth);
        
        const anomalies = await detectAnomalies(remittances, year);

        // Filter by minimum severity if specified
        const filteredAnomalies = minSeverity !== 'low'
          ? anomalies.filter(a => {
              const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
              return severityOrder[a.severity] >= severityOrder[minSeverity as keyof typeof severityOrder];
            })
          : anomalies;

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/analytics/anomalies',
          method: 'GET',
          eventType: 'success',
          severity: 'medium',
          details: { dataType: 'ANALYTICS', year, anomalyCount: filteredAnomalies.length, minSeverity },
        });

        return NextResponse.json(filteredAnomalies, {
          headers: {
            'Cache-Control': 'public, max-age=900' // Cache for 15 minutes (anomalies change frequently)
          }
        });

      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/analytics/anomalies',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
return NextResponse.json(
          { error: 'Failed to fetch anomaly data' },
          { status: 500 }
        );
      }
      })(request);
};


