import { withRLSContext } from '@/lib/db/with-rls-context';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { withApiAuth } from '@/lib/api-auth-guard';
import { standardErrorResponse, standardSuccessResponse, ErrorCode } from '@/lib/api/standardized-responses';
import { z } from 'zod';

const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  category: z.enum(['general', 'concern', 'incorrect', 'suggestion', 'question', 'opt-out']),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

/**
 * POST /api/member/ai-feedback
 * 
 * Submit member feedback about AI features
 * Security: Protected with withApiAuth
 * Updated: Feb 2026 - Migrated to standardized error responses
 */
export const POST = withApiAuth(async (request: NextRequest, context) => {
  try {
    const { userId, organizationId } = context;
    const tenantId = organizationId || userId;
    
    const body = await request.json();
    const validatedData = feedbackSchema.parse(body);
    const { name, email, category, message } = validatedData;

    // Insert feedback into database
    const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      INSERT INTO member_ai_feedback (
        tenant_id,
        user_id,
        member_name,
        member_email,
        feedback_category,
        feedback_message,
        severity,
        status,
        submitted_at
      ) VALUES (
        ${tenantId},
        ${userId},
        ${name},
        ${email || null},
        ${category},
        ${message},
        ${category === 'concern' || category === 'incorrect' ? 'high' : 'normal'},
        'pending',
        NOW()
      )
      RETURNING id
    `);
    });

    const feedbackId = result[0]?.id;

    // For high-priority feedback (concerns, opt-outs), trigger notification
    if (category === 'concern' || category === 'opt-out') {
      // In production, send notification to AI Governance Committee
}

    return standardSuccessResponse({
      feedbackId,
      message: 'Thank you for your feedback. A steward will follow up within 2 business days.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid feedback data',
        { errors: error.errors }
      );
    }
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to submit feedback'
    );
  }
});

/**
 * GET /api/member/ai-feedback
 * 
 * Get feedback submissions for current user (or all if admin)
 * Security: Protected with withApiAuth
 * Updated: Feb 2026 - Migrated to standardized error responses
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    const { userId, organizationId } = context;
    const tenantId = organizationId || userId;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';

    // Build query with optional status filter
    const feedbackData = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      SELECT 
        id,
        feedback_category as category,
        feedback_message as message,
        status,
        submitted_at,
        reviewed_at,
        reviewer_response as response
      FROM member_ai_feedback
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
        ${statusFilter !== 'all' ? sql`AND status = ${statusFilter}` : sql``}
      ORDER BY submitted_at DESC
      LIMIT 50
    `);
    });

    const feedback = (feedbackData || []).map((row: any) => ({
      id: row.id,
      category: row.category,
      message: row.message,
      status: row.status,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      response: row.response
    }));

    return standardSuccessResponse({ feedback });

  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch feedback'
    );
  }
});

