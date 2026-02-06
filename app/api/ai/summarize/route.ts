import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/packages/supabase/server';
import { 
  createOpenAIClient,
  buildSummaryPrompt,
  validateSummaryStructure,
} from '@unioneyes/ai';
import { z } from 'zod';

/**
 * POST /api/ai/summarize
 * Generate case summary or brief draft (U2 use case)
 * 
 * Security:
 * - Clerk authentication required
 * - Organization-scoped via RLS
 * - Server-side only
 * - Requires explicit user consent per summary
 * 
 * Human-in-the-Loop:
 * - All outputs labeled as [AI DRAFT]
 * - Requires human review before use
 * - Stored in case_summaries with created_by='ai'
 */

const SummarizeRequestSchema = z.object({
  claim_id: z.string().uuid(),
  purpose: z.enum(['arbitration', 'negotiation', 'internal']).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate with Clerk
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { claim_id, purpose = 'internal' } = SummarizeRequestSchema.parse(body);

    // 3. Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // 4. Create Supabase client
    const supabase = await createClient();

    // 5. Fetch case/claim data (filtered by organization)
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select(`
        *,
        member:members(first_name, last_name, member_number),
        employer:employers(name),
        activities:activities(activity_type, description, created_at)
      `)
      .eq('claim_id', claim_id as any)
      .eq('organization_id', (orgId || '') as any)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    // 6. Format case content for summarization
    const caseContent = formatCaseContent(claim as any);
    const caseMetadata = {
      claim_id,
      member_name: `${(claim as any).member?.first_name} ${(claim as any).member?.last_name}`,
      employer_name: (claim as any).employer?.name,
      issue_type: (claim as any).issue_type,
      status: (claim as any).status,
      created_at: (claim as any).created_at,
    };

    // 7. Build prompt with PII masking
    const prompt = buildSummaryPrompt(caseContent, caseMetadata);

    // 8. Call OpenAI to generate summary
    const openaiClient = createOpenAIClient({
      apiKey: openaiApiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for consistency
      max_tokens: 3000, // Summaries can be longer
    });

    const summaryText = completion.choices[0]?.message?.content || 'Unable to generate summary.';

    // 9. Validate summary structure
    const validation = validateSummaryStructure(summaryText);
    if (!validation.valid) {
      console.warn('Generated summary missing sections:', validation.missingSections);
    }

    // 10. Store summary in database
    const { data: summary, error: summaryError } = await supabase
      .from('case_summaries')
      .insert({
        claim_id,
        organization_id: orgId || (claim as any).organization_id,
        summary_text: summaryText,
        created_by: 'ai', // Mark as AI-generated
        metadata: {
          purpose,
          ai_model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          validation,
          latency_ms: Date.now() - startTime,
        },
      } as any)
      .select()
      .single();

    if (summaryError) {
      console.error('Failed to store summary:', summaryError);
      return NextResponse.json(
        { error: 'Failed to store summary', details: summaryError.message },
        { status: 500 }
      );
    }

    // 11. Return summary
    return NextResponse.json({
      summary_id: (summary as any)?.id,
      summary_text: summaryText,
      validation,
      metadata: {
        purpose,
        claim_id,
        latency_ms: Date.now() - startTime,
      },
      warning: 'This is an AI-generated draft. Human review required before use.',
    });
  } catch (error) {
    console.error('AI summarize error:', error);

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
        error: 'Summarization failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/summarize?claim_id={id}
 * Get all AI-generated summaries for a claim
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate with Clerk
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get claim ID from URL params
    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('claim_id');

    if (!claimId) {
      return NextResponse.json(
        { error: 'claim_id parameter is required' },
        { status: 400 }
      );
    }

    // 3. Create Supabase client
    const supabase = await createClient();

    // 4. Get all AI summaries for this claim (filtered by organization)
    const { data: summaries, error } = await supabase
      .from('case_summaries')
      .select('*')
      .eq('claim_id', claimId as any)
      .eq('organization_id', (orgId || '') as any)
      .eq('created_by', 'ai' as any)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch summaries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch summaries', details: error.message },
        { status: 500 }
      );
    }

    // 5. Return summaries
    return NextResponse.json({
      summaries: summaries || [],
    });
  } catch (error) {
    console.error('AI summary fetch error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch summaries',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to format case content for summarization
 */
function formatCaseContent(claim: any): string {
  let content = '';

  // Basic info
  content += `MEMBER: ${claim.member?.first_name} ${claim.member?.last_name}\n`;
  content += `MEMBER NUMBER: ${claim.member?.member_number}\n`;
  content += `EMPLOYER: ${claim.employer?.name}\n`;
  content += `ISSUE TYPE: ${claim.issue_type}\n`;
  content += `STATUS: ${claim.status}\n`;
  content += `CREATED: ${claim.created_at}\n\n`;

  // Description
  if (claim.description) {
    content += `DESCRIPTION:\n${claim.description}\n\n`;
  }

  // Activities/Timeline
  if (claim.activities && claim.activities.length > 0) {
    content += `TIMELINE:\n`;
    claim.activities
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((activity: any) => {
        content += `[${activity.created_at}] ${activity.activity_type}: ${activity.description}\n`;
      });
    content += '\n';
  }

  // Additional notes
  if (claim.notes) {
    content += `NOTES:\n${claim.notes}\n\n`;
  }

  return content;
}
