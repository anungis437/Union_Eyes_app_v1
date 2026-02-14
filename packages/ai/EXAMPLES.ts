/**
 * Example: Using LLM Observability in Union Eyes
 * 
 * This example shows how to use the AI package with Langfuse observability.
 * All existing code continues to work - observability is opt-in via environment variables.
 */

import { 
  createOpenAIClient, 
  generateCompletion, 
  generateEmbedding,
  generateEmbeddingsBatch,
  isObservabilityEnabled,
  createTrace,
  flushObservability,
  shutdownObservability
} from '@unioneyes/ai';

// ============================================================================
// BASIC USAGE - Works with or without Langfuse configured
// ============================================================================

async function basicExample() {
  // Create OpenAI client (same as before)
  const openai = createOpenAIClient({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Generate completion - automatically tracked if Langfuse is configured! ✨
  const answer = await generateCompletion(
    openai,
    'What are the main benefits of union membership in Canada?',
    {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 500,
      // Optional: Add metadata for better tracking
      userId: 'user-123',
      sessionId: 'session-abc',
      tags: ['union-benefits', 'canada'],
    }
  );

  logger.info(answer);
}

// ============================================================================
// EMBEDDINGS EXAMPLE
// ============================================================================

async function embeddingsExample() {
  const openai = createOpenAIClient({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Single embedding - automatically tracked! ✨
  const embedding = await generateEmbedding(
    openai,
    'Labor rights documentation for manufacturing workers',
    {
      model: 'text-embedding-ada-002',
      userId: 'system',
      tags: ['embeddings', 'labor-rights'],
    }
  );

  logger.info('Embedding dimensions:', embedding.length);

  // Batch embeddings - each batch automatically tracked! ✨
  const documents = [
    'Union collective bargaining agreement',
    'Worker safety regulations',
    'Wage and hour laws',
  ];

  const embeddings = await generateEmbeddingsBatch(
    openai,
    documents,
    {
      userId: 'system',
      tags: ['batch-embeddings', 'legal-docs'],
      batchSize: 100,
    }
  );

  return embeddings;
}

// ============================================================================
// ADVANCED: CUSTOM TRACES FOR MULTI-STEP WORKFLOWS
// ============================================================================

async function documentAnalysisWorkflow(
  userId: string,
  documentText: string
) {
  const openai = createOpenAIClient({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Create a custom trace for this entire workflow
  const trace = createTrace({
    name: 'document-analysis-workflow',
    userId,
    tags: ['document-analysis', 'contract-review'],
    metadata: { documentLength: documentText.length },
  });

  // Step 1: Summarize document
  const summarySpan = trace.span({ 
    name: 'document-summary',
    input: { length: documentText.length },
  });

  const summary = await generateCompletion(
    openai,
    `Summarize this labor contract:\n\n${documentText}`,
    {
      model: 'gpt-4',
      userId,
      tags: ['summary'],
    }
  );

  summarySpan.end({ output: { summary } });

  // Step 2: Extract key terms
  const extractionSpan = trace.span({ name: 'term-extraction' });

  const keyTerms = await generateCompletion(
    openai,
    `Extract key terms and obligations from:\n\n${summary}`,
    {
      model: 'gpt-4',
      userId,
      tags: ['extraction'],
    }
  );

  extractionSpan.end({ output: { keyTerms } });

  // Step 3: Risk assessment
  const riskSpan = trace.span({ name: 'risk-assessment' });

  const risks = await generateCompletion(
    openai,
    `Identify potential risks in these terms:\n\n${keyTerms}`,
    {
      model: 'gpt-4',
      userId,
      tags: ['risk-assessment'],
    }
  );

  riskSpan.end({ output: { risks } });

  // Complete the trace (only if it's a real Langfuse trace)
  if ('end' in trace && typeof trace.end === 'function') {
    trace.end();
  }

  return { summary, keyTerms, risks };
}

// ============================================================================
// SERVER INITIALIZATION - Check observability status
// ============================================================================

export function initializeAIWithObservability() {
  if (isObservabilityEnabled()) {
    logger.info('✅ LLM Observability is ENABLED');
    logger.info('📊 Tracking all OpenAI API calls with Langfuse');
  } else {
    logger.info('ℹ️ LLM Observability is DISABLED');
    logger.info('💡 Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to enable');
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN - Ensure all observability data is sent
// ============================================================================

export async function gracefulShutdown() {
  logger.info('🔄 Flushing observability data...');
  await flushObservability();
  
  logger.info('🛑 Shutting down observability...');
  await shutdownObservability();
  
  logger.info('✅ Graceful shutdown complete');
}

// Register shutdown handlers
if (process.env.NODE_ENV === 'production') {
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// ============================================================================
// RAG SEARCH EXAMPLE - Real Union Eyes use case
// ============================================================================

async function ragSearchExample(
  userId: string,
  query: string,
  relevantDocs: string[]
) {
  const openai = createOpenAIClient({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Create trace for this RAG search
  const trace = createTrace({
    name: 'rag-search',
    userId,
    tags: ['rag', 'search'],
    metadata: { query, docCount: relevantDocs.length },
  });

  // Step 1: Generate query embedding
  const queryEmbeddingSpan = trace.span({ name: 'query-embedding' });
  
  const queryEmbedding = await generateEmbedding(
    openai,
    query,
    { userId, tags: ['query-embedding'] }
  );
  
  queryEmbeddingSpan.end({ output: { dimensions: queryEmbedding.length } });

  // Step 2: Generate answer from relevant docs
  const context = relevantDocs.join('\n\n');
  
  // Get trace ID if available (for linking)
  const traceId = ('id' in trace) ? (trace.id as string) : undefined;
  
  const answer = await generateCompletion(
    openai,
    `Based on these union documents:\n\n${context}\n\nAnswer: ${query}`,
    {
      model: 'gpt-4',
      userId,
      sessionId: traceId,
      tags: ['rag-answer'],
    }
  );

  // Complete the trace (only if it's a real Langfuse trace)
  if ('end' in trace && typeof trace.end === 'function') {
    trace.end();
  }

  return answer;
}

// ============================================================================
// EXPORT ALL EXAMPLES
// ============================================================================

export {
  basicExample,
  embeddingsExample,
  documentAnalysisWorkflow,
  ragSearchExample,
};
