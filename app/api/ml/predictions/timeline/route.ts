import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { z } from 'zod';
import { db } from '@/db';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { claims } from '@/db/schema';
import { eq } from 'drizzle-orm';

const TimelineRequestSchema = z.object({
  claimId: z.string().uuid(),
});

/**
 * POST /api/ml/predictions/timeline
 * Predict claim resolution timeline
 * 
 * Request body:
 * {
 *   claimId: string
 * }
 * 
 * Response:
 * {
 *   prediction: {
 *     estimatedCompletionDate: string,  // ISO date
 *     confidence: number,                // 0-1
 *     milestones: Array<{
 *       name: string,
 *       estimatedDate: string,
 *       probability: number
 *     }>,
 *     riskFactors: string[]
 *   }
 * }
 */
export const POST = withRoleAuth(20, async (request: NextRequest, context) => {
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
    const body = await request.json();
    const { claimId } = TimelineRequestSchema.parse(body);

    const organizationScopeId = organizationId || userId;
    const tenantId = organizationScopeId;

    // Verify claim exists and belongs to tenant
    const claim = await withRLSContext(
      { organizationId: tenantId },
      async (db) => db.query.claims.findFirst({
        where: eq(claims.claimId, claimId)
      })
    );
    
    if (!claim || claim.organizationId !== tenantId) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Call AI service for timeline prediction
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3005';
    
    const response = await fetch(`${aiServiceUrl}/api/predictions/timeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_TOKEN}`,
        'X-Organization-ID': tenantId,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        claimId,
        tenantId
      })
    });

    if (!response.ok) {
      throw new Error('AI service timeline prediction failed');
    }

    const prediction = await response.json();

    // Log audit event
    await logApiAuditEvent({
      action: 'ml_prediction',
      resourceType: 'AI_ML',
      organizationId,
      userId,
      metadata: {
        predictionType: 'timeline',
        claimId,
        confidence: prediction.confidence,
      },
    });

    return NextResponse.json({ prediction });
    
  } catch (error) {
if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to predict timeline' },
      { status: 500 }
    );
  }
});

