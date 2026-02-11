import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys, surveyQuestions, surveyResponses, surveyAnswers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

// Validation schema for update
const UpdateSurveySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  surveyType: z.enum(['general', 'feedback', 'poll', 'assessment', 'registration']).optional(),
  welcomeMessage: z.string().optional(),
  thankYouMessage: z.string().optional(),
  allowAnonymous: z.boolean().optional(),
  requireAuthentication: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  publishedAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
  questions: z.array(z.any()).optional(), // Reuse schema from route.ts if updating questions
});

// GET /api/communications/surveys/[surveyId] - Get survey by ID
export const GET = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) => {
  try {
    const surveyId = params.surveyId;
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Fetch survey
    const [survey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
      .limit(1);

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Fetch questions
    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(surveyQuestions.orderIndex);

    return NextResponse.json({
      survey,
      questions,
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    );
  }
});

// PUT /api/communications/surveys/[surveyId] - Update survey
export const PUT = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) => {
  try {
    const surveyId = params.surveyId;
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    const userId = request.headers.get('x-user-id');
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID are required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = UpdateSurveySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if survey exists
    const [existingSurvey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
      .limit(1);

    if (!existingSurvey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Don't allow editing published surveys with responses
    if (existingSurvey.status === 'published' && existingSurvey.responseCount > 0) {
      return NextResponse.json(
        { error: 'Cannot edit survey that has responses. Please close and create a new one.' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedBy: userId,
      updatedAt: new Date(),
    };

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.surveyType) updateData.surveyType = data.surveyType;
    if (data.welcomeMessage !== undefined) updateData.welcomeMessage = data.welcomeMessage;
    if (data.thankYouMessage !== undefined) updateData.thankYouMessage = data.thankYouMessage;
    if (data.allowAnonymous !== undefined) updateData.allowAnonymous = data.allowAnonymous;
    if (data.requireAuthentication !== undefined) updateData.requireAuthentication = data.requireAuthentication;
    if (data.shuffleQuestions !== undefined) updateData.shuffleQuestions = data.shuffleQuestions;
    if (data.showResults !== undefined) updateData.showResults = data.showResults;
    if (data.status) updateData.status = data.status;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    if (data.closesAt !== undefined) updateData.closesAt = data.closesAt ? new Date(data.closesAt) : null;

    // Update survey
    const [updatedSurvey] = await db
      .update(surveys)
      .set(updateData)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
      .returning();

    // Update questions if provided
    let updatedQuestions = null;
    if (data.questions) {
      // Delete existing questions
      await db
        .delete(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, surveyId));

      // Insert new questions
      const questionValues = data.questions.map((q: any) => ({
        tenantId,
        surveyId: surveyId,
        questionText: q.questionText,
        questionType: q.questionType,
        description: q.description,
        required: q.required || false,
        orderIndex: q.order,
        choices: q.choices,
        allowOther: q.allowOther,
        minChoices: q.minChoices,
        maxChoices: q.maxChoices,
        ratingMin: q.ratingMin || 1,
        ratingMax: q.ratingMax || 10,
        ratingMinLabel: q.ratingMinLabel,
        ratingMaxLabel: q.ratingMaxLabel,
        minLength: q.minLength,
        maxLength: q.maxLength,
        placeholder: q.placeholder,
      }));

      updatedQuestions = await db
        .insert(surveyQuestions)
        .values(questionValues)
        .returning();
    }

    return NextResponse.json({
      survey: updatedSurvey,
      questions: updatedQuestions,
      message: 'Survey updated successfully',
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to update survey' },
      { status: 500 }
    );
  }
});

// DELETE /api/communications/surveys/[surveyId] - Delete survey
export const DELETE = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) => {
  try {
    const surveyId = params.surveyId;
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Check if survey exists
    const [existingSurvey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
      .limit(1);

    if (!existingSurvey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting published surveys with responses
    if (existingSurvey.status === 'published' && existingSurvey.responseCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete survey that has responses. Please close it instead.' },
        { status: 400 }
      );
    }

    // Delete answers first (cascading)
    await withRLSContext({ organizationId: tenantId }, async (db) => {
      return await db
        .delete(surveyAnswers)
        .where(
          eq(
            surveyAnswers.responseId,
            db.select({ id: surveyResponses.id })
              .from(surveyResponses)
              .where(eq(surveyResponses.surveyId, surveyId)) as any
          )
        );
    });

    // Delete responses
    await db
      .delete(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId));

    // Delete questions
    await db
      .delete(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId));

    // Delete survey
    await db
      .delete(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)));

    return NextResponse.json({
      message: 'Survey deleted successfully',
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to delete survey' },
      { status: 500 }
    );
  }
});
