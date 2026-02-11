import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { z } from 'zod';
import { db } from '@/db';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { claims } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { mlPredictions } from '@/db/schema/ml-predictions-schema';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * POST /api/ml/predictions/claim-outcome
 * Predict claim outcome using ML model
 * 
 * Request body:
 * {
 *   claimId?: string,           // Existing claim ID
 *   claimData?: {               // Or new claim data
 *     type: string,
 *     description: string,
 *     claimAmount?: number
 *   }
 * }
 * 
 * Response:
 * {
 *   prediction: {
 *     outcome: 'favorable' | 'unfavorable' | 'settlement' | 'withdrawal',
 *     probability: number,       // 0-1
 *     confidence: number,        // 0-1
 *     factors: Array<{
 *       factor: string,
 *       impact: 'positive' | 'negative' | 'neutral',
 *       weight: number
 *     }>,
 *     reasoning: string,
 *     suggestedStrategy: string,
 *     estimatedDuration: number, // days
 *     settlementRange?: { min: number, max: number, currency: string }
 *   }
 * }
 */

const mlPredictionsClaim-outcomeSchema = z.object({
  claimId: z.string().uuid('Invalid claimId'),
  claimData: z.unknown().optional(),
});

export const POST = withEnhancedRoleAuth(20, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  // CRITICAL: Rate limit ML predictions (expensive)
  const rateLimitResult = await checkRateLimit(
    `ml-predictions:${userId}`,
    RATE_LIMITS.ML_PREDICTIONS
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for ML operations. Please try again later.' },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
    const tenantId = organizationId || userId;
    const body = await request.json();
    // Validate request body
    const validation = mlPredictionsClaim-outcomeSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { claimId, claimData } = validation.data;
    
    let claimData: any;
    
    // Get claim data either from ID or request body
    if (body.claimId) {
      const claim = await withRLSContext(
        { organizationId: tenantId },
        async (db) => db.query.claims.findFirst({
          where: eq(claims.claimId, body.claimId)
        })
      );
      
      if (!claim || claim.organizationId !== tenantId) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Claim not found'
    );
      }
      
      claimData = {
        type: claim.claimType,
        description: claim.description,
        claimAmount: claim.claimAmount
      };
    } else if (body.claimData) {
      claimData = body.claimData;
    } else {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Either claimId or claimData is required'
    );
    }

    // Call AI service for prediction
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3005';
    
    const response = await fetch(`${aiServiceUrl}/api/predictions/claim-outcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_TOKEN}`,
        'X-Organization-ID': tenantId,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        claimData,
        tenantId
      })
    });

    if (!response.ok) {
      throw new Error('AI service prediction failed');
    }

    const prediction = await response.json();

    // Store prediction for learning
    if (body.claimId) {
      const predictedValue = typeof prediction?.probability === 'number'
        ? prediction.probability
        : typeof prediction?.confidence === 'number'
          ? prediction.confidence
          : 0;

      await withRLSContext({ organizationId: tenantId }, async (db) => {
        await db.insert(mlPredictions).values({
          organizationId: tenantId,
          predictionType: 'claim_outcome',
          predictionDate: new Date(),
          predictedValue: predictedValue.toString(),
          lowerBound: prediction?.settlementRange?.min?.toString(),
          upperBound: prediction?.settlementRange?.max?.toString(),
          confidence: typeof prediction?.confidence === 'number' ? prediction.confidence.toString() : undefined,
          horizon: typeof prediction?.estimatedDuration === 'number' ? prediction.estimatedDuration : undefined,
          granularity: 'daily',
        });
      });
    }

    return NextResponse.json({ prediction });
    
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to predict claim outcome',
      error
    );
  }
});

