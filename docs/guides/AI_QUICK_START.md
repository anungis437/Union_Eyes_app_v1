# Union Eyes AI - Quick Start Guide

**Status:** ✅ Phase 1 Complete  
**Version:** 1.0  
**Last Updated:** November 13, 2025

## What's Available

Union Eyes now includes responsible AI features for:

1. **Smart Case Search (RAG)** - Search arbitration awards and policies using natural language
2. **Case Summaries** - Generate draft case summaries with human review
3. **Feedback System** - Rate AI responses to improve quality

## For Developers

### Installation

The AI package is already set up in the monorepo:

```bash
cd packages/ai
pnpm install
pnpm build
```

### Usage in API Routes

```typescript
// app/api/ai/example/route.ts
import { 
  createOpenAIClient, 
  buildSearchPrompt,
  AiAnswer 
} from '@unioneyes/ai';

export async function POST(request: NextRequest) {
  // 1. Get OpenAI client (server-side only)
  const client = createOpenAIClient({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 2. Retrieve context from database
  const chunks = await retrieveSimilarChunks(query);

  // 3. Build prompt with safety constraints
  const prompt = buildSearchPrompt(query, chunks);

  // 4. Call LLM
  const completion = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
  });

  // 5. Return with sources
  return NextResponse.json({
    answer: completion.choices[0].message.content,
    sources: chunks,
    confidence: 'high',
  });
}
```

### Important: Never Use in Client Components

```typescript
// ❌ NEVER do this
'use client';
import { createOpenAIClient } from '@unioneyes/ai'; // Error: server-side only!

// ✅ Always use via API routes
'use client';
const response = await fetch('/api/ai/search', {
  method: 'POST',
  body: JSON.stringify({ query }),
});
```

## For Union Representatives

### Using AI Search

1. Navigate to the AI Search page (Beta badge)
2. Enter your query: "What are precedents for unjust dismissal due to tardiness?"
3. Add filters (optional):
   - Employer
   - Arbitrator
   - Issue Type
   - Date Range
4. Click Search
5. Review the AI response with sources
6. Rate the response (👍 or 👎)

### Understanding Results

**Confidence Levels:**
- 🟢 **High** (>80%): Strong matches found
- 🟡 **Medium** (60-80%): Relevant but not exact
- 🔴 **Low** (<60%): Weak matches, use with caution

**Sources:**
- Every response includes document references
- Click "Show Details" to see snippets
- Relevance scores show match quality (e.g., 87%)

### Best Practices

✅ **DO:**
- Use AI for research and ideation
- Verify all citations with primary sources
- Provide feedback to improve results
- Refine queries if results are poor

❌ **DON'T:**
- Use AI outputs without human review
- Make strategic decisions based solely on AI
- Share AI drafts externally without review
- Trust low-confidence responses

## Database Setup

### Prerequisites

- Postgres 14+ with pgvector extension
- Supabase account (or self-hosted)

### Migration

```bash
# Run the AI tables migration
psql -d union_eyes -f database/migrations/019_ai_tables.sql

# Verify tables
psql -d union_eyes -c "\dt ai_*"
```

### Required Tables

- `ai_documents` - Document corpus
- `ai_chunks` - Text chunks with embeddings
- `ai_queries` - Query log
- `ai_query_logs` - Performance metrics
- `ai_feedback` - User feedback

## Environment Variables

Add to your `.env.local`:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Optional: Azure OpenAI
OPENAI_BASE_URL=https://your-resource.openai.azure.com/
OPENAI_MODEL=gpt-4-turbo-preview

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## API Endpoints

### POST /api/ai/search
Search for relevant cases using RAG.

**Request:**
```json
{
  "query": "What are precedents for tardiness dismissal?",
  "filters": {
    "employer": "City of Toronto",
    "arbitrator": "John Smith",
    "date_range": {
      "start": "2020-01-01",
      "end": "2023-12-31"
    }
  },
  "max_sources": 5
}
```

