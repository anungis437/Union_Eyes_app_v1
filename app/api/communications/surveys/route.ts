import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys, surveyQuestions } from '@/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const SurveyQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.enum(['text', 'textarea', 'single_choice', 'multiple_choice', 'rating', 'yes_no']),
  description: z.string().optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
  choices: z.array(z.string()).optional(),
  allowOther: z.boolean().optional(),
  minChoices: z.number().int().min(1).optional(),
  maxChoices: z.number().int().min(1).optional(),
  ratingMin: z.number().int().min(1).optional(),
  ratingMax: z.number().int().max(10).optional(),
  ratingMinLabel: z.string().optional(),
  ratingMaxLabel: z.string().optional(),
  minLength: z.number().int().min(1).optional(),
  maxLength: z.number().int().min(1).optional(),
  placeholder: z.string().optional(),
});

const CreateSurveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  surveyType: z.enum(['general', 'feedback', 'poll', 'assessment', 'registration']).default('general'),
  welcomeMessage: z.string().optional(),
  thankYouMessage: z.string().optional(),
  allowAnonymous: z.boolean().default(true),
  requireAuthentication: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'closed']).default('draft'),
  publishedAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
  questions: z.array(SurveyQuestionSchema).min(1, 'At least one question is required'),
});

// GET /api/communications/surveys - List surveys
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const status = searchParams.get('status') as 'draft' | 'published' | 'closed' | null;
    const surveyType = searchParams.get('surveyType') as string | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where conditions
    const conditions = [eq(surveys.tenantId, tenantId)];
    if (status) conditions.push(eq(surveys.status, status));
    if (surveyType) conditions.push(eq(surveys.surveyType, surveyType as any));

    // Fetch surveys
    const surveyList = await db
      .select({
        id: surveys.id,
        title: surveys.title,
        description: surveys.description,
        surveyType: surveys.surveyType,
        status: surveys.status,
        responseCount: surveys.responseCount,
        publishedAt: surveys.publishedAt,
        closesAt: surveys.closesAt,
        createdAt: surveys.createdAt,
        updatedAt: surveys.updatedAt,
        createdBy: surveys.createdBy,
      })
      .from(surveys)
      .where(and(...conditions))
      .orderBy(desc(surveys.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(surveys)
      .where(and(...conditions));

    return NextResponse.json({
      surveys: surveyList,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + surveyList.length < count,
      },
    });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveys' },
      { status: 500 }
    );
  }
}

// POST /api/communications/surveys - Create survey
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const userId = request.headers.get('x-user-id');
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID are required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = CreateSurveySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Additional validation
    if (data.requireAuthentication && data.allowAnonymous) {
      return NextResponse.json(
        { error: 'Cannot require authentication and allow anonymous responses' },
        { status: 400 }
      );
    }

    // Validate choice-based questions have choices
    for (const question of data.questions) {
      if (
        (question.questionType === 'single_choice' || question.questionType === 'multiple_choice') &&
        (!question.choices || question.choices.length < 2)
      ) {
        return NextResponse.json(
          { error: `Question "${question.questionText}" must have at least 2 choices` },
          { status: 400 }
        );
      }

      // Validate multiple choice min/max
      if (question.questionType === 'multiple_choice') {
        if (question.minChoices && question.maxChoices && question.minChoices > question.maxChoices) {
          return NextResponse.json(
            { error: `Question "${question.questionText}": minChoices cannot be greater than maxChoices` },
            { status: 400 }
          );
        }
      }

      // Validate rating scale
      if (question.questionType === 'rating') {
        if (question.ratingMin && question.ratingMax && question.ratingMin >= question.ratingMax) {
          return NextResponse.json(
            { error: `Question "${question.questionText}": ratingMin must be less than ratingMax` },
            { status: 400 }
          );
        }
      }
    }

    // Create survey in database
    const [survey] = await db
      .insert(surveys)
      .values({
        tenantId,
        title: data.title,
        description: data.description,
        surveyType: data.surveyType,
        welcomeMessage: data.welcomeMessage,
        thankYouMessage: data.thankYouMessage,
        allowAnonymous: data.allowAnonymous,
        requireAuthentication: data.requireAuthentication,
        shuffleQuestions: data.shuffleQuestions,
        showResults: data.showResults,
        status: data.status,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
        createdBy: userId,
      })
      .returning();

    // Create questions
    const questionValues = data.questions.map((q) => ({
      tenantId,
      surveyId: survey.id,
      questionText: q.questionText,
      questionType: q.questionType,
      description: q.description,
      required: q.required,
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

    const createdQuestions = await db
      .insert(surveyQuestions)
      .values(questionValues)
      .returning();

    return NextResponse.json(
      {
        survey,
        questions: createdQuestions,
        message: data.status === 'published' ? 'Survey published successfully' : 'Survey created as draft',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json(
      { error: 'Failed to create survey' },
      { status: 500 }
    );
  }
}
