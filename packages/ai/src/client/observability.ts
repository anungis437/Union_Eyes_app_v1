import { Langfuse } from 'langfuse';
import type OpenAI from 'openai';

/**
 * LLM Observability with Langfuse
 * 
 * PRODUCTION FEATURES:
 * - Automatic token and cost tracking
 * - Latency monitoring
 * - Prompt/completion logging
 * - Error tracking
 * - Graceful degradation (fail-open design)
 * 
 * ENVIRONMENT VARIABLES:
 * - LANGFUSE_PUBLIC_KEY: Your Langfuse public key
 * - LANGFUSE_SECRET_KEY: Your Langfuse secret key
 * - LANGFUSE_HOST: (Optional) Custom host, defaults to Langfuse cloud
 * - LANGFUSE_ENABLED: (Optional) Set to "false" to disable, defaults to enabled if keys present
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LangfuseGeneration = any;

let langfuseInstance: Langfuse | null = null;
let observabilityEnabled = false;

/**
 * Initialize Langfuse client
 * Automatically called on first use
 */
function initializeLangfuse(): Langfuse | null {
  try {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const host = process.env.LANGFUSE_HOST;
    const enabled = process.env.LANGFUSE_ENABLED !== 'false';

    if (!enabled) {
      console.info('[Observability] Langfuse explicitly disabled');
      return null;
    }

    if (!publicKey || !secretKey) {
      console.info('[Observability] Langfuse not configured (missing keys), running without observability');
      return null;
    }

    const config: {
      publicKey: string;
      secretKey: string;
      baseUrl?: string;
    } = {
      publicKey,
      secretKey,
    };

    if (host) {
      config.baseUrl = host;
    }

    langfuseInstance = new Langfuse(config);
    observabilityEnabled = true;
    console.info('[Observability] Langfuse initialized successfully');

    return langfuseInstance;
  } catch (error) {
    console.error('[Observability] Failed to initialize Langfuse:', error);
    console.info('[Observability] Continuing without observability (fail-open)');
    return null;
  }
}

/**
 * Get or initialize Langfuse instance
 */
function getLangfuse(): Langfuse | null {
  if (langfuseInstance === null && !observabilityEnabled) {
    return initializeLangfuse();
  }
  return langfuseInstance;
}

/**
 * Check if observability is enabled
 */
export function isObservabilityEnabled(): boolean {
  getLangfuse(); // Ensure initialization
  return observabilityEnabled;
}

/**
 * Wrapper for OpenAI chat completions with observability
 */
