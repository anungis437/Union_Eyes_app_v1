import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys, surveyQuestions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { withApiAuth } from '@/lib/api-auth-guard';

interface ChoiceItem {
  id?: string;
  text: string;
  order?: number;
}

interface UpdateQuestionData {
  questionText: string;
  questionType: string;
  description?: string;
  required: boolean;
  orderIndex?: number;
  order?: number;
  choices?: (string | ChoiceItem)[];
  allowOther?: boolean;
  minChoices?: number;
  maxChoices?: number;
  ratingMin?: number;
  ratingMax?: number;
  ratingMinLabel?: string;
  ratingMaxLabel?: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}

interface UpdateSurveyBody {
  title: string;
  description?: string;
  surveyType: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  allowAnonymous: boolean;
  requireAuthentication: boolean;
  shuffleQuestions: boolean;
  showResults: boolean;
  status: string;
  publishedAt?: string | null;
  closesAt?: string | null;
  questions?: UpdateQuestionData[];
}

// GET /api/communications/surveys/[id] - Get single survey with questions
export const GET = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const surveyId = params.id;

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

// PUT /api/communications/surveys/[id] - Update survey
export const PUT = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    const userId = request.headers.get('x-user-id');
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID are required' },
        { status: 400 }
      );
    }

    const surveyId = params.id;
    const body = await request.json() as UpdateSurveyBody;

    // Check if survey exists and belongs to tenant
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

    // Update survey
    const [updatedSurvey] = await db
      .update(surveys)
      .set({
        title: body.title,
        description: body.description,
        surveyType: body.surveyType as 'general' | 'feedback' | 'poll' | 'assessment' | 'registration',
        welcomeMessage: body.welcomeMessage,
        thankYouMessage: body.thankYouMessage,
        allowAnonymous: body.allowAnonymous,
        requireAuthentication: body.requireAuthentication,
        shuffleQuestions: body.shuffleQuestions,
        showResults: body.showResults,
        status: body.status as 'draft' | 'published' | 'closed',
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
        closesAt: body.closesAt ? new Date(body.closesAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(surveys.id, surveyId))
      .returning();

    // Delete existing questions
    await db
      .delete(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId));

    // Insert updated questions
    if (body.questions && body.questions.length > 0) {
      const questionValues = body.questions.map((q: UpdateQuestionData) => ({
        tenantId,
        surveyId,
        questionText: q.questionText,
        questionType: q.questionType as 'text' | 'textarea' | 'single_choice' | 'multiple_choice' | 'rating' | 'yes_no',
        description: q.description,
        required: q.required,
        orderIndex: q.orderIndex || q.order || 0,
        choices: q.choices?.map((c: string | ChoiceItem) => (typeof c === 'string' ? c : c.text)),
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

      await db
        .insert(surveyQuestions)
        .values(questionValues);
    }

    return NextResponse.json({
      survey: updatedSurvey,
      message: 'Survey updated successfully',
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to update survey' },
      { status: 500 }
    );
  }
});

// DELETE /api/communications/surveys/[id] - Delete survey
export const DELETE = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const surveyId = params.id;

    // Check if survey exists and belongs to tenant
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

    // Delete survey (cascades to questions and responses via database constraints)
    await db
      .delete(surveys)
      .where(eq(surveys.id, surveyId));

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
