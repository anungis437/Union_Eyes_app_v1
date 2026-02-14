import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys, surveyQuestions, surveyResponses, surveyAnswers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { withApiAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
interface QuestionResult {
  questionId: string;
  questionText: string;
  questionType: string;
  responseCount: number;
  answerBreakdown: any;
}

// GET /api/communications/surveys/[surveyId]/results - Get aggregated results
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
    const dateRange = searchParams.get('dateRange') || 'all';

    // Fetch survey
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

    // Calculate date filter
    let dateFilter = null;
    const now = new Date();
    
    if (dateRange === 'today') {
      dateFilter = new Date(now.setHours(0, 0, 0, 0));
    } else if (dateRange === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'month') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'quarter') {
      dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Build where conditions for responses
    const responseConditions = [eq(surveyResponses.surveyId, surveyId)];
    if (dateFilter) {
      responseConditions.push(gte(surveyResponses.createdAt, dateFilter));
    }

    // Fetch responses
    const responses = await db
      .select()
      .from(surveyResponses)
      .where(and(...responseConditions));

    // Calculate statistics
    const totalResponses = responses.length;
    const completedResponses = responses.filter((r) => r.status === 'completed').length;
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;
    
    const timeSpentValues = responses
      .map((r) => r.timeSpentSeconds)
      .filter((t): t is number => t !== null && t !== undefined);
    const averageTimeSpent = timeSpentValues.length > 0
      ? timeSpentValues.reduce((sum, t) => sum + t, 0) / timeSpentValues.length
      : 0;

    // Fetch questions
    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(surveyQuestions.orderIndex);

    // Fetch all answers for this survey (filtered by date range)
    const responseIds = responses.map((r) => r.id);
    
    let answers: Array<Record<string, unknown>> = [];
    if (responseIds.length > 0) {
      // SECURITY FIX: Use Drizzle's inArray() instead of manual IN clause building
      const { inArray } = await import('drizzle-orm');
      answers = await db
        .select()
        .from(surveyAnswers)
        .where(inArray(surveyAnswers.responseId, responseIds));
    }

    // Aggregate results by question
    const questionResults: QuestionResult[] = questions.map((question) => {
      const questionAnswers = answers.filter((a) => a.questionId === question.id);
      const responseCount = questionAnswers.length;

      let answerBreakdown = {};

      if (question.questionType === 'text' || question.questionType === 'textarea') {
        // For text questions, get unique answers with counts
        const textAnswers = questionAnswers
          .map((a) => a.answerText)
          .filter((text): text is string => text !== null && text !== undefined && text.trim() !== '');
        
        const answerCounts = new Map<string, number>();
        textAnswers.forEach((text) => {
          answerCounts.set(text, (answerCounts.get(text) || 0) + 1);
        });

        answerBreakdown = {
          answers: Array.from(answerCounts.entries())
            .map(([text, count]) => ({ text, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50), // Limit to first 50 unique answers
        };
      } else if (question.questionType === 'single_choice' || question.questionType === 'multiple_choice') {
        // For choice questions, count by choice
        const choiceCounts = new Map<string, number>();
        
        questionAnswers.forEach((answer) => {
          const choices = answer.answerChoices || [];
          choices.forEach((choice: string) => {
            choiceCounts.set(choice, (choiceCounts.get(choice) || 0) + 1);
          });
        });

        // Calculate percentages
        const total = Array.from(choiceCounts.values()).reduce((sum, count) => sum + count, 0);
        
        answerBreakdown = {
          choices: Array.from(choiceCounts.entries()).map(([choiceText, count]) => ({
            choiceText,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0,
          })),
        };
      } else if (question.questionType === 'rating') {
        // For rating questions, calculate statistics and distribution
        const ratings = questionAnswers
          .map((a) => a.answerNumber)
          .filter((num): num is number => num !== null && num !== undefined);

        if (ratings.length > 0) {
          const sum = ratings.reduce((acc, val) => acc + val, 0);
          const average = sum / ratings.length;
          const min = Math.min(...ratings);
          const max = Math.max(...ratings);

          // Create distribution
          const distribution = new Map<number, number>();
          const ratingMin = question.ratingMin || 1;
          const ratingMax = question.ratingMax || 10;
          
          // Initialize all possible ratings
          for (let i = ratingMin; i <= ratingMax; i++) {
            distribution.set(i, 0);
          }
          
          // Count actual ratings
          ratings.forEach((rating) => {
            distribution.set(rating, (distribution.get(rating) || 0) + 1);
          });

          answerBreakdown = {
            rating: {
              average,
              min,
              max,
              distribution: Array.from(distribution.entries())
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => a.value - b.value),
            },
          };
        } else {
          answerBreakdown = { rating: { average: 0, min: 0, max: 0, distribution: [] } };
        }
      } else if (question.questionType === 'yes_no') {
        // For yes/no questions, count yes and no
        const yesCount = questionAnswers.filter(
          (a) => a.answerChoices && a.answerChoices.includes('yes')
        ).length;
        const noCount = questionAnswers.filter(
          (a) => a.answerChoices && a.answerChoices.includes('no')
        ).length;

        answerBreakdown = {
          yesNo: {
            yes: yesCount,
            no: noCount,
            yesPercentage: responseCount > 0 ? (yesCount / responseCount) * 100 : 0,
            noPercentage: responseCount > 0 ? (noCount / responseCount) * 100 : 0,
          },
        };
      }

      return {
        questionId: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        responseCount,
        answerBreakdown,
      };
    });

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        surveyType: survey.surveyType,
        status: survey.status,
      },
      totalResponses,
      completedResponses,
      incompleteResponses: totalResponses - completedResponses,
      completionRate,
      averageTimeSpent,
      totalQuestions: questions.length,
      questionResults,
      dateRange,
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch survey results',
      error
    );
  }
});
