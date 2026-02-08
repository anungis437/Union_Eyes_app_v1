/**
 * CLC Analytics - Multi-Year Trends API
 * 
 * GET /api/admin/clc/analytics/trends
 * 
 * Returns trend analysis data for specified time period
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { analyzeMultiYearTrends } from '@/services/clc/compliance-reports';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

  try {
        const searchParams = request.nextUrl.searchParams;
        const years = parseInt(searchParams.get('years') || '3');
        
        if (![3, 5, 10].includes(years)) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/admin/clc/analytics/trends',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Invalid years parameter', years },
          });
          return NextResponse.json(
            { error: 'Invalid years parameter. Must be 3, 5, or 10' },
            { status: 400 }
          );
        }

        const trends = await analyzeMultiYearTrends({ years: years as 3 | 5 | 10 });

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/analytics/trends',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { dataType: 'ANALYTICS', years },
        });

        return NextResponse.json(trends, {
          headers: {
            'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
          }
        });

      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/clc/analytics/trends',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error('Analytics trends error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch trend data' },
          { status: 500 }
        );
      }
      })(request);
};

