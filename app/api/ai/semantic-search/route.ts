import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * AI Semantic Search API Route
 * 
 * POST /api/ai/semantic-search
 * Search clauses and precedents using semantic similarity
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  semanticClauseSearch,
  semanticPrecedentSearch,
  unifiedSemanticSearch,
  findSimilarClauses,
} from '@/lib/services/ai/vector-search-service';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const {
        query,
        searchType = 'unified', // 'clauses', 'precedents', 'unified', 'similar'
        clauseId, // For 'similar' search type
        limit = 10,
        threshold = 0.7,
        filters = {},
        hybridSearch = { enabled: false, keywordWeight: 0.3 },
      } = body;

      if (!query && searchType !== 'similar') {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
      }

      if (searchType === 'similar' && !clauseId) {
        return NextResponse.json(
          { error: 'clauseId is required for similar search' },
          { status: 400 }
        );
      }

      let results;

      switch (searchType) {
        case 'clauses':
          results = await semanticClauseSearch(query, {
            limit,
            threshold,
            filters,
            hybridSearch,
          });
          return NextResponse.json({
            searchType: 'clauses',
            query,
            results,
            count: results.length,
          });

        case 'precedents':
          results = await semanticPrecedentSearch(query, {
            limit,
            threshold,
            issueType: filters.issueType,
            jurisdiction: filters.jurisdiction,
          });
          return NextResponse.json({
            searchType: 'precedents',
            query,
            results,
            count: results.length,
          });

        case 'unified':
          results = await unifiedSemanticSearch(query, {
            includeClauses: true,
            includePrecedents: true,
            limit,
            threshold,
          });
          return NextResponse.json({
            searchType: 'unified',
            query,
            clauses: results.clauses,
            precedents: results.precedents,
            combined: results.combined,
            counts: {
              clauses: results.clauses.length,
              precedents: results.precedents.length,
              total: results.combined.length,
            },
          });

        case 'similar':
          results = await findSimilarClauses(clauseId, {
            limit,
            threshold,
            sameTypeOnly: filters.sameTypeOnly || false,
          });
          return NextResponse.json({
            searchType: 'similar',
            clauseId,
            results,
            count: results.length,
          });

        default:
          return NextResponse.json(
            { error: 'Invalid searchType. Use: clauses, precedents, unified, or similar' },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      return NextResponse.json(
        {
          error: 'Semantic search failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })
  })(request);
};

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // This would query database to check how many clauses/precedents have embeddings
      // For now, return a placeholder response
      return NextResponse.json({
        status: 'ready',
        clauses: {
          total: 0,
          withEmbeddings: 0,
          percentage: 0,
        },
        precedents: {
          total: 0,
          withEmbeddings: 0,
          percentage: 0,
        },
      });
    } catch (error) {
      console.error('Status check error:', error);
      return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
    }
  })
  })(request);
};
