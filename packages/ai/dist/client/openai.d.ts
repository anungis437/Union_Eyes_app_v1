import OpenAI from 'openai';
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
    baseURL?: string;
    dangerouslyAllowBrowser?: false;
}
/**
 * Initialize OpenAI client with safety constraints
 */
export declare function createOpenAIClient(config: OpenAIConfig): OpenAI;
/**
 * Generate chat completion with safety constraints and observability
 */
export declare function generateCompletion(client: OpenAI, prompt: string, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    userId?: string;
    sessionId?: string;
    tags?: string[];
}): Promise<string>;
/**
 * Generate embeddings for text chunks with observability
 */
export declare function generateEmbedding(client: OpenAI, text: string, options?: {
    model?: string;
    userId?: string;
    sessionId?: string;
    tags?: string[];
}): Promise<number[]>;
/**
 * Generate embeddings for multiple text chunks in batch with observability
 */
export declare function generateEmbeddingsBatch(client: OpenAI, texts: string[], options?: {
    model?: string;
    batchSize?: number;
    userId?: string;
    sessionId?: string;
    tags?: string[];
}): Promise<number[][]>;
/**
 * Calculate cosine similarity between two embedding vectors
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
//# sourceMappingURL=openai.d.ts.map