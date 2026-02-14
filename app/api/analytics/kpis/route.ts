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

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const analyticsKpisSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  metricType: z.unknown().optional(),
  dataSource: z.unknown().optional(),
  calculation: z.unknown().optional(),
  visualizationType: z.boolean().optional(),
  targetValue: z.unknown().optional(),
  warningThreshold: z.unknown().optional(),
  criticalThreshold: z.unknown().optional(),
  alertEnabled: z.boolean().optional(),
  alertRecipients: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(50, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit KPI creation
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ANALYTICS_QUERY,
      `analytics-kpis-create:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { resetIn: rateLimitResult.resetIn }
    );
    }

    try {
      const body = await request.json();
    // Validate request body
    const validation = analyticsKpisSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { name, description, metricType, dataSource, calculation, visualizationType, targetValue, warningThreshold, criticalThreshold, alertEnabled, alertRecipients } = validation.data;
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // name,
    // description,
    // metricType,
    // dataSource,
    // calculation,
    // visualizationType,
    // targetValue,
    // warningThreshold,
    // criticalThreshold,
    // alertEnabled,
    // alertRecipients
    // } = body;
      
      // Validate input
      if (!name || !metricType || !dataSource || !calculation || !visualizationType) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: name, metricType, dataSource, calculation, visualizationType'
    );
      }
      
      if (!['line', 'bar', 'pie', 'gauge', 'number'].includes(visualizationType)) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid visualizationType. Must be one of: line, bar, pie, gauge, number'
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
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
      const { kpiConfigurations } = await import('@/db/schema');
      const { desc } = await import('drizzle-orm');
      
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};
