import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/enterprise-role-middleware';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { z } from 'zod';
import { db } from '@/db';
import { claims } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
  try {
    const { userId, organizationId } = await requireUser();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationScopeId = organizationId || userId;
    const tenantId = organizationScopeId;
    const body = await request.json();
    
    let claimData: any;
    
    // Get claim data either from ID or request body
    if (body.claimId) {
      const claim = await db.query.claims.findFirst({
        where: eq(claims.claimId, body.claimId)
      });
      
      if (!claim || claim.organizationId !== tenantId) {
        return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
      }
      
      claimData = {
        type: claim.claimType,
        description: claim.description,
        claimAmount: claim.claimAmount
      };
    } else if (body.claimData) {
      claimData = body.claimData;
    } else {
      return NextResponse.json(
        { error: 'Either claimId or claimData is required' }, 
        { status: 400 }
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
      // TODO: Store prediction in ai_predictions table for future model training
    }

    return NextResponse.json({ prediction });
    
  } catch (error) {
    console.error('Claim outcome prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to predict claim outcome' },
      { status: 500 }
    );
  }
}
