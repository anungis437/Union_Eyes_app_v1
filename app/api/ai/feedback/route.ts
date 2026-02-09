import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/packages/supabase/server';
import { FeedbackSubmissionSchema } from '@unioneyes/ai';
import { z } from 'zod';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      // 1. Authenticate with Clerk
      const { userId, organizationId } = context;
      // 2. Parse and validate request body
      const body = await request.json();
      const validatedFeedback = FeedbackSubmissionSchema.parse(body);

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
        return NextResponse.json(
          { error: 'Query not found' },
          { status: 404 }
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
        console.error('Failed to insert feedback:', insertError);
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
      console.error('AI feedback error:', error);

      // Validation error
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request',
            details: error.errors,
          },
          { status: 400 }
        );
      }

      // Generic error
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

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      // 1. Authenticate with Clerk
      const { organizationId } = context;
      // 2. Get query ID from URL params
      const { searchParams } = new URL(request.url);
      const queryId = searchParams.get('query_id');

      if (!queryId) {
        return NextResponse.json(
          { error: 'query_id parameter is required' },
          { status: 400 }
        );
      }

      // 3. Create Supabase client
      const supabase = await createClient();

      // 4. Get feedback for this query (filtered by organization)
      const { data: feedback, error } = await supabase
        .from('ai_feedback')
        .select('*')
        .eq('query_id', queryId as any)
        .eq('organization_id', (organizationId || '') as any)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch feedback:', error);
        return NextResponse.json(
          { error: 'Failed to fetch feedback', details: error.message },
          { status: 500 }
        );
      }

      // 5. Return feedback
      return NextResponse.json({
        feedback: feedback || [],
      });
    } catch (error) {
      console.error('AI feedback fetch error:', error);

      return NextResponse.json(
        {
          error: 'Failed to fetch feedback',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request);
};
