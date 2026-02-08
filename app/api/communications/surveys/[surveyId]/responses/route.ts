import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys, surveyQuestions, surveyResponses, surveyAnswers } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api-auth-guard';

// Validation schema
const AnswerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().optional(),
  answerChoices: z.array(z.string()).optional(),
  answerNumber: z.number().optional(),
});

const CreateResponseSchema = z.object({
  respondentName: z.string().optional(),
  respondentEmail: z.string().email().optional(),
  answers: z.array(AnswerSchema).min(1, 'At least one answer is required'),
  timeSpentSeconds: z.number().int().min(0).optional(),
});

// GET /api/communications/surveys/[surveyId]/responses - List responses
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeAnswers = searchParams.get('includeAnswers') === 'true';

    // Check if survey exists
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

    // Fetch responses
    const responses = await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))
      .orderBy(desc(surveyResponses.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch answers if requested
    let responsesWithAnswers = responses;
    if (includeAnswers) {
      responsesWithAnswers = await Promise.all(
        responses.map(async (response) => {
          const answers = await db
            .select()
            .from(surveyAnswers)
            .where(eq(surveyAnswers.responseId, response.id));
          
          return {
            ...response,
            answers,
          };
        })
      );
    }

    return NextResponse.json({
      responses: responsesWithAnswers,
      pagination: {
        limit,
        offset,
        hasMore: responses.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
});

// POST /api/communications/surveys/[surveyId]/responses - Submit response
export const POST = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) => {
  try {
    const surveyId = params.surveyId;
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    const userId = request.headers.get('x-user-id') || null;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = CreateResponseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Fetch survey with questions
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

    // Check survey status
    if (survey.status !== 'published') {
      return NextResponse.json(
        { error: 'Survey is not published' },
        { status: 400 }
      );
    }

    // Check if survey is closed
    if (survey.closesAt && new Date(survey.closesAt) < new Date()) {
      return NextResponse.json(
        { error: 'Survey is closed' },
        { status: 400 }
      );
    }

    // Check authentication requirements
    if (survey.requireAuthentication && !userId) {
      return NextResponse.json(
        { error: 'Authentication required to submit response' },
        { status: 401 }
      );
    }

    // Fetch questions for validation
    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId));

    // Create a map for quick question lookup
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Validate answers against questions
    for (const answer of data.answers) {
      const question = questionMap.get(answer.questionId);
      
      if (!question) {
        return NextResponse.json(
          { error: `Question ${answer.questionId} not found` },
          { status: 400 }
        );
      }

      // Check required fields
      if (question.required) {
        const hasAnswer = 
          (answer.answerText && answer.answerText.trim()) ||
          (answer.answerChoices && answer.answerChoices.length > 0) ||
          (answer.answerNumber !== undefined && answer.answerNumber !== null);

        if (!hasAnswer) {
          return NextResponse.json(
            { error: `Question "${question.questionText}" is required` },
            { status: 400 }
          );
        }
      }

      // Validate by question type
      if (question.questionType === 'text' || question.questionType === 'textarea') {
        if (answer.answerText) {
          if (question.minLength && answer.answerText.length < question.minLength) {
            return NextResponse.json(
              { error: `Question "${question.questionText}" requires minimum ${question.minLength} characters` },
              { status: 400 }
            );
          }
          if (question.maxLength && answer.answerText.length > question.maxLength) {
            return NextResponse.json(
              { error: `Question "${question.questionText}" allows maximum ${question.maxLength} characters` },
              { status: 400 }
            );
          }
        }
      }

      if (question.questionType === 'multiple_choice') {
        if (answer.answerChoices) {
          if (question.minChoices && answer.answerChoices.length < question.minChoices) {
            return NextResponse.json(
              { error: `Question "${question.questionText}" requires at least ${question.minChoices} choices` },
              { status: 400 }
            );
          }
          if (question.maxChoices && answer.answerChoices.length > question.maxChoices) {
            return NextResponse.json(
              { error: `Question "${question.questionText}" allows at most ${question.maxChoices} choices` },
              { status: 400 }
            );
          }
        }
      }

      if (question.questionType === 'rating') {
        if (answer.answerNumber !== undefined) {
          const min = question.ratingMin || 1;
          const max = question.ratingMax || 10;
          if (answer.answerNumber < min || answer.answerNumber > max) {
            return NextResponse.json(
              { error: `Question "${question.questionText}" requires rating between ${min} and ${max}` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Create response
    const [response] = await db
      .insert(surveyResponses)
      .values({
        tenantId,
        surveyId,
        userId,
        respondentName: data.respondentName,
        respondentEmail: data.respondentEmail,
        status: 'completed',
        completedAt: new Date(),
        timeSpentSeconds: data.timeSpentSeconds,
      })
      .returning();

    // Create answers
    const answerValues = data.answers.map((answer) => ({
      tenantId,
      responseId: response.id,
      questionId: answer.questionId,
      answerText: answer.answerText,
      answerChoices: answer.answerChoices,
      answerNumber: answer.answerNumber ? String(answer.answerNumber) : undefined,
    }));

    const createdAnswers = await db
      .insert(surveyAnswers)
      .values(answerValues)
      .returning();

    return NextResponse.json(
      {
        response,
        answers: createdAnswers,
        message: 'Response submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting response:', error);
    return NextResponse.json(
      { error: 'Failed to submit response' },
      { status: 500 }
    );
  }
});
