/**
 * CLC Analytics - Payment Patterns API
 * 
 * GET /api/admin/clc/analytics/patterns
 * 
 * Returns payment pattern analysis including timeliness and compliance trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { analyzePaymentPatterns } from '@/services/clc/compliance-reports';
import { db } from '@/database';
import { perCapitaRemittances } from '@/db/schema/clc-per-capita-schema';
import { sql } from 'drizzle-orm';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
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

        // Fetch remittances from perCapitaRemittances table
        const remittances = await db
          .select()
          .from(perCapitaRemittances)
          .where(sql`${perCapitaRemittances.remittanceYear} = ${year}`)
          .orderBy(perCapitaRemittances.remittanceMonth);
        
        const patterns = await analyzePaymentPatterns(remittances, year);

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/analytics/patterns',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { dataType: 'ANALYTICS', year, remittanceCount: remittances.length },
        });

        return NextResponse.json(patterns, {
          headers: {
            'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
          }
        });

      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/analytics/patterns',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error('Analytics patterns error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch payment pattern data' },
          { status: 500 }
        );
      }
      })(request);
};

