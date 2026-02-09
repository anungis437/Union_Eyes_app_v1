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
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withRoleAuth('member', async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit advanced analytics (predictions are AI-driven)
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ADVANCED_ANALYTICS,
      `analytics-predictions:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }

    try {
      const body = await request.json();
      const { predictionType, periodsAhead, modelName } = body;
      
      // Validate input
      if (!predictionType || !periodsAhead) {
        return NextResponse.json(
          { error: 'Missing required fields: predictionType, periodsAhead' },
          { status: 400 }
        );
      }
      
      if (!['claims_volume', 'resource_needs', 'budget_forecast'].includes(predictionType)) {
        return NextResponse.json(
          { error: 'Invalid predictionType. Must be one of: claims_volume, resource_needs, budget_forecast' },
          { status: 400 }
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
      console.error('Error in predictions API:', error);
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
      const predictionType = searchParams.get('predictionType');
      const limit = parseInt(searchParams.get('limit') || '30');
      
      if (!predictionType) {
        return NextResponse.json(
          { error: 'Missing required parameter: predictionType' },
          { status: 400 }
        );
      }
      
      // Get recent predictions from database
      const { db } = await import('@/db');
      const { mlPredictions } = await import('@/db/migrations/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      // Get user's org ID (simplified for now)
      const predictions = await db.query.mlPredictions.findMany({
        where: eq(mlPredictions.predictionType, predictionType),
        orderBy: [desc(mlPredictions.createdAt)],
        limit
      });
      
      return NextResponse.json({
        success: true,
        predictions
      });
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};
