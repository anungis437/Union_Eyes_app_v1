import OpenAI from 'openai';
import { observeCompletion, observeEmbedding } from './observability';

/**
 * OpenAI client wrapper for Union Eyes
 * 
 * SECURITY CONSTRAINTS:
 * - API key must come from environment variable or Azure Key Vault
 * - Never expose client or API key to frontend
 * - All calls must be server-side only
 * - Set organization ID for proper usage tracking
 * 
 * OBSERVABILITY:
 * - Automatically tracks all OpenAI API calls with Langfuse when configured
 * - Gracefully degrades if Langfuse is not available
 */

export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string; // For Azure OpenAI
  dangerouslyAllowBrowser?: false; // Always false for security
}

/**
 * Initialize OpenAI client with safety constraints
 */
export function createOpenAIClient(config: OpenAIConfig): OpenAI {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  // Ensure browser usage is explicitly disabled
  if (config.dangerouslyAllowBrowser) {
    throw new Error('Browser usage of OpenAI client is not allowed for security reasons');
  }
  
  return new OpenAI({
    apiKey: config.apiKey,
    organization: config.organization,
    baseURL: config.baseURL,
    dangerouslyAllowBrowser: false,
  });
}

/**
 * Generate chat completion with safety constraints and observability
 */
export async function generateCompletion(
  client: OpenAI,
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    userId?: string;
    sessionId?: string;
    tags?: string[];
  }
): Promise<string> {
  const response = await observeCompletion(
    client,
    {
      model: options?.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options?.temperature ?? 0.3, // Lower temperature for more consistent legal research
      max_tokens: options?.maxTokens ?? 2000,
    },
    {
      userId: options?.userId,
      sessionId: options?.sessionId,
      tags: options?.tags,
      name: 'union-eyes-completion',
    }
  );
  
  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content returned from OpenAI');
  }
  
  return content;
}

/**
 * Generate embeddings for text chunks with observability
 */
export async function generateEmbedding(
  client: OpenAI,
  text: string,
  options?: {
    model?: string;
    userId?: string;
    sessionId?: string;
    tags?: string[];
  }
): Promise<number[]> {
  const response = await observeEmbedding(
    client,
    {
      model: options?.model || 'text-embedding-ada-002',
      input: text,
    },
    {
      userId: options?.userId,
      sessionId: options?.sessionId,
      tags: options?.tags,
      name: 'union-eyes-embedding',
    }
  );
  
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple text chunks in batch with observability
 */
export async function generateEmbeddingsBatch(
  client: OpenAI,
  texts: string[],
  options?: {
    model?: string;
    batchSize?: number;
    userId?: string;
    sessionId?: string;
    tags?: string[];
  }
): Promise<number[][]> {
  const batchSize = options?.batchSize ?? 100;
  const embeddings: number[][] = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await observeEmbedding(
      client,
      {
        model: options?.model || 'text-embedding-ada-002',
        input: batch,
      },
      {
        userId: options?.userId,
        sessionId: options?.sessionId,
        tags: [...(options?.tags || []), `batch-${Math.floor(i / batchSize) + 1}`],
        name: 'union-eyes-embedding-batch',
      }
    );
    
    embeddings.push(...response.data.map((d: { embedding: number[] }) => d.embedding));
  }
  
  return embeddings;
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}
