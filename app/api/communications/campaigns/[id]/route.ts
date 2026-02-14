/**
 * Newsletter Campaign Detail API
 * 
 * Endpoints:
 * - GET /api/communications/campaigns/[id] - Get campaign by ID
 * - PUT /api/communications/campaigns/[id] - Update campaign
 * - DELETE /api/communications/campaigns/[id] - Delete campaign
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterCampaigns } from '@/db/schema';
import { and } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  preheader: z.string().optional(),
  htmlContent: z.string().min(1).optional(),
  distributionListIds: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withEnhancedRoleAuth(20, async (request, context) => {
    try {
      const { userId, organizationId } = context;

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Organization context required'
    );
      }

      // Rate limit check
      const rateLimitResult = await checkRateLimit(
        RATE_LIMITS.CAMPAIGN_OPERATIONS,
        `campaign-read:${userId}`
      );
      if (!rateLimitResult.allowed) {
        return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
      }

      const [campaign] = await db
        .select()
        .from(newsletterCampaigns)
        .where(
          and(
            eq(newsletterCampaigns.id, params.id),
            eq(newsletterCampaigns.organizationId, organizationId)
          )
        );

      if (!campaign) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Campaign not found'
    );
      }

      // Audit log
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'VIEW_CAMPAIGN',
        dataType: 'CAMPAIGNS',
        recordId: params.id,
        success: true,
      });

      return NextResponse.json({ campaign });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch campaign',
      error
    );
    }
  })(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withEnhancedRoleAuth(40, async (request, context) => {
    try {
      const { userId, organizationId } = context;

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Organization context required'
    );
      }

      // Rate limit check
      const rateLimitResult = await checkRateLimit(
        RATE_LIMITS.CAMPAIGN_OPERATIONS,
        `campaign-ops:${userId}`
      );
      if (!rateLimitResult.allowed) {
        return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
      }

    const body = await request.json();
    const validation = updateCampaignSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    const validatedData = validation.data;

      // Check if campaign can be edited
      const [existing] = await db
        .select()
        .from(newsletterCampaigns)
        .where(
          and(
            eq(newsletterCampaigns.id, params.id),
            eq(newsletterCampaigns.organizationId, organizationId)
          )
        );

    if (!existing) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Campaign not found'
    );
    }

    if (['sending', 'sent'].includes(existing.status || '')) {
      return NextResponse.json(
        { error: 'Cannot modify campaign that is sending or already sent' },
        { status: 403 }
      );
    }

    const updateData = { ...validatedData };
    if (validatedData.scheduledAt) {
      updateData.scheduledAt = new Date(validatedData.scheduledAt);
    }

      const [campaign] = await db
        .update(newsletterCampaigns)
        .set(updateData)
        .where(eq(newsletterCampaigns.id, params.id))
        .returning();

      // Audit log
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'UPDATE_CAMPAIGN',
        dataType: 'CAMPAIGNS',
        recordId: params.id,
        success: true,
        metadata: { updates: Object.keys(validatedData) },
      });

      return NextResponse.json({ campaign });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update campaign',
      error
    );
    }
  })(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withEnhancedRoleAuth(60, async (request, context) => {
    try {
      const { userId, organizationId } = context;

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Organization context required'
    );
      }

      // Rate limit check
      const rateLimitResult = await checkRateLimit(
        RATE_LIMITS.CAMPAIGN_OPERATIONS,
        `campaign-ops:${userId}`
      );
      if (!rateLimitResult.allowed) {
        return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
      }

      // Check if campaign can be deleted
      const [existing] = await db
        .select()
        .from(newsletterCampaigns)
        .where(
          and(
            eq(newsletterCampaigns.id, params.id),
            eq(newsletterCampaigns.organizationId, organizationId)
          )
        );

    if (!existing) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Campaign not found'
    );
    }

    if (existing.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete campaign while sending' },
        { status: 403 }
      );
    }

      await db
        .delete(newsletterCampaigns)
        .where(eq(newsletterCampaigns.id, params.id));

      // Audit log
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'DELETE_CAMPAIGN',
        dataType: 'CAMPAIGNS',
        recordId: params.id,
        success: true,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete campaign',
      error
    );
    }
  })(request);
}
