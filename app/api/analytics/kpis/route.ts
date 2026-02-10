import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * KPI Configurations API
 * Q1 2025 - Advanced Analytics
 * 
 * Endpoint for managing custom KPI configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createKPI } from '@/actions/analytics-actions';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(50, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit KPI creation
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ANALYTICS_QUERY,
      `analytics-kpis-create:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }

    try {
      const body = await request.json();
      const {
        name,
        description,
        metricType,
        dataSource,
        calculation,
        visualizationType,
        targetValue,
        warningThreshold,
        criticalThreshold,
        alertEnabled,
        alertRecipients
      } = body;
      
      // Validate input
      if (!name || !metricType || !dataSource || !calculation || !visualizationType) {
        return NextResponse.json(
          { error: 'Missing required fields: name, metricType, dataSource, calculation, visualizationType' },
          { status: 400 }
        );
      }
      
      if (!['line', 'bar', 'pie', 'gauge', 'number'].includes(visualizationType)) {
        return NextResponse.json(
          { error: 'Invalid visualizationType. Must be one of: line, bar, pie, gauge, number' },
          { status: 400 }
        );
      }
      
      // Create KPI
      const result = await createKPI({
        name,
        description,
        metricType,
        dataSource,
        calculation,
        visualizationType,
        targetValue,
        warningThreshold,
        criticalThreshold,
        alertEnabled,
        alertRecipients
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      // Log audit event
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'kpi_calculate',
        resourceType: 'analytics',
        resourceId: 'kpis',
        metadata: { kpiType, kpiName, periodType },
        dataType: 'ANALYTICS',
      });
      
      return NextResponse.json({
        success: true,
        kpi: result.kpi
      });
    } catch (error) {
      console.error('Error in KPI API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const searchParams = request.nextUrl.searchParams;
      const isActive = searchParams.get('isActive');
      const limit = parseInt(searchParams.get('limit') || '50');
      
      // Get KPI configurations from database
      const { db } = await import('@/db');
      const { kpiConfigurations } = await import('@/db/migrations/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      const conditions = [];
      
      if (isActive !== null) {
        conditions.push(eq(kpiConfigurations.isActive, isActive === 'true'));
      }
      
      const kpis = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.kpiConfigurations.findMany({
          where: conditions.length > 0 ? conditions[0] : undefined,
          orderBy: [desc(kpiConfigurations.createdAt)],
          limit
        });
      });
      
      return NextResponse.json({
        success: true,
        kpis
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};
