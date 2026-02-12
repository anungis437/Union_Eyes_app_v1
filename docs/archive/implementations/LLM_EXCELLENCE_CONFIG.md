# LLM Excellence Configuration Template

## Environment Variables

### Required for All Phases

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/unioneyes

# Redis (required for Phase 1+)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-secure-password

# OpenAI (primary provider)
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION=org-...

# Anthropic (secondary provider - Phase 4)
ANTHROPIC_API_KEY=sk-ant-...

# Google AI (tertiary provider - Phase 4)
GOOGLE_AI_API_KEY=...

# Azure OpenAI (alternative - optional)
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://....openai.azure.com/

# Langfuse (observability)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Feature Flags
FEATURE_AI_COST_TRACKING=true
FEATURE_AI_CACHING=true
FEATURE_AI_SAFETY=true
FEATURE_AI_FAILOVER=true
```

---

## Database Configuration

### Default Budgets (Phase 1)

```sql
-- Set default monthly budgets per organization size
UPDATE ai_budgets SET monthly_limit_usd = 
    CASE 
        WHEN (SELECT member_count FROM organizations WHERE id = ai_budgets.organization_id) < 100 
            THEN 500.00
        WHEN (SELECT member_count FROM organizations WHERE id = ai_budgets.organization_id) < 1000 
            THEN 2000.00
        ELSE 5000.00
    END;

-- Set alert thresholds
UPDATE ai_budgets SET alert_threshold = 0.80; -- Alert at 80%

-- Enable hard limits
UPDATE ai_budgets SET hard_limit = true;
```

### Rate Limits (Phase 1)

```typescript
// Default rate limits configuration
export const DEFAULT_RATE_LIMITS = {
  requestsPerMinute: 60,
  tokensPerHour: 100000,
  costPerDayUSD: 100,
};

// Per-organization overrides
export const ORG_RATE_LIMIT_OVERRIDES = {
  'org-large-union': {
    requestsPerMinute: 120,
    tokensPerHour: 250000,
    costPerDayUSD: 500,
  },
  'org-small-local': {
    requestsPerMinute: 30,
    tokensPerHour: 50000,
    costPerDayUSD: 50,
  },
};
```

---

## Redis Configuration (Phase 2)

### Memory Settings

```bash
# Set in redis.conf or via CONFIG SET
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence (optional for cache)
save ""
appendonly no
```

### Cache TTLs

```typescript
export const CACHE_CONFIG = {
  embeddings: {
    ttl: 30 * 24 * 60 * 60, // 30 days
    keyPrefix: 'embedding:',
  },
  responses: {
    ttl: 7 * 24 * 60 * 60, // 7 days
    keyPrefix: 'response:',
    semanticThreshold: 0.95, // 95% similarity
  },
  rateLimit: {
    ttl: 86400, // 1 day
    keyPrefix: 'ratelimit:',
  },
};
```

---

## Safety Configuration (Phase 3)

### PII Detection Settings

```typescript
export const PII_CONFIG = {
  // Confidence thresholds (0-1)
  confidenceThresholds: {
    ssn: 0.90,
    creditCard: 0.98,
    email: 0.99,
    phone: 0.85,
    ipAddress: 0.80,
  },
  
  // Auto-redact above threshold
  autoRedact: true,
  
  // Log all PII detections
  logAllDetections: true,
  
  // Regions to check
  regions: ['US', 'CA'], // US and Canadian formats
};
```

### Content Moderation Settings

```typescript
export const MODERATION_CONFIG = {
  // Use OpenAI moderation API (free)
  enabled: true,
  
  // Block on these categories
  blockCategories: [
    'hate',
    'hate/threatening',
    'harassment/threatening',
    'self-harm/intent',
    'sexual/minors',
    'violence/graphic',
  ],
  
  // Warn on these categories (don't block)
  warnCategories: [
    'harassment',
    'self-harm',
    'sexual',
    'violence',
  ],
  
  // Union-specific filters
  unionFilters: {
    enabled: true,
    blockAntiUnionContent: true,
    blockIntimidation: true,
  },
};
```

---

## Provider Configuration (Phase 4)

### Provider Priority

```typescript
export const PROVIDER_CONFIG = [
  {
    name: 'openai',
    priority: 1, // Highest priority
    weight: 0.7, // 70% of traffic
    apiKey: process.env.OPENAI_API_KEY,
    models: {
      completion: 'gpt-4-turbo-preview',
      embedding: 'text-embedding-3-small',
    },
  },
  {
    name: 'anthropic',
    priority: 2,
    weight: 0.2, // 20% of traffic
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: {
      completion: 'claude-3-sonnet-20240229',
    },
  },
  {
    name: 'google',
    priority: 3,
    weight: 0.1, // 10% of traffic
    apiKey: process.env.GOOGLE_AI_API_KEY,
    models: {
      completion: 'gemini-1.5-pro',
    },
  },
];
```

### Circuit Breaker Settings

```typescript
export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Open after 5 failures
  timeout: 60000, // 1 minute before retry
  monitoringPeriod: 120000, // 2 minute window
  halfOpenMaxAttempts: 1, // Single test request
};
```

### Prompt Versioning

```typescript
export const PROMPT_VERSION_CONFIG = {
  // Enable A/B testing
  abTestingEnabled: true,
  
  // Minimum sample size before declaring winner
  minSampleSize: 1000,
  
  // Auto-promote winning version
  autoPromote: false, // Manual approval recommended
  
  // Metric to optimize
  optimizationMetric: 'user_feedback_score', // or 'cost', 'latency'
};
```

---

## Monitoring & Alerting

### Grafana Dashboards

```yaml
# grafana/dashboards/llm-platform.json
dashboards:
  - uid: llm-overview
    title: LLM Platform Overview
    panels:
      - provider_health
      - request_latency
      - cost_by_organization
      - cache_hit_rate
      - rate_limit_violations
      - pii_detections
      - content_moderation_flags

  - uid: llm-costs
    title: LLM Cost Analysis
    panels:
      - cost_by_model
      - cost_by_operation
      - cost_trend
      - budget_utilization
