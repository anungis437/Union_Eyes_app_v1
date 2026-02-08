import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/unified-auth';

/**
 * POST /api/member/ai-feedback
 * 
 * Submit member feedback about AI features
 * 
 * Request body:
 * {
 *   name: string,
 *   email?: string,
 *   category: 'general' | 'concern' | 'incorrect' | 'suggestion' | 'question' | 'opt-out',
 *   message: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   feedbackId: string,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, organizationId } = await requireUser();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationScopeId = organizationId || userId;
    const tenantId = organizationScopeId;
    const { name, email, category, message } = await request.json();

    // Validation
    if (!name || !category || !message) {
      return NextResponse.json(
        { error: 'name, category, and message are required' },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { error: 'message must be at least 10 characters' },
        { status: 400 }
      );
    }

    const validCategories = ['general', 'concern', 'incorrect', 'suggestion', 'question', 'opt-out'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'invalid category' },
        { status: 400 }
      );
    }

    // Insert feedback into database
    const result = await db.execute(sql`
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

    const feedbackId = result[0]?.id;

    // For high-priority feedback (concerns, opt-outs), trigger notification
    if (category === 'concern' || category === 'opt-out') {
      // In production, send notification to AI Governance Committee
      console.log(`High-priority AI feedback received: ${feedbackId}`);
    }

    return NextResponse.json({
      success: true,
      feedbackId,
      message: 'Thank you for your feedback. A steward will follow up within 2 business days.'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/member/ai-feedback
 * 
 * Get feedback submissions for current user (or all if admin)
 * 
 * Query parameters:
 * - status: 'pending' | 'reviewed' | 'resolved' | 'all' (default: 'all')
 * 
 * Response:
 * {
 *   feedback: [{
 *     id: string,
 *     category: string,
 *     message: string,
 *     status: string,
 *     submittedAt: string,
 *     reviewedAt?: string,
 *     response?: string
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, organizationId } = await requireUser();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationScopeId = organizationId || userId;
    const tenantId = organizationScopeId;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';

    // Build query with optional status filter
    const feedbackData = await db.execute(sql`
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

    const feedback = (feedbackData || []).map((row: any) => ({
      id: row.id,
      category: row.category,
      message: row.message,
      status: row.status,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      response: row.response
    }));

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
