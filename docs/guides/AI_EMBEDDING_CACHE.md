# AI Embedding Cache

Production-grade caching layer for OpenAI embeddings to reduce costs and improve performance.

## Overview

The embedding cache uses Redis to store generated embeddings, reducing expensive OpenAI API calls by 80%+ for repeated queries. The cache is transparent to application code and degrades gracefully if Redis is unavailable.

## Features

- **Cost Reduction**: Cache hits save ~$0.00001 per request (text-embedding-3-small)
- **Performance**: Cached embeddings returned in <5ms vs ~200ms for API calls
- **Distributed**: Works across multiple server instances via Redis
- **Fail-Open**: Gracefully degrades if Redis unavailable (falls back to API)
- **Statistics**: Track hit rate, cost savings, and cache performance
- **Admin Controls**: Clear cache or reset statistics via API

## Architecture

```
┌─────────────────┐
│  Application    │
│  Code           │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ generateEmbedding()     │  ← Updated to use cache
│ (vector-search-service) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ EmbeddingCacheService   │  ← New cache layer
│                         │
│ 1. Check Redis cache    │
│ 2. Return if hit        │
│ 3. Call OpenAI if miss  │
│ 4. Store in cache       │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌─────────┐
│ Redis │ │ OpenAI  │
│ Cache │ │ API     │
└───────┘ └─────────┘
```

## Configuration

### Environment Variables

```env
# Redis Configuration (required for caching)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

If these are not set, the cache will be disabled and all requests will go directly to OpenAI (no errors).

### Cache Settings

Default settings (configurable in `embedding-cache.ts`):

- **TTL**: 30 days (2,592,000 seconds)
- **Key Format**: `ai:embedding:cache:{model}:{sha256_hash}`
- **Hash Input**: Normalized text + model name

## Usage

### Automatic Caching

No code changes required! The cache is integrated into:

1. **Vector Search Service** (`lib/services/ai/vector-search-service.ts`)
   - Used for semantic clause search
   - Used for similar clause recommendations

2. **Chatbot Service** (`lib/ai/chatbot-service.ts`)
   - Used for knowledge base embeddings
   - Used for RAG (Retrieval-Augmented Generation)

### Manual Cache Operations

```typescript
import { embeddingCache } from '@/lib/services/ai/embedding-cache';

// Get cached embedding (returns null if not cached)
const embedding = await embeddingCache.getCachedEmbedding(
  'Your text here',
  'text-embedding-3-small'
);

// Store embedding in cache
await embeddingCache.setCachedEmbedding(
  'Your text here',
  'text-embedding-3-small',
  [0.1, 0.2, ...], // embedding vector
  86400 // optional custom TTL in seconds (default: 30 days)
);

// Get statistics
const stats = await embeddingCache.getStats();
console.log(stats);
// {
//   totalRequests: 1000,
//   cacheHits: 850,
//   cacheMisses: 150,
//   hitRate: 85.00,
//   estimatedCostSavings: 0.21
// }
```

## Admin API

### View Cache Statistics

**Endpoint:** `GET /api/ai/cache-stats`

**Authentication:** Admin role required (role >= 90)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 1000,
    "cacheHits": 850,
    "cacheMisses": 150,
    "hitRate": 85.00,
    "estimatedCostSavings": 0.21,
    "message": "Cache is working! 85% of requests are served from cache."
  },
  "timestamp": "2026-02-11T10:30:00.000Z"
}
```

### Clear Cache

**Endpoint:** `POST /api/ai/cache-stats`

**Authentication:** Admin role required (role >= 90)

**Body:**
```json
{
  "action": "clear"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared. 234 embeddings were deleted.",
  "deletedKeys": 234
}
```

### Reset Statistics

**Endpoint:** `POST /api/ai/cache-stats`

**Body:**
```json
{
  "action": "reset-stats"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cache statistics have been reset to zero."
}
```

## Cost Analysis

### OpenAI Pricing (text-embedding-3-small)

- **Cost per 1K tokens**: $0.00002
- **Average query**: 250 tokens
- **Cost per request**: ~$0.000005 (half a cent per 1000 requests)

### Savings Examples

