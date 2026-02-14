import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/packages/supabase/server';
import {
  createOpenAIClient,
  generateEmbedding,
  cosineSimilarity,
  buildSearchPrompt,
  calculateConfidence,
  AiSource,
  AiAnswer,
  SearchRequestSchema,
} from '@unioneyes/ai';
import { z } from 'zod';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { checkEntitlement, consumeCredits, getCreditCost } from '@/lib/services/entitlements';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
import { logger } from '@/lib/logger';

export const POST = withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

    // CRITICAL: Rate limit AI calls (expensive OpenAI API)
    const rateLimitResult = await checkRateLimit(
      `ai-completion:${userId}`,
      RATE_LIMITS.AI_COMPLETION
    );

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded for AI operations. Please try again later.',
        { headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // CRITICAL: Check subscription entitlement for AI search
    const entitlement = await checkEntitlement(organizationId!, 'ai_search');
    if (!entitlement.allowed) {
      return standardErrorResponse(
        ErrorCode.FORBIDDEN,
        entitlement.reason || 'Feature not available in current plan'
      );
    }

    const startTime = Date.now();
    
      try {
        // 1. Parse and validate request body
        const body = await request.json();
        const validation = SearchRequestSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    const validatedRequest = validation.data;

        const { query, filters = {}, max_sources: maxSources = 5 } = validatedRequest;

        // 2. Get OpenAI API key from environment
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          return standardErrorResponse(
            ErrorCode.SERVICE_UNAVAILABLE,
            'AI service not configured'
          );
        }

        // 3. Create Supabase client
        const supabase = await createClient();

        const openaiClient = createOpenAIClient({
          apiKey: openaiApiKey,
          baseURL: process.env.OPENAI_BASE_URL,
        });

      // 4. Search for similar chunks using vector search when available, fallback to keyword search
      const useVectorSearch = process.env.AI_VECTOR_SEARCH === 'true';
      let chunks: Array<Record<string, unknown>> = [];
      let usedVectorSearch = false;

      if (useVectorSearch) {
        try {
          const embedding = await generateEmbedding(openaiClient, query, {
            model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
          });

          const { data: vectorChunks, error: vectorError } = await (supabase.rpc as any)('search_ai_chunks', {
            query_embedding: embedding,
            org_id: (organizationId || 'test-org-001') as Record<string, unknown>,
            max_results: maxSources * 2,
            similarity_threshold: 0.7,
          });

          if (vectorError) {
            logger.error('Vector search error:', vectorError);
            // Fall through to keyword search
          } else if (vectorChunks) {
            chunks = vectorChunks as Array<Record<string, unknown>>;
            usedVectorSearch = true;
          }
        } catch (error) {
          logger.error('Vector search failed:', error);
          // Fall through to keyword search
        }
      }

      if (!usedVectorSearch) {
        const { data: keywordChunks, error: searchError } = await supabase
          .from('ai_chunks')
          .select('id, document_id, content, metadata')
          .eq('organization_id', (organizationId || 'test-org-001') as Record<string, unknown>)
          .textSearch('content', query, { type: 'websearch', config: 'english' })
          .limit(maxSources * 2);

        if (searchError) {
          return standardErrorResponse(
            ErrorCode.DATABASE_ERROR,
            `Search failed: ${searchError.message}`
          );
        }

        chunks = keywordChunks || [];
      }

      // 7. Apply filters if provided
      let filteredChunks = chunks || [];
      
      if (filters.employer) {
        filteredChunks = filteredChunks.filter((chunk: Record<string, unknown>) =>
          chunk.metadata?.employer?.toLowerCase().includes(filters.employer!.toLowerCase())
        );
      }
      
      if (filters.arbitrator) {
        filteredChunks = filteredChunks.filter((chunk: Record<string, unknown>) =>
          chunk.metadata?.arbitrator?.toLowerCase().includes(filters.arbitrator!.toLowerCase())
        );
      }
      
      if (filters.issue_type) {
        filteredChunks = filteredChunks.filter((chunk: Record<string, unknown>) =>
          chunk.metadata?.issue_type?.includes(filters.issue_type!)
        );
      }
      
      if (filters.date_range?.start || filters.date_range?.end) {
        filteredChunks = filteredChunks.filter((chunk: Record<string, unknown>) => {
          const chunkDate = chunk.metadata?.date ? new Date(chunk.metadata.date) : null;
          if (!chunkDate) return false;
          
          const start = filters.date_range!.start ? new Date(filters.date_range!.start) : null;
          const end = filters.date_range!.end ? new Date(filters.date_range!.end) : null;
          
          if (start && chunkDate < start) return false;
          if (end && chunkDate > end) return false;
          
          return true;
        });
      }

      // Limit to maxSources
      filteredChunks = filteredChunks.slice(0, maxSources);

      // 8. If no good matches, return early
      if (filteredChunks.length === 0) {
        const latency = Date.now() - startTime;
        
        // Log query with no results
        await logAiQuery({
          supabase,
          organizationId: organizationId || '',
          userId,
          queryText: query,
          filters,
          answer: 'No relevant cases found for your query.',
          sources: [],
          status: 'success',
          latencyMs: latency,
        });

        return NextResponse.json({
          answer: 'No relevant cases found for your query.',
          sources: [],
          confidence: 'low',
        } as AiAnswer);
      }

      // 9. Format chunks for prompt
      const retrievedChunks = filteredChunks.map((chunk: any, index: number) => ({
        id: chunk.chunk_id ?? chunk.id,
        documentId: chunk.document_id,
        content: chunk.content,
        metadata: chunk.metadata,
        relevanceScore: usedVectorSearch ? (chunk.similarity ?? 0.7) : 0.7,
        index,
      }));

      // 10. Calculate confidence
      const confidence: 'high' | 'medium' | 'low' = usedVectorSearch ? 'high' : 'medium';

      // 11. Build prompt using OpenAI
      if (!openaiApiKey) {
        // Return keyword results without AI enhancement
        const latency = Date.now() - startTime;
        await logAiQuery({
          supabase,
          organizationId: organizationId || '',
          userId,
          queryText: query,
          filters,
          answer: 'Search results (AI enhancement unavailable)',
          sources: await formatSources(supabase, retrievedChunks),
          status: 'success',
          latencyMs: latency,
        });

        return NextResponse.json({
          answer: 'Found relevant cases based on your search terms.',
          sources: await formatSources(supabase, retrievedChunks),
          confidence: 'low',
        } as AiAnswer);
      }

      const prompt = buildSearchPrompt(query, retrievedChunks, filters);

      // 12. Call OpenAI to generate answer
      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const answerText = completion.choices[0]?.message?.content || 'Unable to generate answer.';

      // 13. Format sources for response
      const sources = await formatSources(supabase, retrievedChunks);

      const latency = Date.now() - startTime;

      // 14. Log query for auditing
      await logAiQuery({
        supabase,
        organizationId: organizationId || '',
        userId,
        queryText: query,
        filters,
        answer: answerText,
        sources,
        status: 'success',
        latencyMs: latency,
      });

      // 15. Return AI answer with sources
      const response: AiAnswer = {
        answer: answerText,
        sources,
        confidence,
      };

      // 16. Consume credits for AI search (non-blocking, fire-and-forget)
      consumeCredits(organizationId!, getCreditCost('ai_search'), 'ai_search').catch((err) => {
        logger.error('Failed to consume credits:', err);
      });

      return NextResponse.json(response);
    } catch (error) {
      const latency = Date.now() - startTime;

      // Log error
      // Validation error
      if (error instanceof z.ZodError) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          error.errors[0]?.message || 'Invalid request data'
        );
      }

      // Generic error
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'AI search failed'
      );
    }
});

