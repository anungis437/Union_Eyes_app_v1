import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Metrics API
 * Q1 2025 - Advanced Analytics
 * 
 * Endpoint for calculating and retrieving analytics metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateMetrics, getAnalyticsMetrics } from '@/actions/analytics-actions';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    try {
      const body = await request.json();
      const { metricType, metricName, periodType, periodStart, periodEnd } = body;
      
      // Validate input
      if (!metricType || !metricName || !periodType || !periodStart || !periodEnd) {
        return NextResponse.json(
          { error: 'Missing required fields: metricType, metricName, periodType, periodStart, periodEnd' },
          { status: 400 }
        );
      }
      
      if (!['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(periodType)) {
        return NextResponse.json(
          { error: 'Invalid periodType. Must be one of: daily, weekly, monthly, quarterly, yearly' },
          { status: 400 }
        );
      }
      
      // Calculate and store metric
      const result = await calculateMetrics({
        metricType,
        metricName,
        periodType,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd)
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        metric: result.metric
      });
    } catch (error) {
return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const metricType = searchParams.get('metricType');
      const periodType = searchParams.get('periodType');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const limit = parseInt(searchParams.get('limit') || '50');
      
      // Get metrics
      const result = await getAnalyticsMetrics({
        metricType: metricType || undefined,
        periodType: periodType || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        metrics: result.metrics
      });
    } catch (error) {
return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

