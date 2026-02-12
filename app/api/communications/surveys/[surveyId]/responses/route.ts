import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys, surveyQuestions, surveyResponses, surveyAnswers } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
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
    const organizationId = request.headers.get('x-organization-id');
    
    if (!organizationId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID is required'
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
      .where(and(eq(surveys.id, surveyId), eq(surveys.organizationId, organizationId)))
      .limit(1);

    if (!survey) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Survey not found'
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch responses',
      error
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
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id') || null;
    
    if (!organizationId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID is required'
    );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = CreateResponseSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed'
      // TODO: Migrate additional details: details: validation.error.errors
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
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Authentication required to submit response'
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
        organizationId,
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
      organizationId,
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

    return standardSuccessResponse(
      { 
        response,
        answers: createdAnswers,
        message: 'Response submitted successfully',
       },
      undefined,
      201
    );
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to submit response',
      error
    );
  }
});
