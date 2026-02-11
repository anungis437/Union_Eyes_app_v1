# LLM Observability with Langfuse

This package now includes production-grade observability for all OpenAI API calls using Langfuse.

## Features

- **Automatic tracking** of all OpenAI API calls (chat completions & embeddings)
- **Token usage & cost monitoring**
- **Latency tracking** for performance optimization
- **Error logging** for debugging
- **Graceful degradation** - works without Langfuse configured (fail-open design)

## Setup

### 1. Get Langfuse Credentials

Sign up at [Langfuse Cloud](https://cloud.langfuse.com/) or self-host.

Get your:
- **Public Key**: `pk-lf-...`
- **Secret Key**: `sk-lf-...`

### 2. Add Environment Variables

Add to your `.env.local`:

```bash
# LLM Observability (Optional but recommended for production)
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Optional: For self-hosted Langfuse
# LANGFUSE_HOST=https://your-langfuse-instance.com

# Optional: Explicitly disable (default: enabled if keys present)
# LANGFUSE_ENABLED=false
```

### 3. Use AI Functions (No Code Changes Required!)

All existing AI functions automatically use observability when configured:

```typescript
import { createOpenAIClient, generateCompletion, generateEmbedding } from '@unioneyes/ai';

// Create client
const openai = createOpenAIClient({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Generate completion - automatically tracked! ✨
const response = await generateCompletion(
  openai,
  'Explain union rights in Canada',
  {
    model: 'gpt-4',
    temperature: 0.3,
    // Optional: Add context for better tracking
    userId: 'user-123',
    sessionId: 'session-456',
    tags: ['union-rights', 'canada'],
  }
);

// Generate embeddings - automatically tracked! ✨
const embedding = await generateEmbedding(
  openai,
  'Labor rights documentation',
  {
    userId: 'user-123',
    tags: ['embeddings', 'documentation'],
  }
);
```

## Advanced Usage

### Custom Traces for Complex Workflows

For multi-step AI workflows, create custom traces:

```typescript
import { createTrace, observeCompletion } from '@unioneyes/ai';

async function complexAIWorkflow(userId: string) {
  const trace = createTrace({
    name: 'document-analysis-workflow',
    userId,
    tags: ['document-analysis'],
    metadata: { documentType: 'contract' },
  });

  // Step 1: Extract text
  const extractionSpan = trace.span({ name: 'text-extraction' });
  const extractedText = await extractText();
  extractionSpan.end({ output: { length: extractedText.length } });

  // Step 2: Analyze with AI
  const analysisResult = await observeCompletion(
    openai,
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Analyze: ${extractedText}` }],
    },
    { userId, tags: ['analysis'], name: 'contract-analysis' }
  );

  // Step 3: Complete trace
  trace.end();

  return analysisResult;
}
```

### Check Observability Status

```typescript
import { isObservabilityEnabled } from '@unioneyes/ai';

if (isObservabilityEnabled()) {
  console.log('✅ Langfuse observability is active');
} else {
  console.log('ℹ️ Running without observability (Langfuse not configured)');
}
```

### Graceful Shutdown

Ensure all observability data is flushed before shutdown:

```typescript
import { shutdownObservability } from '@unioneyes/ai';

// In your shutdown handler
process.on('SIGTERM', async () => {
  await shutdownObservability();
  process.exit(0);
});
```

## What Gets Tracked

### For Chat Completions:
- Model used
- Input messages
- Output content
- Token usage (prompt, completion, total)
- Latency (ms)
- Temperature, max tokens, and other parameters
- Errors (if any)

### For Embeddings:
- Model used
- Input text (sample for arrays)
- Number of embeddings generated
- Token usage
- Latency (ms)
- Errors (if any)

## Dashboard & Analytics

Once configured, view your LLM observability dashboard at:
- **Langfuse Cloud**: https://cloud.langfuse.com/
- **Self-hosted**: Your configured `LANGFUSE_HOST`

You'll see:
- 📊 **Real-time metrics**: Token usage, costs, latency
- 🔍 **Trace explorer**: Debug individual AI calls
- 📈 **Analytics**: Usage patterns, error rates
- 💰 **Cost tracking**: Per model, per user, per session
- ⚡ **Performance**: P50/P95/P99 latencies

## Fail-Open Design

The observability layer is designed to **never break your AI features**:

- ✅ If Langfuse is not configured → AI works normally
- ✅ If Langfuse is down → AI works normally (errors logged only)
- ✅ If Langfuse credentials are invalid → AI works normally
- ✅ Network errors → AI continues, observability fails silently

## Best Practices

1. **Always set `userId` and `sessionId`** for better tracking
2. **Use `tags`** to categorize different AI use cases
3. **Review cost analytics** regularly to optimize token usage
4. **Set up alerts** in Langfuse for high latency or error rates
5. **Use custom traces** for multi-step workflows

## Production Checklist

- [ ] Add `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` to production env
- [ ] Verify observability is working in staging first
- [ ] Set up cost alerts in Langfuse dashboard
- [ ] Add `shutdownObservability()` to graceful shutdown handlers
- [ ] Tag different AI use cases for better analytics
- [ ] Monitor latency metrics for performance optimization

## Troubleshooting

### Observability not working?

1. Check environment variables are set correctly
2. Run `isObservabilityEnabled()` to verify initialization
3. Check server logs for observability initialization messages
4. Verify Langfuse API keys have correct permissions

### High latency?

- Langfuse calls are **non-blocking** and shouldn't affect performance
- Check your Langfuse instance health if self-hosted
- Consider adjusting flush intervals if needed

## Support

For issues with:
- **Langfuse**: https://langfuse.com/docs
- **Union Eyes AI Package**: See main README or contact team
