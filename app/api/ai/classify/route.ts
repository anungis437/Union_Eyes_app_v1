/**
 * AI Auto-Classification API Route
 * 
 * POST /api/ai/classify
 * Classify clauses and generate metadata using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  classifyClause,
  generateClauseTags,
  detectCrossReferences,
  classifyPrecedent,
  enrichClauseMetadata,
  batchClassifyClauses,
} from '@/lib/services/ai/auto-classification-service';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      action = 'classify-clause', // 'classify-clause', 'generate-tags', 'detect-refs', 'classify-precedent', 'enrich', 'batch-classify'
      content,
      context = {},
      clauses = [], // For batch operations
      caseTitle,
      facts,
      reasoning,
      decision,
    } = body;

    switch (action) {
      case 'classify-clause':
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        const classification = await classifyClause(content, context);
        return NextResponse.json({
          action: 'classify-clause',
          classification,
        });

      case 'generate-tags':
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        if (!context.clauseType) {
          return NextResponse.json({ error: 'clauseType is required in context' }, { status: 400 });
        }
        const tags = await generateClauseTags(content, context.clauseType);
        return NextResponse.json({
          action: 'generate-tags',
          tags,
        });

      case 'detect-refs':
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        const crossReferences = await detectCrossReferences(content);
        return NextResponse.json({
          action: 'detect-refs',
          crossReferences,
        });

      case 'classify-precedent':
        if (!caseTitle || !facts || !reasoning || !decision) {
          return NextResponse.json(
            { error: 'caseTitle, facts, reasoning, and decision are required' },
            { status: 400 }
          );
        }
        const precedentClass = await classifyPrecedent(caseTitle, facts, reasoning, decision);
        return NextResponse.json({
          action: 'classify-precedent',
          classification: precedentClass,
        });

      case 'enrich':
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        const enriched = await enrichClauseMetadata(content, context);
        return NextResponse.json({
          action: 'enrich',
          enrichment: enriched,
        });

      case 'batch-classify':
        if (!clauses || clauses.length === 0) {
          return NextResponse.json({ error: 'Clauses array is required and must not be empty' }, { status: 400 });
        }
        
        let completed = 0;
        const total = clauses.length;
        
        const batchResults = await batchClassifyClauses(clauses, {
          concurrency: 5,
          onProgress: (comp, tot) => {
            completed = comp;
          },
        });

        const resultsArray = Array.from(batchResults.entries()).map(([id, result]) => ({
          id,
          ...result,
        }));

        return NextResponse.json({
          action: 'batch-classify',
          total,
          completed,
          results: resultsArray,
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action. Use: classify-clause, generate-tags, detect-refs, classify-precedent, enrich, or batch-classify',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI classification error:', error);
    return NextResponse.json(
      {
        error: 'Classification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
