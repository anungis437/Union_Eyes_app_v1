import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/packages/supabase/server';
import { FeedbackSubmissionSchema } from '@unioneyes/ai';
import { z } from 'zod';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      // 1. Authenticate with Clerk
      const { userId, organizationId } = context;
      // 2. Parse and validate request body
      const body = await request.json();
      const validation = FeedbackSubmissionSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    const validatedFeedback = validation.data;

      const { query_id, rating, comment } = validatedFeedback;

      // 3. Create Supabase client
      const supabase = await createClient();

      // 4. Verify that query exists and belongs to this organization
      const { data: query, error: queryError } = await supabase
        .from('ai_queries')
        .select('id, organization_id')
        .eq('id', query_id as any)
        .single();

      if (queryError || !query) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Query not found'
    );
      }

      // Verify organization access
      if (organizationId && (query as any).organization_id !== organizationId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // 5. Insert feedback
      const { data: feedback, error: insertError } = await supabase
        .from('ai_feedback')
        .insert({
          query_id,
          organization_id: organizationId || (query as any).organization_id,
          user_id: userId,
          rating,
          comment: comment || null,
        } as any)
        .select()
        .single();

      if (insertError) {
return NextResponse.json(
          { error: 'Failed to submit feedback', details: insertError.message },
          { status: 500 }
        );
      }

      // 6. Return success
      return NextResponse.json({
        success: true,
        feedback_id: (feedback as any)?.id,
        message: 'Thank you for your feedback!',
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to submit feedback',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request);
};

