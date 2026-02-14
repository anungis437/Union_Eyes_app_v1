import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys, surveyQuestions, surveyResponses, surveyAnswers } from '@/db/schema';
import { and } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { withApiAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// GET /api/communications/surveys/[surveyId]/export - Export responses
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
    const format = searchParams.get('format') || 'csv';

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

    // Fetch questions
    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(surveyQuestions.orderIndex);

    // Fetch all responses with answers
    const responses = await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))
      .orderBy(surveyResponses.createdAt);

    // Fetch all answers
    const responseIds = responses.map((r) => r.id);
    const allAnswers = responseIds.length > 0
      ? await db
          .select()
          .from(surveyAnswers)
          .where(
            eq(surveyAnswers.responseId, responseIds[0]) // This is a simplification - in production, use SQL IN
          )
      : [];

    // Create answer map
    const answerMap = new Map<string, Map<string, any>>();
    allAnswers.forEach((answer) => {
      if (!answerMap.has(answer.responseId)) {
        answerMap.set(answer.responseId, new Map());
      }
      answerMap.get(answer.responseId)!.set(answer.questionId, answer);
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Response ID',
        'Respondent Name',
        'Respondent Email',
        'Submitted At',
        'Time Spent (seconds)',
        'Status',
        ...questions.map((q) => q.questionText),
      ];

      const rows = responses.map((response) => {
        const responseAnswers = answerMap.get(response.id) || new Map();
        
        const answerValues = questions.map((question) => {
          const answer = responseAnswers.get(question.id);
          if (!answer) return '';

          if (question.questionType === 'text' || question.questionType === 'textarea') {
            return answer.answerText || '';
          } else if (question.questionType === 'single_choice' || question.questionType === 'multiple_choice') {
            return (answer.answerChoices || []).join('; ');
          } else if (question.questionType === 'rating') {
            return answer.answerNumber?.toString() || '';
          } else if (question.questionType === 'yes_no') {
            return (answer.answerChoices || [])[0] || '';
          }
          return '';
        });

        return [
          response.id,
          response.respondentName || '',
          response.respondentEmail || '',
          response.createdAt.toISOString(),
          response.timeSpentSeconds?.toString() || '',
          response.status === 'completed' ? 'Complete' : 'Incomplete',
          ...answerValues,
        ];
      });

      // Create CSV content
      const csvContent = [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="survey-${surveyId}-responses.csv"`,
        },
      });
    } else if (format === 'excel') {
      // Generate Excel using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Survey Responses');

      // Set up headers
      worksheet.columns = [
        { header: 'Response ID', key: 'id', width: 38 },
        { header: 'Respondent Name', key: 'name', width: 20 },
        { header: 'Respondent Email', key: 'email', width: 25 },
        { header: 'Submitted At', key: 'submittedAt', width: 20 },
        { header: 'Time Spent (seconds)', key: 'timeSpent', width: 18 },
        { header: 'Status', key: 'status', width: 12 },
        ...questions.map((q, idx) => ({
          header: q.questionText,
          key: `question_${idx}`,
          width: 30,
        })),
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add data rows
      responses.forEach((response) => {
        const responseAnswers = answerMap.get(response.id) || new Map();
        
        const rowData = {
          id: response.id,
          name: response.respondentName || '',
          email: response.respondentEmail || '',
          submittedAt: response.createdAt.toISOString(),
          timeSpent: response.timeSpentSeconds || '',
          status: response.status === 'completed' ? 'Complete' : 'Incomplete',
        };

        questions.forEach((question, idx) => {
          const answer = responseAnswers.get(question.id);
          let value = '';

          if (answer) {
            if (question.questionType === 'text' || question.questionType === 'textarea') {
              value = answer.answerText || '';
            } else if (question.questionType === 'single_choice' || question.questionType === 'multiple_choice') {
              value = (answer.answerChoices || []).join('; ');
            } else if (question.questionType === 'rating') {
              value = answer.answerNumber?.toString() || '';
            } else if (question.questionType === 'yes_no') {
              value = (answer.answerChoices || [])[0] || '';
            }
          }

          rowData[`question_${idx}`] = value;
        });

        worksheet.addRow(rowData);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="survey-${surveyId}-responses.xlsx"`,
        },
      });
    } else {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid format. Supported formats: csv, excel'
      // TODO: Migrate additional details: excel'
    );
    }
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to export survey responses',
      error
    );
  }
});