```

### Alert Rules

```yaml
# prometheus/alerts/llm-alerts.yml
groups:
  - name: llm_platform
    interval: 1m
    rules:
      - alert: HighLLMCost
        expr: rate(llm_cost_usd_total[1h]) > 10
        for: 5m
        annotations:
          summary: "High LLM costs detected"
          
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{state="open"} == 1
        for: 1m
        annotations:
          summary: "Circuit breaker open for {{ $labels.provider }}"
          
      - alert: LowCacheHitRate
        expr: rate(cache_hits_total[5m]) / rate(cache_requests_total[5m]) < 0.5
        for: 10m
        annotations:
          summary: "Cache hit rate below 50%"
          
      - alert: BudgetThresholdReached
        expr: (ai_budget_current_spend / ai_budget_monthly_limit) > 0.8
        for: 5m
        annotations:
          summary: "Organization {{ $labels.organization }} reached 80% budget"
```

---

## Cost Optimization Settings

### Model Selection Strategy

```typescript
export const MODEL_SELECTION = {
  // Use cheaper models for simple queries
  simpleQuery: {
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.3,
  },
  
  // Use better models for complex queries
  complexQuery: {
    model: 'gpt-4-turbo-preview',
    maxTokens: 2000,
    temperature: 0.3,
  },
  
  // Classification threshold
  complexityThreshold: 0.7, // Determined by query length, keywords, etc.
  
  // Embeddings
  embedding: {
    model: 'text-embedding-3-small', // Cheaper than ada-002
  },
};
```

### Caching Strategy

```typescript
export const CACHING_STRATEGY = {
  // Cache embeddings aggressively
  embeddings: {
    enabled: true,
    ttl: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Cache common queries
  responses: {
    enabled: true,
    ttl: 7 * 24 * 60 * 60, // 7 days
    semanticThreshold: 0.95,
    
    // Categories to cache
    cacheCategories: [
      'FAQ', // Frequently asked questions
      'POLICY', // Policy lookups
      'STATUTORY', // Statutory information
    ],
    
    // Don't cache personalized queries
    skipCategories: [
      'PERSONAL', // Personal advice
      'REALTIME', // Real-time data
    ],
  },
};
```

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database backed up
- [ ] Redis configured with persistence (if needed)
- [ ] API keys rotated and secured in Key Vault
- [ ] Rate limits set appropriately
- [ ] Budgets configured for all organizations
- [ ] Monitoring dashboards deployed
- [ ] Alert rules configured
- [ ] Runbook documented

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Rate limiting working
- [ ] Cost tracking recording data
- [ ] Cache hit rate increasing
- [ ] PII detection active
- [ ] Content moderation active
- [ ] Circuit breakers initialized
- [ ] Failover tested
- [ ] Monitoring alerts firing correctly
- [ ] Team trained on new features

---

## Rollback Procedure

If deployment fails:

1. **Immediate Actions**
   ```bash
   # Disable feature flags
   redis-cli SET "feature:ai_cost_tracking" "false"
   redis-cli SET "feature:ai_caching" "false"
   redis-cli SET "feature:ai_safety" "false"
   
   # Restore database from backup
   pg_restore -d unioneyes backup.dump
   ```

2. **Restore Previous Code**
   ```bash
   git revert HEAD
   pnpm build
   pnpm restart
   ```

3. **Verify Rollback**
   ```bash
   pnpm test
   curl http://localhost:3000/health
   ```

4. **Notify Team**
   - Post in Slack #incidents
   - Update status page
   - Document issues encountered

---

**Last Updated:** 2026-02-12  
**Version:** 1.0.0  
**Maintained By:** DevOps Team
