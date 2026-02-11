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
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    try {
      const body = await request.json();
      const { metricType, daysBack } = body;
      
      // Validate input
      if (!metricType) {
        return NextResponse.json(
          { error: 'Missing required field: metricType' },
          { status: 400 }
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
      console.error('Error in trends API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
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
      const { trendAnalyses } = await import('@/db/migrations/schema');
      const { eq, desc, and } = await import('drizzle-orm');
      
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
      console.error('Error fetching trends:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

