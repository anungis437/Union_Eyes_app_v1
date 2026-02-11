import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Insights API
 * Q1 2025 - Advanced Analytics
 * 
 * Endpoint for AI-generated insights and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { insightRecommendations } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withRoleAuth(30, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit insights queries
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ANALYTICS_QUERY,
      `analytics-insights:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
    }

  try {
      const searchParams = request.nextUrl.searchParams;
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const category = searchParams.get('category');
      const limit = parseInt(searchParams.get('limit') || '20');
      
      const conditions = [];
      
      if (status) {
        conditions.push(eq(insightRecommendations.status, status));
      }
      
      if (priority) {
        conditions.push(eq(insightRecommendations.priority, priority));
      }
      
      if (category) {
        conditions.push(eq(insightRecommendations.category, category));
      }
      
      const insights = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.insightRecommendations.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          orderBy: [desc(insightRecommendations.createdAt)],
          limit
        });
      });
      
      // Log audit event
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'insights_fetch',
        resourceType: 'analytics',
        resourceId: 'insights',
        metadata: { status, priority, category, count: insights.length },
        dataType: 'ANALYTICS',
      });
      
      return NextResponse.json({
        success: true,
        insights
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


const analyticsInsightsSchema = z.object({
  insightId: z.string().uuid('Invalid insightId'),
  status: z.unknown().optional(),
  notes: z.string().optional(),
  dismissalReason: z.boolean().optional(),
  organizationId: z.string().uuid('Invalid organizationId'),
  insightType: z.unknown().optional(),
  category: z.unknown().optional(),
  priority: z.unknown().optional(),
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  dataSource: z.unknown().optional(),
  metrics: z.unknown().optional(),
  trend: z.unknown().optional(),
  impact: z.unknown().optional(),
  recommendations: z.unknown().optional(),
  actionRequired: z.unknown().optional(),
  actionDeadline: z.unknown().optional(),
  estimatedBenefit: z.unknown().optional(),
  confidenceScore: z.string().uuid('Invalid confidenceScore'),
  relatedEntities: z.unknown().optional(),
});

export const PATCH = async (request: NextRequest) => {
  return withRoleAuth('member', async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit insights updates
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ANALYTICS_QUERY,
      `analytics-insights-update:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      error
    );
    }

  try {
      const body = await request.json();
    // Validate request body
    const validation = analyticsInsightsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { insightId, status, notes, dismissalReason, organizationId, insightType, category, priority, title, description, dataSource, metrics, trend, impact, recommendations, actionRequired, actionDeadline, estimatedBenefit, confidenceScore, relatedEntities } = validation.data;
      const { insightId, status, notes, dismissalReason } = body;
      
      if (!insightId || !status) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: insightId, status'
      // TODO: Migrate additional details: status'
    );
      }
      
      if (!['new', 'acknowledged', 'in_progress', 'completed', 'dismissed'].includes(status)) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid status. Must be one of: new, acknowledged, in_progress, completed, dismissed'
      // TODO: Migrate additional details: acknowledged, in_progress, completed, dismissed'
    );
      }
      
      // Update insight status
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (status === 'acknowledged') {
        updateData.acknowledgedBy = userId;
        updateData.acknowledgedAt = new Date();
      }
      
      if (status === 'dismissed') {
        updateData.dismissedBy = userId;
        updateData.dismissedAt = new Date();
        if (dismissalReason) updateData.dismissalReason = dismissalReason;
      }
      
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
      
      if (notes) {
        updateData.notes = notes;
      }
      
      const [updated] = await db
        .update(insightRecommendations)
        .set(updateData)
        .where(eq(insightRecommendations.id, insightId))
        .returning();
      
      // Log audit event
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'insight_update',
        resourceType: 'analytics',
        resourceId: insightId,
        metadata: { status, hasNotes: !!notes },
        dataType: 'ANALYTICS',
      });
      
      return NextResponse.json({
        success: true,
        insight: updated
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

export const POST = async (request: NextRequest) => {
  return withRoleAuth(50, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit insight creation
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ADVANCED_ANALYTICS,
      `analytics-insights-create:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      error
    );
    }

  try {
      // This endpoint would be used by the AI system to create new insights
      // For now, it's a placeholder for future implementation
      
      const body = await request.json();
      const {
        organizationId,
        insightType,
        category,
        priority,
        title,
        description,
        dataSource,
        metrics,
        trend,
        impact,
        recommendations,
        actionRequired,
        actionDeadline,
        estimatedBenefit,
        confidenceScore,
        relatedEntities
      } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }

      
      // Validate required fields
      if (!organizationId || !insightType || !category || !priority || !title || !description) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields'
    );
      }
      
      const [insight] = await withRLSContext({ organizationId }, async (db) => {
        return await db.insert(insightRecommendations).values({
          organizationId,
          insightType,
          category,
          priority,
          title,
          description,
          dataSource,
          metrics,
          trend,
          impact,
          recommendations,
          actionRequired: actionRequired || false,
          actionDeadline: actionDeadline ? new Date(actionDeadline) : undefined,
          estimatedBenefit,
          confidenceScore: confidenceScore?.toString(),
          relatedEntities
        }).returning();
      });
      
      // Log audit event
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'insight_create',
        resourceType: 'analytics',
        resourceId: insight.id,
        metadata: { insightType, category, priority, actionRequired },
        dataType: 'ANALYTICS',
      });
      
      return NextResponse.json({
        success: true,
        insight
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

