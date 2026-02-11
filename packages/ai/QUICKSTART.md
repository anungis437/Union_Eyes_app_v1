# 🚀 Quick Start: LLM Observability with Langfuse

## For Developers

Your AI package now has built-in observability. Here's how to use it:

## ⚡ TL;DR

1. Get Langfuse keys from https://cloud.langfuse.com/
2. Add to `.env.local`:
   ```bash
   LANGFUSE_PUBLIC_KEY=pk-lf-...
   LANGFUSE_SECRET_KEY=sk-lf-...
   ```
3. That's it! All AI calls are now tracked ✨

## 🎯 No Code Changes Required

Your existing code already works with observability:

```typescript
import { createOpenAIClient, generateCompletion } from '@unioneyes/ai';

const openai = createOpenAIClient({
  apiKey: process.env.OPENAI_API_KEY!,
});

// This is now automatically tracked! ✨
const answer = await generateCompletion(
  openai,
  'What are union rights in Canada?'
);
```

## 📊 What You Get

When you open https://cloud.langfuse.com/:

- **Real-time traces** of every AI call
- **Token usage** and costs
- **Latency metrics** (P50, P95, P99)
- **Error tracking** with full context
- **Custom dashboards** and analytics

## 🎨 Optional: Enhanced Tracking

Add metadata for better insights:

```typescript
const answer = await generateCompletion(
  openai,
  prompt,
  {
    // Optional metadata
    userId: user.id,
    sessionId: session.id,
    tags: ['user-query', 'labor-law'],
  }
);
```

## 🔍 Check Status

```typescript
import { isObservabilityEnabled } from '@unioneyes/ai';

if (isObservabilityEnabled()) {
  console.log('✅ Observability active');
} else {
  console.log('ℹ️ No observability (add Langfuse keys to enable)');
}
```

## 📚 More Info

- Full docs: `packages/ai/OBSERVABILITY.md`
- Examples: `packages/ai/EXAMPLES.ts`
- Implementation: `LLM_OBSERVABILITY_IMPLEMENTATION.md`

## 🤔 FAQ

**Q: Do I need to change existing code?**  
A: No! Existing code works unchanged. Observability is automatic.

**Q: What if I don't set Langfuse keys?**  
A: Everything works normally, just without observability.

**Q: Does this slow down API calls?**  
A: Minimal (<2ms), and it's non-blocking.

**Q: What if Langfuse is down?**  
A: Your AI keeps working. Observability fails silently.

**Q: Is this free?**  
A: Langfuse has a generous free tier (50k traces/month).

## 🎉 That's It!

You now have production-grade LLM observability. Just add the environment variables and watch your AI calls in the Langfuse dashboard.