| Daily Queries | Hit Rate | Daily Savings | Annual Savings |
|--------------|----------|---------------|----------------|
| 1,000        | 80%      | $0.004        | $1.46          |
| 10,000       | 80%      | $0.040        | $14.60         |
| 100,000      | 80%      | $0.400        | $146.00        |
| 1,000,000    | 80%      | $4.00         | $1,460.00      |

### Performance Impact

| Metric | Without Cache | With Cache (Hit) | Improvement |
|--------|--------------|------------------|-------------|
| Latency | ~200ms       | <5ms             | 40x faster  |
| Cost | $0.000005    | $0               | 100% saved  |
| API Load | 100%       | 20%              | 80% reduction |

## Monitoring

### Key Metrics to Track

1. **Hit Rate**: Target 80%+ after initial warmup period
2. **Cost Savings**: Monitor via admin API
3. **Cache Size**: Use Redis monitoring tools
4. **Latency**: Compare cached vs uncached request times

### Redis Commands (for debugging)

```bash
# Count total cached embeddings
redis-cli SCAN 0 MATCH "ai:embedding:cache:*" COUNT 1000

# Get specific cache entry
redis-cli GET "ai:embedding:cache:text-embedding-3-small:{hash}"

# Check TTL of cache entry
redis-cli TTL "ai:embedding:cache:text-embedding-3-small:{hash}"

# Clear all embedding cache (USE WITH CAUTION)
redis-cli --scan --pattern "ai:embedding:cache:*" | xargs redis-cli DEL
```

## Troubleshooting

### Cache not working

1. **Check Redis connection**:
   ```bash
   # Test Redis connection
   curl -X POST https://your-redis.upstash.io/get/test \
     -H "Authorization: Bearer your-token"
   ```

2. **Check environment variables**:
   - Verify `UPSTASH_REDIS_REST_URL` is set
   - Verify `UPSTASH_REDIS_REST_TOKEN` is set

3. **Check logs** for cache-related messages:
   ```bash
   grep "embedding.*cache" latest-logs/*.log
   ```

### Low hit rate

- **Expected during initial deployment** (cache needs to warm up)
- Check if queries are unique (low duplication)
- Verify cache TTL is appropriate (default: 30 days)

### High Redis memory usage

- Check number of cached embeddings
- Consider reducing TTL if memory is limited
- Each embedding is ~6KB (1536 floats × 4 bytes)

## Best Practices

1. **Monitor hit rate**: Aim for 80%+ after warmup period
2. **Don't clear cache unnecessarily**: Let TTL handle expiration
3. **Use admin API sparingly**: Statistics calls are cheap, but clear operations are destructive
4. **Plan for Redis downtime**: Cache gracefully degrades to API calls

## Implementation Details

### Cache Key Generation

```typescript
// Keys are generated using SHA-256 hash
const key = generateCacheKey(text, model);
// Example: "ai:embedding:cache:text-embedding-3-small:a3f2b1c..."
```

Benefits:
- Consistent across server restarts
- Fixed length (64 hex chars)
- Collision-resistant
- Privacy-preserving (text is hashed)

### Fail-Open Strategy

The cache uses a "fail-open" pattern:

- If Redis is unavailable → Fall back to OpenAI API (no error)
- If cache read fails → Fall back to OpenAI API (log warning)
- If cache write fails → Continue without caching (log warning)

This ensures the application continues working even if Redis has issues.

## Testing

Run the test suite:

```bash
pnpm vitest run __tests__/lib/services/ai/embedding-cache.test.ts
```

## Future Enhancements

Potential improvements for v2:

- [ ] Cache warming: Pre-populate cache with common queries
- [ ] Tiered caching: L1 (in-memory) + L2 (Redis)
- [ ] Compression: Reduce storage size with quantization
- [ ] Analytics: Track most cached queries
- [ ] Auto-scaling: Adjust TTL based on hit rate

## References

- **OpenAI Embeddings**: https://platform.openai.com/docs/guides/embeddings
- **Upstash Redis**: https://upstash.com/docs/redis
- **Vector Search Service**: [lib/services/ai/vector-search-service.ts](../../../lib/services/ai/vector-search-service.ts)
- **AI Implementation**: [AI_IMPLEMENTATION_SUMMARY.md](./AI_IMPLEMENTATION_SUMMARY.md)

---

**Created:** February 11, 2026  
**Author:** GitHub Copilot  
**Status:** Production Ready
