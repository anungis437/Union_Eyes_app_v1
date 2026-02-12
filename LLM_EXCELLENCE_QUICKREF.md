# LLM Excellence Project: Quick Reference

## 🎯 Project Goal
Transform Union Eyes LLM implementation from **A- (88/100)** to **A+ (98/100)** through 4 phased deployments.

---

## 📋 Phase Overview

| Phase | Duration | Key Features | Impact |
|-------|----------|--------------|--------|
| **Phase 1** | 2 weeks | Cost tracking, rate limiting, budgets | 💰 Cost control |
| **Phase 2** | 2 weeks | Redis caching, semantic matching | ⚡ 80% latency reduction |
| **Phase 3** | 3 weeks | PII detection, content moderation | 🛡️ Compliance |
| **Phase 4** | 4 weeks | Failover, circuit breakers, prompt versioning | 🔄 99.95% uptime |

**Total Duration:** 8-12 weeks  
**Expected ROI:** $50k-150k annual savings

---

## 🚀 Quick Start - Phase 1

### Prerequisites
```powershell
# Check Redis
redis-cli PING

# Check database
pnpm db:studio

# Run tests
pnpm test
```

### Deploy Phase 1
```powershell
# Dry run first
.\scripts\deploy-phase1-cost-controls.ps1 -Environment dev -DryRun

# Actual deployment
.\scripts\deploy-phase1-cost-controls.ps1 -Environment dev

# Verify
redis-cli KEYS "ratelimit:*"
```

### Verify Installation
```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('ai_usage_metrics', 'ai_rate_limits', 'ai_budgets');

-- Check budgets configured
SELECT organization_id, monthly_limit_usd, current_spend_usd 
FROM ai_budgets 
LIMIT 10;
```

---

## 📊 Key Metrics to Monitor

### Daily
```bash
# Rate limit violations
SELECT organization_id, COUNT(*) 
FROM audit_logs 
WHERE action = 'rate_limit_exceeded' 
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY organization_id;

# Budget alerts
SELECT * FROM ai_budgets 
WHERE current_spend_usd / monthly_limit_usd >= alert_threshold;
```

### Weekly
```bash
# Cost by organization
SELECT o.name, SUM(aum.estimated_cost) as total_cost
FROM ai_usage_metrics aum
JOIN organizations o ON o.id = aum.organization_id
WHERE aum.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.name
ORDER BY total_cost DESC;

# Cache hit rate (Phase 2+)
redis-cli INFO stats | grep keyspace_hits
```

### Monthly
```bash
# Generate cost allocation report
node scripts/generate-cost-report.js --month 2026-02

# Prompt performance comparison (Phase 4+)
SELECT prompt_name, version, success_rate, avg_cost_usd
FROM prompt_performance
WHERE measurement_period_start >= DATE_TRUNC('month', NOW());
```

---

## 🔧 Common Operations

### Adjust Rate Limits
```typescript
// In database or admin panel
UPDATE ai_budgets 
SET monthly_limit_usd = 2000.00 
WHERE organization_id = 'org-123';
```

### Invalidate Cache (Phase 2+)
```typescript
import { aiCache } from '@/lib/ai/services/redis-cache-service';

// Invalidate all embeddings for a model
await aiCache.invalidateCache('embedding:gpt-4:*');

// Invalidate all responses
await aiCache.invalidateCache('response:*');
```

### Check Circuit Breaker Status (Phase 4+)
```typescript
import { providerOrchestrator } from '@/lib/ai/services/provider-orchestrator';

const health = providerOrchestrator.getProviderHealth();
console.log(health);
// [{ name: 'openai', state: 'closed', available: true }, ...]
```

### Activate New Prompt Version (Phase 4+)
```typescript
import { promptManager } from '@/lib/ai/services/prompt-manager';

// Single active version
await promptManager.activateVersion('union-rights-qa', 3);

// A/B test (50/50 split)
await promptManager.activateVersion('union-rights-qa', 2, 0.5);
await promptManager.activateVersion('union-rights-qa', 3, 0.5);
```

---

## 🐛 Troubleshooting

### Issue: Rate limits too restrictive
```sql
-- Check current limits
SELECT * FROM ai_rate_limits WHERE organization_id = 'org-123';

-- Increase token limit
UPDATE ai_rate_limits 
SET limit_value = 200000 
WHERE organization_id = 'org-123' 
  AND limit_type = 'tokens_per_hour';
```

### Issue: Cache not working (Phase 2+)
```bash
# Check Redis connection
redis-cli -u $REDIS_URL PING

# Check cache stats
redis-cli INFO memory

# Check eviction policy
redis-cli CONFIG GET maxmemory-policy
# Should return: allkeys-lru
```

### Issue: PII detector false positives (Phase 3+)
```typescript
// Adjust confidence threshold
const piiResult = PIIDetector.detect(text);
const highConfidenceMatches = piiResult.matches.filter(m => m.confidence > 0.95);
```

### Issue: Circuit breaker stuck open (Phase 4+)
```bash
# Manually reset circuit breaker
redis-cli SET "circuit:openai:state" "closed"
redis-cli DEL "circuit:openai:failures"
```

---

## 📈 Success Metrics

### Phase 1 Success
- ✅ Zero budget overruns
- ✅ Rate limit violations < 1% of requests
- ✅ All organizations have budgets configured
- ✅ Cost tracking data flowing to database

### Phase 2 Success
- ✅ Cache hit rate > 50% (week 1), > 70% (week 2)
- ✅ P95 latency < 500ms
- ✅ Cost reduction > 40%

### Phase 3 Success
- ✅ PII detection rate > 99%
- ✅ Content moderation flags < 0.1% false positives
- ✅ Zero compliance violations
- ✅ All safety logs auditable

### Phase 4 Success
- ✅ Uptime > 99.95%
- ✅ Automatic failover < 2s
- ✅ Circuit breakers prevent cascading failures
- ✅ Prompt A/B tests running
- ✅ Cost allocation reports automated

---

## 🔐 Security Checklist

- [ ] API keys stored in Key Vault (not .env)
- [ ] Rate limits configured per organization
- [ ] PII detection enabled
- [ ] Content moderation enabled
- [ ] Audit logs enabled
- [ ] Redis password protected
- [ ] Database RLS enabled
- [ ] Budget alerts configured
- [ ] Emergency kill switch documented

---

## 📚 Additional Documentation

- [LLM_EXCELLENCE_ROADMAP.md](./LLM_EXCELLENCE_ROADMAP.md) - Full implementation details
- [LLM_PHASE4_IMPLEMENTATION.md](./LLM_PHASE4_IMPLEMENTATION.md) - Phase 4 specifics
- [packages/ai/QUICKSTART.md](./packages/ai/QUICKSTART.md) - AI package docs
- [packages/ai/OBSERVABILITY.md](./packages/ai/OBSERVABILITY.md) - Langfuse setup

---

## 🆘 Emergency Contacts

### Production Issues
1. Check [status.unioneyes.app](https://status.unioneyes.app)
2. Review Grafana dashboards
3. Check Langfuse traces
4. Examine audit logs

### Rollback Procedure
```powershell
# Restore from backup
.\scripts\rollback-phase.ps1 -Phase 1 -BackupId "backup_20260212_143000"

# Disable feature flag
redis-cli SET "feature:ai_cost_tracking" "false"

# Notify team
.\scripts\notify-rollback.ps1
```

---

**Last Updated:** 2026-02-12  
**Version:** 1.0.0  
**Status:** Ready for Phase 1 Deployment
