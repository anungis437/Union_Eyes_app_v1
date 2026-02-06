# @unioneyes/ai

AI package for Union Eyes - RAG search, case summaries, and pattern detection.

## Overview

This package provides responsible AI capabilities for Union Eyes, following strict security and privacy constraints:

- ✅ Server-side only execution (no client-side API calls)
- ✅ Authentication and authorization via Clerk
- ✅ RAG over curated documents (never fabricate sources)
- ✅ Always include citations with confidence scores
- ✅ PII masking before sending to LLMs
- ✅ Human-in-the-loop for all final decisions

## Installation

```bash
pnpm add @unioneyes/ai
```

## Usage

### Types

```typescript
import {
  AiDocument,
  AiChunk,
  AiQuery,
  AiAnswer,
  AiSource,
  SearchRequest,
} from '@unioneyes/ai';
```

### Client (Server-Side Only)

```typescript
import { createOpenAIClient, generateCompletion } from '@unioneyes/ai';

// Initialize client with API key from environment
const client = createOpenAIClient({
  apiKey: process.env.OPENAI_API_KEY!,
  organization: process.env.OPENAI_ORG_ID,
});

// Generate completion
const answer = await generateCompletion(client, prompt);
```

### Prompts

```typescript
import {
  buildSearchPrompt,
  buildSummaryPrompt,
  maskPII,
} from '@unioneyes/ai';

// Build a search prompt with constraints
const prompt = buildSearchPrompt(
  'Show me cases about overtime for part-time workers',
  retrievedChunks,
  { employer: 'Acme Corp' }
);

// Mask PII before sending to LLM
const maskedContent = maskPII(caseContent);
const summaryPrompt = buildSummaryPrompt(maskedContent);
```

## Security Constraints

**CRITICAL:** This package is designed for server-side use only.

- Never import this package in client-side code
- Never expose OpenAI client or API keys to the browser
- All AI endpoints must be protected with Clerk authentication
- All database queries must use Supabase RLS with `organization_id`

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Clean
pnpm clean
```

## License

Private - Union Eyes Internal Use Only
