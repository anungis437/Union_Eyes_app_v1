import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
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

/**
 * POST /api/ai/search
 * Smart Case & Precedent Search (RAG)
 * 
 * Security:
 * - Clerk authentication required
 * - Organization-scoped via RLS
 * - Server-side only (API keys never exposed to browser)
 * 
 * Rate Limit:
 * - TODO: Add rate limiting per organization (e.g., 100 queries/hour)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Authenticate with Clerk
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validatedRequest = SearchRequestSchema.parse(body);

    const { query, filters = {}, max_sources: maxSources = 5 } = validatedRequest;

    // 3. Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // 4. Create Supabase client
    const supabase = await createClient();

    // 5. Search for similar chunks using keyword search (temporary until pgvector enabled)
    // TODO: Replace with vector search once pgvector enabled
    // Note: For now, this returns empty results - it's a placeholder until pgvector is enabled
    const { data: chunks, error: searchError } = await supabase
      .from('ai_chunks')
      .select('id, document_id, content, metadata')
      .eq('organization_id', (orgId || 'test-tenant-001') as any)
      .textSearch('content', query, { type: 'websearch', config: 'english' })
      .limit(maxSources * 2);

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json(
        { error: 'Search failed', details: searchError.message },
        { status: 500 }
      );
    }

    // 7. Apply filters if provided
    let filteredChunks = chunks || [];
    
    if (filters.employer) {
      filteredChunks = filteredChunks.filter((chunk: any) =>
        chunk.metadata?.employer?.toLowerCase().includes(filters.employer!.toLowerCase())
      );
    }
    
    if (filters.arbitrator) {
      filteredChunks = filteredChunks.filter((chunk: any) =>
        chunk.metadata?.arbitrator?.toLowerCase().includes(filters.arbitrator!.toLowerCase())
      );
    }
    
    if (filters.issue_type) {
      filteredChunks = filteredChunks.filter((chunk: any) =>
        chunk.metadata?.issue_type?.includes(filters.issue_type!)
      );
    }
    
    if (filters.date_range?.start || filters.date_range?.end) {
      filteredChunks = filteredChunks.filter((chunk: any) => {
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
        tenantId: orgId || '',
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
      id: chunk.chunk_id,
      documentId: chunk.document_id,
      content: chunk.content,
      metadata: chunk.metadata,
      relevanceScore: 0.7, // Default relevance for keyword search
      index,
    }));

    // 10. Calculate confidence (lower for keyword search vs vector search)
    const confidence = 'medium' as const; // Conservative confidence for keyword search

    // 11. Build prompt using OpenAI
    if (!openaiApiKey) {
      // Return keyword results without AI enhancement
      const latency = Date.now() - startTime;
      await logAiQuery({
        supabase,
        tenantId: orgId || '',
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

    const openaiClient = createOpenAIClient({
      apiKey: openaiApiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    });

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
      tenantId: orgId || '',
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

    return NextResponse.json(response);
  } catch (error) {
    const latency = Date.now() - startTime;

    // Log error
    console.error('AI search error:', error);

    // Validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'AI search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to format sources from chunks
 */
async function formatSources(supabase: any, chunks: any[]): Promise<AiSource[]> {
  return Promise.all(
    chunks.map(async (chunk: any) => {
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
  tenantId,
  userId,
  queryText,
  filters,
  answer,
  sources,
  status,
  latencyMs,
}: {
  supabase: any;
  tenantId: string;
  userId: string;
  queryText: string;
  filters: any;
  answer: string;
  sources: AiSource[];
  status: 'success' | 'error';
  latencyMs: number;
}) {
  try {
    const { error } = await supabase.rpc('log_ai_query', {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_query_text: queryText,
      p_filters: filters,
      p_answer: answer,
      p_sources: sources,
      p_status: status,
      p_latency_ms: latencyMs,
    });

    if (error) {
      console.error('Failed to log AI query:', error);
    }
  } catch (err) {
    console.error('Failed to log AI query:', err);
  }
}