export async function observeCompletion(
  client: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParams,
  metadata?: {
    userId?: string;
    sessionId?: string;
    tags?: string[];
    name?: string;
  }
): Promise<OpenAI.Chat.ChatCompletion> {
  const langfuse = getLangfuse();
  const startTime = Date.now();

  // If observability is not enabled, just call OpenAI directly
  if (!langfuse) {
    const response = await client.chat.completions.create(params);
    // Ensure we don't return a stream
    if ('stream' in params && params.stream) {
      throw new Error('Streaming is not supported with observeCompletion');
    }
    return response as OpenAI.Chat.ChatCompletion;
  }

  // Create trace for this completion
  const trace = langfuse.trace({
    name: metadata?.name || 'openai-completion',
    userId: metadata?.userId,
    sessionId: metadata?.sessionId,
    tags: metadata?.tags,
    metadata: {
      model: params.model,
      temperature: params.temperature ?? undefined,
      maxTokens: params.max_tokens ?? undefined,
    },
  });

  let generation: LangfuseGeneration;

  try {
    // Create generation span
    const modelParameters: Record<string, string | number | boolean | string[] | null> = {};
    if (params.temperature !== undefined) modelParameters.temperature = params.temperature;
    if (params.max_tokens !== undefined) modelParameters.maxTokens = params.max_tokens;
    if (params.top_p !== undefined) modelParameters.topP = params.top_p;
    if (params.frequency_penalty !== undefined) modelParameters.frequencyPenalty = params.frequency_penalty;
    if (params.presence_penalty !== undefined) modelParameters.presencePenalty = params.presence_penalty;

    generation = trace.generation({
      name: metadata?.name || 'chat-completion',
      model: params.model,
      modelParameters,
      input: params.messages,
    });

    // Call OpenAI (ensure no streaming)
    const response = await client.chat.completions.create({
      ...params,
      stream: false,
    }) as OpenAI.Chat.ChatCompletion;

    // Calculate metrics
    const latencyMs = Date.now() - startTime;
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;

    // Update generation with response
    generation.end({
      output: response.choices[0]?.message,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      metadata: {
        latencyMs,
        finishReason: response.choices[0]?.finish_reason,
      },
    });

    // Flush to ensure data is sent (non-blocking)
    langfuse.flushAsync();

    return response;
  } catch (error) {
    // Log error to Langfuse
    if (generation) {
      generation.end({
        level: 'ERROR',
        statusMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Flush to ensure error is sent
    langfuse.flushAsync();

    // Re-throw the error
    throw error;
  }
}

/**
 * Wrapper for OpenAI embeddings with observability
 */
export async function observeEmbedding(
  client: OpenAI,
  params: OpenAI.Embeddings.EmbeddingCreateParams,
  metadata?: {
    userId?: string;
    sessionId?: string;
    tags?: string[];
    name?: string;
  }
): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
  const langfuse = getLangfuse();
  const startTime = Date.now();

  // If observability is not enabled, just call OpenAI directly
  if (!langfuse) {
    return await client.embeddings.create(params);
  }

  // Create trace for this embedding
  const trace = langfuse.trace({
    name: metadata?.name || 'openai-embedding',
    userId: metadata?.userId,
    sessionId: metadata?.sessionId,
    tags: metadata?.tags,
    metadata: {
      model: params.model,
      inputType: Array.isArray(params.input) ? 'array' : 'string',
      inputCount: Array.isArray(params.input) ? params.input.length : 1,
    },
  });

  let generation: LangfuseGeneration;

  try {
    // Create generation span
    const modelParameters: Record<string, string | number | boolean | string[] | null> = {};
    if (params.dimensions !== undefined) modelParameters.dimensions = params.dimensions;
    if (params.encoding_format !== undefined) modelParameters.encodingFormat = params.encoding_format;

    generation = trace.generation({
      name: metadata?.name || 'embedding',
      model: params.model,
      modelParameters,
      input: Array.isArray(params.input) 
        ? { texts: params.input.slice(0, 3), count: params.input.length } // Log first 3 for brevity
        : params.input,
    });

    // Call OpenAI
    const response = await client.embeddings.create(params);

    // Calculate metrics
    const latencyMs = Date.now() - startTime;
    const totalTokens = response.usage?.total_tokens || 0;

    // Update generation with response
    generation.end({
      output: { embeddingCount: response.data.length },
      usage: {
        totalTokens,
      },
      metadata: {
        latencyMs,
        embeddingDimensions: response.data[0]?.embedding?.length || 0,
      },
    });

    // Flush to ensure data is sent (non-blocking)
    langfuse.flushAsync();

    return response;
  } catch (error) {
    // Log error to Langfuse
    if (generation) {
      generation.end({
        level: 'ERROR',
        statusMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Flush to ensure error is sent
    langfuse.flushAsync();

    // Re-throw the error
    throw error;
  }
}

/**
 * Create a custom trace for complex AI workflows
 */
export function createTrace(params: {
  name: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const langfuse = getLangfuse();
  
  if (!langfuse) {
    // Return a no-op trace if observability is disabled
    return {
      span: () => ({
        end: () => {},
      }),
      generation: () => ({
        end: () => {},
      }),
      event: () => {},
      end: () => {},
    };
  }

  return langfuse.trace(params);
}

/**
 * Flush all pending observability data
 * Call this before application shutdown to ensure all data is sent
 */
export async function flushObservability(): Promise<void> {
  const langfuse = getLangfuse();
  
  if (langfuse) {
    try {
      await langfuse.flushAsync();
      console.info('[Observability] Successfully flushed all pending data');
    } catch (error) {
      console.error('[Observability] Failed to flush data:', error);
    }
  }
}

/**
 * Shutdown observability and flush all data
 * Call this during graceful shutdown
 */
export async function shutdownObservability(): Promise<void> {
  const langfuse = getLangfuse();
  
  if (langfuse) {
    try {
      await langfuse.shutdownAsync();
      console.info('[Observability] Successfully shut down');
    } catch (error) {
      console.error('[Observability] Error during shutdown:', error);
    }
  }
}
