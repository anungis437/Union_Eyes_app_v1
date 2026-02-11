import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { polls } from '@/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// Validation schemas
const PollOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Option text is required').max(200),
});

const CreatePollSchema = z.object({
  question: z.string().min(1, 'Question is required').max(200),
  description: z.string().max(500).optional(),
  options: z.array(PollOptionSchema).min(2, 'At least 2 options are required').max(10, 'Maximum 10 options allowed'),
  allowMultipleVotes: z.boolean().default(false),
  requireAuthentication: z.boolean().default(true),
  showResultsBeforeVote: z.boolean().default(false),
  closesAt: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'closed']).default('draft'),
});

// GET /api/communications/polls - List polls
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    
    if (!tenantId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Tenant ID is required'
    );
    }

    const status = searchParams.get('status') as 'draft' | 'active' | 'closed' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where conditions
    const conditions = [eq(polls.tenantId, tenantId)];
    if (status) conditions.push(eq(polls.status, status));

    // Fetch polls
    const pollList = await db
      .select({
        id: polls.id,
        question: polls.question,
        description: polls.description,
        status: polls.status,
        totalVotes: polls.totalVotes,
        uniqueVoters: polls.uniqueVoters,
        allowMultipleVotes: polls.allowMultipleVotes,
        requireAuthentication: polls.requireAuthentication,
        showResultsBeforeVote: polls.showResultsBeforeVote,
        closesAt: polls.closesAt,
        createdAt: polls.createdAt,
        updatedAt: polls.updatedAt,
        createdBy: polls.createdBy,
      })
      .from(polls)
      .where(and(...conditions))
      .orderBy(desc(polls.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(polls)
      .where(and(...conditions));

    return NextResponse.json({
      polls: pollList,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + pollList.length < count,
      },
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch polls',
      error
    );
  }
});

// POST /api/communications/polls - Create poll
export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    const userId = request.headers.get('x-user-id');
    
    if (!tenantId || !userId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Tenant ID and User ID are required'
    );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = CreatePollSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Prepare options as JSONB
    const optionsData = data.options.map((opt, idx) => ({
      id: opt.id || `opt_${Date.now()}_${idx}`,
      text: opt.text,
      votes: 0,
    }));

    // Create poll in database
    const [poll] = await db
      .insert(polls)
      .values({
        tenantId,
        question: data.question,
        description: data.description,
        options: optionsData,
        allowMultipleVotes: data.allowMultipleVotes,
        requireAuthentication: data.requireAuthentication,
        showResultsBeforeVote: data.showResultsBeforeVote,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
        status: data.status,
        createdBy: userId,
      })
      .returning();

    return standardSuccessResponse(
      { 
        poll,
        message: data.status === 'active' ? 'Poll published successfully' : 'Poll created as draft',
       },
      undefined,
      201
    );
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create poll',
      error
    );
  }
});