/**
 * Helper function to format sources from chunks
 */
async function formatSources(supabase: any, chunks: Array<Record<string, unknown>>): Promise<AiSource[]> {
  return Promise.all(
    chunks.map(async (chunk: Record<string, unknown>) => {
      // Get document details for citation
      const { data: document } = await supabase
        .from('ai_documents')
        .select('id, title, metadata')
        .eq('id', chunk.documentId)
        .single();

      return {
        document_id: chunk.documentId,
        chunk_id: chunk.id,
        title: document?.title || 'Unknown Document',
        snippet: chunk.content.substring(0, 200) + '...',
        relevance_score: chunk.relevanceScore,
        citation: document?.metadata?.citation || null,
      };
    })
  );
}

/**
 * Helper function to log AI query
 */
async function logAiQuery({
  supabase,
  organizationId,
  userId,
  queryText,
  filters,
  answer,
  sources,
  status,
  latencyMs,
}: {
  supabase: any;
  organizationId: string;
  userId: string;
  queryText: string;
  filters: any | Record<string, unknown>;
  answer: string;
  sources: AiSource[];
  status: 'success' | 'error';
  latencyMs: number;
}) {
  try {
    const { error } = await supabase.rpc('log_ai_query', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_query_text: queryText,
      p_filters: filters,
      p_answer: answer,
      p_sources: sources,
      p_status: status,
      p_latency_ms: latencyMs,
    });

    if (error) {
}
  } catch (err) {
}
}

