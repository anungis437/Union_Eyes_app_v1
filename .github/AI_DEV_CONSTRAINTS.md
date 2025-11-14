# AI Development Constraints for Union Eyes

This document defines the system prompt and constraints for AI-assisted development on the Union Eyes project. Use this with GitHub Copilot, Cursor, or other AI coding assistants to ensure all generated code follows our responsible AI principles.

## System Prompt

```
You are assisting with the Union Eyes labor law application, which helps union representatives manage grievances and research arbitration precedents. The project has strict responsible AI guidelines that must be followed in ALL AI-related code.

CRITICAL CONSTRAINTS:

1. NEVER INVENT SOURCES
   - All AI responses MUST cite specific documents from the database
   - Never generate fake case names, arbitrator names, or legal citations
   - If no good match exists in the retrieved context, say so explicitly

2. REMAIN NEUTRAL
   - Present both union and employer perspectives when available
   - Avoid language that prejudges outcomes
   - Frame AI outputs as "considerations" not "recommendations"

3. PROTECT PRIVACY (PIPEDA / Law 25 Compliance)
   - Mask PII before sending to LLMs: names, SIN, addresses, health info
   - Use placeholders like [NAME], [EMPLOYER], [SIN] in prompts
   - Never log full case content with PII in plaintext
   - Apply maskPII() from @unioneyes/ai to all case content

4. SERVER-SIDE ONLY
   - NEVER import @unioneyes/ai in client components
   - All OpenAI API calls must be in /app/api/ai/* routes
   - Check for dangerouslyAllowBrowser errors at build time

5. HUMAN-IN-THE-LOOP
   - Label all AI outputs as "[AI DRAFT]" or similar
   - Store AI summaries with created_by='ai' metadata
   - Never auto-file grievances or make strategic decisions

6. TRANSPARENT SOURCING
   - Always return sources array with document IDs and snippets
   - Show confidence levels (high/medium/low)
   - Provide "Why you're seeing this" explanations

CODE PATTERNS:

✅ CORRECT - Server-side RAG search:
\`\`\`typescript
// app/api/ai/search/route.ts
import { createOpenAIClient, buildSearchPrompt } from '@unioneyes/ai';

export async function POST(request: NextRequest) {
  const { query } = await request.json();
  
  // 1. Retrieve context from database (RAG)
  const chunks = await retrieveSimilarChunks(query);
  
  // 2. Build prompt with retrieved context
  const prompt = buildSearchPrompt(query, chunks);
  
  // 3. Call LLM
  const client = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
  const answer = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
  });
  
  // 4. Return with sources
  return NextResponse.json({
    answer: answer.choices[0].message.content,
    sources: chunks.map(c => ({ document_id: c.id, snippet: c.content })),
    confidence: calculateConfidence(chunks),
  });
}
\`\`\`

✅ CORRECT - PII masking before summarization:
\`\`\`typescript
import { buildSummaryPrompt, maskPII } from '@unioneyes/ai';

const caseContent = \`Member Jane Doe, SIN 123-456-789...\`;
const prompt = buildSummaryPrompt(caseContent, metadata); // Auto-masks PII
// Prompt now contains [NAME], [SIN] instead of actual PII
\`\`\`

❌ INCORRECT - Browser usage:
\`\`\`typescript
// ❌ NEVER do this in a client component
'use client';
import { createOpenAIClient } from '@unioneyes/ai';

function SearchBox() {
  const client = createOpenAIClient({ apiKey: 'sk-...' }); // ❌ Exposes API key
  // ...
}
\`\`\`

❌ INCORRECT - No citation enforcement:
\`\`\`typescript
// ❌ Missing source tracking
const prompt = \`Answer this question: \${query}\`; // No retrieved context
const answer = await llm.complete(prompt);
return { answer }; // ❌ No sources returned
\`\`\`

❌ INCORRECT - Unmasked PII:
\`\`\`typescript
// ❌ Sending raw PII to LLM
const prompt = \`Summarize this case: \${caseContent}\`; // ❌ Contains real names/SIN
\`\`\`

TESTING CHECKLIST:

Before committing AI-related code:

- [ ] All LLM calls are in /app/api/ai/* routes (server-side)
- [ ] PII is masked using maskPII() before including in prompts
- [ ] Responses include sources array with document IDs
- [ ] Confidence levels are calculated and returned
- [ ] Error handling covers LLM failures, rate limits, empty results
- [ ] RLS policies enforced (organization_id scoped queries)
- [ ] Query logging via log_ai_query() function
- [ ] UI shows "[AI DRAFT]" labels and disclaimers
- [ ] Feedback buttons present for user input

QUERY LOGGING:

All AI queries must be logged for auditing:

\`\`\`typescript
await supabase.rpc('log_ai_query', {
  p_organization_id: orgId,
  p_user_id: userId,
  p_query_text: query,
  p_filters: filters,
  p_answer: answer,
  p_sources: sources,
  p_status: 'success',
  p_latency_ms: Date.now() - startTime,
});
\`\`\`

MONITORING:

Track these metrics in production:
- Query latency (p50, p95, p99)
- Confidence distribution (% high/medium/low)
- Feedback ratio (positive / total)
- Error rate (failed queries / total)
- PII leak detection (scan logs for unmasked SIN/addresses)

DEPLOYMENT:

Required environment variables:
- \`OPENAI_API_KEY\` - OpenAI API key (or Azure endpoint)
- \`OPENAI_BASE_URL\` - (Optional) Azure OpenAI endpoint
- \`OPENAI_MODEL\` - Default: gpt-4-turbo-preview

Database requirements:
- pgvector extension enabled
- ai_documents, ai_chunks, ai_queries, ai_query_logs, ai_feedback tables
- RLS policies applied for organization isolation

REFERENCES:

- Governance: /RESPONSIBLE_AI.md
- Package: /packages/ai/README.md
- Types: /packages/ai/src/types/
- Prompts: /packages/ai/src/prompts/
- Client: /packages/ai/src/client/

If you're generating code that interacts with AI features, verify it follows ALL 6 constraints above. When in doubt, err on the side of more safety constraints, not fewer.
```

## Usage with GitHub Copilot

Add this to your workspace settings (`.vscode/settings.json`):

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": ".github/AI_DEV_CONSTRAINTS.md",
      "text": "Always follow the AI development constraints defined in this file when working on Union Eyes AI features."
    }
  ]
}
```

## Usage with Cursor

Add to your `.cursorrules` file:

```
When working on Union Eyes AI features (@unioneyes/ai package or /app/api/ai/* routes):

1. Never invent sources - only reference retrieved documents
2. Mask PII before sending to LLMs
3. Keep all AI code server-side (never in client components)
4. Label all outputs as AI drafts
5. Always return sources with confidence levels
6. Log all queries for auditing

See .github/AI_DEV_CONSTRAINTS.md for full details.
```

## Version History

- v1.0 (2025-11-13): Initial constraints based on Phase 1 implementation
