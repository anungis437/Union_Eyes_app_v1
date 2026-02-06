import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { claims } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = orgId || userId;
    const { claimId } = await request.json();
    
    if (!claimId) {
      return NextResponse.json({ error: 'claimId is required' }, { status: 400 });
    }

    // Verify claim exists and belongs to tenant
    const claim = await db.query.claims.findFirst({
      where: eq(claims.claimId, claimId)
    });
    
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

    return NextResponse.json({ prediction });
    
  } catch (error) {
    console.error('Timeline prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to predict timeline' },
      { status: 500 }
    );
  }
}
