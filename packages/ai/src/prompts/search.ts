import { buildSystemConstraints } from './constraints';

/**
 * Search prompt template for RAG-based case search
 */
export function buildSearchPrompt(
  query: string,
  retrievedChunks: Array<{ content: string; metadata: Record<string, unknown> }>,
  filters?: Record<string, unknown>
): string {
  const context = retrievedChunks
    .map((chunk, idx) => {
      const meta = chunk.metadata;
      return `
[Document ${idx + 1}]
Title: ${meta.title || 'Unknown'}
Case ID: ${meta.case_id || 'N/A'}
Source: ${meta.source_type || 'Unknown'}
Content: ${chunk.content}
---`;
    })
    .join('\n');

  const appliedFilters = filters
    ? `\nFILTERS APPLIED: ${JSON.stringify(filters, null, 2)}`
    : '';

  return `
You are an assistant for union representatives researching labor arbitration cases.

${buildSystemConstraints()}

CONTEXT (Retrieved Documents):
${context}

USER QUERY:
${query}
${appliedFilters}

RESPONSE FORMAT:
1. **Brief Answer** (2-3 sentences summarizing the key findings)
2. **Supporting Evidence** (cite specific documents with case IDs and relevance to the query)
3. **Source List** (numbered list of documents referenced, with case ID, title, and relevance score)

If no high-confidence match exists, respond with:
"I don't have enough information to answer this confidently. The documents provided don't contain clear precedents for this specific query. Please try refining your search with different keywords or filters."

Generate your response now.
`.trim();
}

/**
 * Determine confidence level based on retrieval scores
 */
export function calculateConfidence(
  retrievalScores: number[]
): 'high' | 'medium' | 'low' {
  if (retrievalScores.length === 0) return 'low';
  
  const avgScore = retrievalScores.reduce((a, b) => a + b, 0) / retrievalScores.length;
  const maxScore = Math.max(...retrievalScores);
  
  if (maxScore >= 0.8 && avgScore >= 0.6) return 'high';
  if (maxScore >= 0.6 && avgScore >= 0.4) return 'medium';
  return 'low';
}

/**
 * Build a template response for when no good matches are found
 */
export function buildNoMatchResponse(query: string): string {
  return `I don't have enough information to answer "${query}" confidently. The documents in the system don't contain clear precedents for this specific query. 

**Suggestions:**
- Try different keywords or search terms
- Adjust your filters (employer, arbitrator, date range)
- Contact a senior representative for manual research assistance

**Note:** This is an AI search assistant. It can only reference documents that have been uploaded to Union Eyes. If the case law or precedent you're looking for hasn't been added to the system yet, it won't appear in results.`;
}
