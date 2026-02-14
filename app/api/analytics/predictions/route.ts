import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Analytics Predictions API
 * Q1 2025 - Advanced Analytics
 * 
 * Endpoint for generating ML predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePredictions } from '@/actions/analytics-actions';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const analyticsPredictionsSchema = z.object({
  predictionType: z.string().min(1, 'predictionType is required'),
  periodsAhead: z.unknown().optional(),
  modelName: z.string().min(1, 'modelName is required'),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth('member', async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit advanced analytics (predictions are AI-driven)
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ADVANCED_ANALYTICS,
      `analytics-predictions:${userId}`
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
    const validation = analyticsPredictionsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { predictionType, periodsAhead, modelName } = validation.data;
      const { predictionType, periodsAhead, modelName } = body;
      
      // Validate input
      if (!predictionType || !periodsAhead) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: predictionType, periodsAhead'
    );
      }
      
      if (!['claims_volume', 'resource_needs', 'budget_forecast'].includes(predictionType)) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid predictionType. Must be one of: claims_volume, resource_needs, budget_forecast'
    );
      }
      
      if (periodsAhead < 1 || periodsAhead > 90) {
        return NextResponse.json(
          { error: 'periodsAhead must be between 1 and 90' },
          { status: 400 }
        );
      }
      
      // Generate predictions
      const result = await generatePredictions({
        predictionType,
        periodsAhead,
        modelName: modelName || 'ensemble'
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
        action: 'predictions_generate',
        resourceType: 'analytics',
        resourceId: 'predictions',
        metadata: { targetMetric, horizonDays },
        dataType: 'ANALYTICS',
      });
      
      return NextResponse.json({
        success: true,
        predictions: result.predictions,
        metadata: {
          predictionType,
          periodsAhead,
          modelUsed: modelName || 'ensemble',
          generatedAt: new Date().toISOString()
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
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const searchParams = request.nextUrl.searchParams;
      const predictionType = searchParams.get('predictionType');
      const limit = parseInt(searchParams.get('limit') || '30');
      
      if (!predictionType) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required parameter: predictionType'
    );
      }
      
      // Get recent predictions from database
      const { db } = await import('@/db');
      const { mlPredictions } = await import('@/db/schema');
      const { desc } = await import('drizzle-orm');
      
      // Get user's org ID (simplified for now)
      const predictions = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.mlPredictions.findMany({
          where: eq(mlPredictions.predictionType, predictionType),
          orderBy: [desc(mlPredictions.createdAt)],
          limit
        });
      });
      
      return NextResponse.json({
        success: true,
        predictions
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