**Response:**
```json
{
  "answer": "Based on the retrieved cases...",
  "sources": [
    {
      "document_id": "uuid",
      "chunk_id": "uuid",
      "title": "Case #2023-45",
      "snippet": "The arbitrator found...",
      "relevance_score": 0.87,
      "citation": "2023 CanLII 12345"
    }
  ],
  "confidence": "high"
}
```

### POST /api/ai/feedback
Submit feedback on an AI response.

**Request:**
```json
{
  "query_id": "uuid",
  "rating": "good",
  "comment": "Very helpful for my case"
}
```

### POST /api/ai/summarize
Generate case summary.

**Request:**
```json
{
  "claim_id": "uuid",
  "purpose": "internal"
}
```

**Response:**
```json
{
  "summary_id": "uuid",
  "summary_text": "[AI DRAFT]\n\n## Facts\n...",
  "validation": {
    "valid": true,
    "missingSections": []
  },
  "warning": "This is an AI-generated draft. Human review required."
}
```

## UI Components

### AiSearchPanel

```tsx
import { AiSearchPanel } from '@/src/components/ai/AiSearchPanel';

export default function ResearchPage() {
  return (
    <div>
      <h1>AI Research</h1>
      <AiSearchPanel 
        onSearchComplete={(answer) => {
          console.log('Search complete:', answer);
        }}
      />
    </div>
  );
}
```

### AiAnswerCard

```tsx
import { AiAnswerCard } from '@/src/components/ai/AiSearchPanel';

<AiAnswerCard 
  answer={answer} 
  queryId="uuid-from-api" 
/>
```

## Testing

### Unit Tests

```bash
cd packages/ai
pnpm test
```

### Integration Tests

```bash
# Test search endpoint
curl -X POST http://localhost:3000/api/ai/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "max_sources": 5}'
```

### PII Masking Test

```typescript
import { maskPII, detectUnmaskedPII } from '@unioneyes/ai';

const text = 'Member John Doe, SIN 123-456-789';
const masked = maskPII(text);
// Result: 'Member [NAME], SIN [SIN]'

const detected = detectUnmaskedPII(masked);
// Result: [] (no unmasked PII)
```

## Monitoring

### Key Metrics

Track in production:
- Query latency (P95 <3s)
- Confidence distribution
- Feedback ratio (>70% positive)
- Error rate (<5%)

### Alerts

Set up alerts for:
- PII leaks (unmasked SIN/addresses in logs)
- High error rates
- Slow queries (>5s)
- Negative feedback spikes

### Dashboards

Use Supabase views:
- `ai_usage_by_org` - Usage statistics
- `ai_feedback_summary` - Feedback analytics

```sql
-- Example: Query success rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM ai_queries
WHERE created_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### "Cannot find module '@unioneyes/ai'"

```bash
cd packages/ai
pnpm build
```

### "OpenAI client must NOT run in browser"

You're trying to import AI functions in a client component. Move to API route.

### "No relevant cases found"

- Check if documents are ingested
- Try broader search terms
- Remove strict filters
- Check embedding quality

### "PII detected in output"

This should never happen. If it does:
1. Report to security team immediately
2. Check maskPII() is being called
3. Review prompt templates
4. Audit query logs

## Security Checklist

Before deploying:
- [ ] OPENAI_API_KEY is in Key Vault (not .env)
- [ ] RLS policies tested
- [ ] PII masking validated
- [ ] Rate limiting configured
- [ ] Error messages don't leak data
- [ ] CORS configured correctly

## Support

- **Documentation:** `RESPONSIBLE_AI.md`
- **Implementation Guide:** `AI_IMPLEMENTATION_SUMMARY.md`
- **Dev Constraints:** `.github/AI_DEV_CONSTRAINTS.md`
- **Package Docs:** `packages/ai/README.md`

## License

Union Eyes AI features follow the same license as the main project.

## Changelog

### v1.0 (November 13, 2025)
- ✅ Phase 1 complete
- ✅ RAG search implemented
- ✅ Case summaries implemented
- ✅ Feedback system implemented
- ✅ PII masking active
- ✅ RLS policies enforced
