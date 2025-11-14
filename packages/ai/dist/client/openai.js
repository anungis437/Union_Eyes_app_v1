import OpenAI from 'openai';
/**
 * Initialize OpenAI client with safety constraints
 */
export function createOpenAIClient(config) {
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
 * Generate chat completion with safety constraints
 */
export async function generateCompletion(client, prompt, options) {
    const response = await client.chat.completions.create({
        model: options?.model || 'gpt-4-turbo-preview',
        messages: [
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: options?.temperature ?? 0.3, // Lower temperature for more consistent legal research
        max_tokens: options?.maxTokens ?? 2000,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No content returned from OpenAI');
    }
    return content;
}
/**
 * Generate embeddings for text chunks
 */
export async function generateEmbedding(client, text, options) {
    const response = await client.embeddings.create({
        model: options?.model || 'text-embedding-ada-002',
        input: text,
    });
    return response.data[0].embedding;
}
/**
 * Generate embeddings for multiple text chunks in batch
 */
export async function generateEmbeddingsBatch(client, texts, options) {
    const batchSize = options?.batchSize ?? 100;
    const embeddings = [];
    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await client.embeddings.create({
            model: options?.model || 'text-embedding-ada-002',
            input: batch,
        });
        embeddings.push(...response.data.map((d) => d.embedding));
    }
    return embeddings;
}
/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a, b) {
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
//# sourceMappingURL=openai.js.map