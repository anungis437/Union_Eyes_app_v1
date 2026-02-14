import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Trend Analysis API
 * Q1 2025 - Advanced Analytics
 * 
 * Endpoint for trend detection and analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectMetricTrends, getAnalyticsMetrics } from '@/actions/analytics-actions';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const analyticsTrendsSchema = z.object({
  metricType: z.string().min(1, 'metricType is required'),
  daysBack: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    try {
      const body = await request.json();
    // Validate request body
    const validation = analyticsTrendsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { metricType, daysBack } = validation.data;
      const { metricType, daysBack } = body;
      
      // Validate input
      if (!metricType) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required field: metricType'
    );
      }
      
      // Detect trends
      const result = await detectMetricTrends({
        metricType,
        daysBack: daysBack || 30
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        trend: result.trend,
        metadata: {
          metricType,
          daysBack: daysBack || 30,
          analyzedAt: new Date().toISOString()
        }
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {    const { userId, organizationId } = context;

    try {
      const searchParams = request.nextUrl.searchParams;
      const metricType = searchParams.get('metricType');
      const analysisType = searchParams.get('analysisType');
      const limit = parseInt(searchParams.get('limit') || '20');
      
      // Get recent trend analyses from database
      const { db } = await import('@/db');
      const { trendAnalyses } = await import('@/db/schema');
      const { desc, and } = await import('drizzle-orm');
      
      const conditions = [];
      
      if (metricType) {
        conditions.push(eq(trendAnalyses.dataSource, metricType));
      }
      
      if (analysisType) {
        conditions.push(eq(trendAnalyses.analysisType, analysisType));
      }
      
      const trends = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.trendAnalyses.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          orderBy: [desc(trendAnalyses.createdAt)],
          limit
        });
      });
      
      return NextResponse.json({
        success: true,
        trends
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

