import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * POST /api/ml/query
 * Natural language query interface
 * 
 * Request body:
 * {
 *   question: string,    // Natural language question
 *   context?: any        // Optional context
 * }
 * 
 * Response:
 * {
 *   answer: string,
 *   data?: any,          // Query results if data query
 *   sql?: string,        // Generated SQL if applicable
 *   confidence: number,
 *   sources: string[],
 *   suggestions?: string[] // Follow-up questions
 * }
 * 
 * Examples:
 * - "Show me top 5 stewards by resolution rate this month"
 * - "How many claims are overdue?"
 * - "What's our win rate this quarter?"
 * - "Which employer has the most claims?"
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = orgId || userId;
    const { question, context } = await request.json();
    
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'question is required and must be a string' }, 
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { error: 'question is too long (max 500 characters)' }, 
        { status: 400 }
      );
    }

    // Call AI service for natural language query
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3005';
    
    const response = await fetch(`${aiServiceUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_TOKEN}`,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        question,
        tenantId,
        context
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('AI service query failed:', errorData);
      throw new Error('AI service query failed');
    }

    const result = await response.json();

    // Generate follow-up suggestions based on the query type
    const suggestions = generateFollowUpSuggestions(question, result);

    return NextResponse.json({
      ...result,
      suggestions
    });
    
  } catch (error) {
    console.error('Natural language query error:', error);
    return NextResponse.json(
      { error: 'Failed to process natural language query' },
      { status: 500 }
    );
  }
}

/**
 * Generate intelligent follow-up question suggestions
 */
function generateFollowUpSuggestions(
  question: string, 
  result: any
): string[] {
  const suggestions: string[] = [];
  const lowerQuestion = question.toLowerCase();

  // Claims-related follow-ups
  if (lowerQuestion.includes('claim')) {
    suggestions.push(
      'Show me claims by category',
      'What is the average resolution time?',
      'Which stewards handle the most claims?'
    );
  }

  // Steward-related follow-ups
  if (lowerQuestion.includes('steward')) {
    suggestions.push(
      'Show steward workload distribution',
      'Who has the highest win rate?',
      'Compare steward performance this quarter'
    );
  }

  // Deadline-related follow-ups
  if (lowerQuestion.includes('deadline') || lowerQuestion.includes('overdue')) {
    suggestions.push(
      'Show upcoming deadlines this week',
      'Which claims are at risk?',
      'What is our SLA compliance rate?'
    );
  }

  // Financial follow-ups
  if (lowerQuestion.includes('settlement') || lowerQuestion.includes('cost')) {
    suggestions.push(
      'What is our total recovery this month?',
      'Show costs by claim type',
      'Calculate our ROI for this quarter'
    );
  }

  // Time-based follow-ups
  if (lowerQuestion.includes('month') || lowerQuestion.includes('quarter')) {
    suggestions.push(
      'Compare with previous period',
      'Show year-over-year trends',
      'Forecast next month'
    );
  }

  // Return up to 3 suggestions
  return suggestions.slice(0, 3);
}
