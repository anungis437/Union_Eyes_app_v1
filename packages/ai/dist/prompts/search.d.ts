/**
 * Search prompt template for RAG-based case search
 */
export declare function buildSearchPrompt(query: string, retrievedChunks: Array<{
    content: string;
    metadata: Record<string, unknown>;
}>, filters?: Record<string, unknown>): string;
/**
 * Determine confidence level based on retrieval scores
 */
export declare function calculateConfidence(retrievalScores: number[]): 'high' | 'medium' | 'low';
/**
 * Build a template response for when no good matches are found
 */
export declare function buildNoMatchResponse(query: string): string;
//# sourceMappingURL=search.d.ts.map