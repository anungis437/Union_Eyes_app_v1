# Phase 4: Resilience & Observability Implementation

## Overview
This document details the implementation of provider failover, circuit breakers, prompt versioning, and cost allocation for Union Eyes LLM platform.

---

## 1. Circuit Breaker Pattern

### Purpose
Prevent cascading failures when LLM providers experience issues.

### Architecture

```typescript
/**
 * Circuit Breaker for LLM Providers
 * File: lib/ai/services/circuit-breaker.ts
 */

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open',     // Failures detected, blocking requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  timeout: number; // Time in ms before attempting half-open
  monitoringPeriod: number; // Time window for failure counting
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  
  constructor(
    private provider: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      monitoringPeriod: 120000, // 2 minutes
    }
  ) {}
  
  /**
   * Check if request should be allowed
   */
  canAttempt(): boolean {
    const now = Date.now();
    
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
        
      case CircuitState.OPEN:
        // Check if timeout has elapsed
        if (this.nextAttemptTime && now >= this.nextAttemptTime) {
          this.state = CircuitState.HALF_OPEN;
          logger.info('Circuit breaker entering half-open state', { provider: this.provider });
          return true;
        }
        return false;
        
      case CircuitState.HALF_OPEN:
        // Allow one test request
        return true;
    }
  }
  
  /**
   * Record successful request
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      logger.info('Circuit breaker closed after successful test', { provider: this.provider });
    }
    
    // Reset failure count if outside monitoring period
    if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.config.monitoringPeriod) {
      this.failureCount = 0;
    }
  }
  
  /**
   * Record failed request
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Failed recovery attempt
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;
      logger.warn('Circuit breaker reopened after failed test', { provider: this.provider });
      return;
    }
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;
      logger.error('Circuit breaker opened', {
        provider: this.provider,
        failureCount: this.failureCount,
        nextAttemptIn: this.config.timeout,
      });
    }
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    nextAttemptTime?: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}
```

---

## 2. Provider Failover

### Multi-Provider Orchestrator

```typescript
/**
 * Multi-Provider Orchestrator with Automatic Failover
 * File: lib/ai/services/provider-orchestrator.ts
 */

import { CircuitBreaker } from './circuit-breaker';
import { logger } from '@/lib/logger';

export interface ProviderConfig {
  name: string;
  priority: number; // Lower = higher priority
  weight: number; // For load balancing
  apiKey: string;
  baseURL?: string;
}

export class ProviderOrchestrator {
  private circuitBreakers: Map<string, CircuitBreaker>;
  private providers: ProviderConfig[];
  
  constructor(providers: ProviderConfig[]) {
    this.providers = providers.sort((a, b) => a.priority - b.priority);
    this.circuitBreakers = new Map();
    
    for (const provider of providers) {
      this.circuitBreakers.set(provider.name, new CircuitBreaker(provider.name));
    }
  }
  
  /**
   * Execute LLM request with automatic failover
   */
  async executeWithFailover<T>(
    operation: (provider: ProviderConfig) => Promise<T>,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? this.providers.length;
    const retryDelay = options?.retryDelay ?? 1000;
    
    let lastError: Error | undefined;
    let attemptCount = 0;
    
    // Try each provider in order of priority
    for (const provider of this.providers) {
      if (attemptCount >= maxRetries) {
        break;
      }
      
      const breaker = this.circuitBreakers.get(provider.name)!;
      
      // Skip if circuit breaker is open
      if (!breaker.canAttempt()) {
        logger.info('Circuit breaker open, skipping provider', { provider: provider.name });
        continue;
      }
      
      attemptCount++;
      
      try {
        logger.info('Attempting LLM request', {
          provider: provider.name,
          attempt: attemptCount,
          maxRetries,
        });
        
        const result = await operation(provider);
        
        // Success!
        breaker.recordSuccess();
        
        logger.info('LLM request successful', {
          provider: provider.name,
          attempt: attemptCount,
        });
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Record failure in circuit breaker
        breaker.recordFailure();
        
        logger.error('LLM request failed', {
          provider: provider.name,
          attempt: attemptCount,
          error: lastError.message,
        });
        
        // Wait before next retry
        if (attemptCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // All providers failed
    logger.error('All LLM providers failed', {
      attemptCount,
      providers: this.providers.map((p) => p.name),
    });
    
    throw new Error(`All LLM providers failed after ${attemptCount} attempts: ${lastError?.message}`);
  }
  
  /**
   * Get health status of all providers
   */
  getProviderHealth(): Array<{
    name: string;
    state: string;
    failureCount: number;
    available: boolean;
  }> {
    return this.providers.map((provider) => {
      const breaker = this.circuitBreakers.get(provider.name)!;
      const metrics = breaker.getMetrics();
      
      return {
        name: provider.name,
        state: metrics.state,
        failureCount: metrics.failureCount,
        available: breaker.canAttempt(),
      };
    });
  }
}
```

---

## 3. Prompt Versioning

### Database Schema

```sql
-- Prompt version management
CREATE TABLE prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_name TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    system_message TEXT,
    temperature DECIMAL(3, 2),
    max_tokens INTEGER,
    model TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT FALSE,
    ab_test_weight DECIMAL(3, 2), -- For A/B testing (0-1)
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    
    UNIQUE (prompt_name, version),
    CHECK (temperature BETWEEN 0 AND 2),
    CHECK (ab_test_weight IS NULL OR ab_test_weight BETWEEN 0 AND 1),
    CHECK (NOT (is_active AND deactivated_at IS NOT NULL))
);

-- Prompt performance metrics
CREATE TABLE prompt_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_version_id UUID NOT NULL REFERENCES prompt_versions(id),
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_latency_ms INTEGER,
    avg_tokens_used INTEGER,
    avg_cost_usd DECIMAL(10, 6),
    user_feedback_score DECIMAL(3, 2), -- 0-5 star rating
    metadata JSONB DEFAULT '{}',
    measurement_period_start TIMESTAMPTZ NOT NULL,
    measurement_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (success_count + failure_count = execution_count)
);

CREATE INDEX idx_prompt_versions_name ON prompt_versions(prompt_name, version DESC);
CREATE INDEX idx_prompt_versions_active ON prompt_versions(prompt_name) WHERE is_active = TRUE;
CREATE INDEX idx_prompt_performance_version ON prompt_performance(prompt_version_id, measurement_period_start DESC);
```

### Prompt Manager Service

```typescript
/**
 * Prompt Version Manager
 * File: lib/ai/services/prompt-manager.ts
 */

import { db } from '@/db';
import { promptVersions, promptPerformance } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export interface PromptVersion {
  id: string;
  promptName: string;
  version: number;
  content: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  isActive: boolean;
  abTestWeight?: number;
}

export class PromptManager {
  /**
   * Get active prompt version (supports A/B testing)
   */
  async getActivePrompt(promptName: string): Promise<PromptVersion> {
    // Get all active versions for A/B testing
    const activeVersions = await db.query.promptVersions.findMany({
      where: and(
        eq(promptVersions.promptName, promptName),
        eq(promptVersions.isActive, true)
      ),
      orderBy: [desc(promptVersions.version)],
    });
    
    if (activeVersions.length === 0) {
      throw new Error(`No active version found for prompt: ${promptName}`);
    }
    
    // If multiple active versions, use A/B testing weights
    if (activeVersions.length > 1) {
      const random = Math.random();
      let cumulative = 0;
      
      for (const version of activeVersions) {
        cumulative += version.abTestWeight || 0;
        if (random <= cumulative) {
          logger.info('A/B test prompt selected', {
            promptName,
            version: version.version,
            weight: version.abTestWeight,
          });
          return version as PromptVersion;
        }
      }
    }
    
    // Return the highest version (most recent)
    return activeVersions[0] as PromptVersion;
  }
  
  /**
   * Create new prompt version
   */
  async createVersion(
    promptName: string,
    content: string,
    options?: {
      systemMessage?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
      isActive?: boolean;
      abTestWeight?: number;
      createdBy?: string;
    }
  ): Promise<PromptVersion> {
    // Get current highest version
    const latestVersion = await db.query.promptVersions.findFirst({
      where: eq(promptVersions.promptName, promptName),
      orderBy: [desc(promptVersions.version)],
    });
    
    const newVersion = (latestVersion?.version || 0) + 1;
    
    const [created] = await db.insert(promptVersions).values({
      promptName,
      version: newVersion,
      content,
      systemMessage: options?.systemMessage,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      model: options?.model,
      isActive: options?.isActive ?? false,
      abTestWeight: options?.abTestWeight,
      createdBy: options?.createdBy,
      activatedAt: options?.isActive ? new Date() : undefined,
    }).returning();
    
    logger.info('Prompt version created', {
      promptName,
      version: newVersion,
      isActive: options?.isActive,
    });
    
    return created as PromptVersion;
  }
  
  /**
   * Activate specific prompt version
   */
  async activateVersion(
    promptName: string,
    version: number,
    abTestWeight?: number
  ): Promise<void> {
    // If abTestWeight not provided, deactivate all other versions
    if (abTestWeight === undefined) {
      await db.update(promptVersions)
        .set({
          isActive: false,
          deactivatedAt: new Date(),
        })
        .where(eq(promptVersions.promptName, promptName));
    }
    
    // Activate specified version
    await db.update(promptVersions)
      .set({
        isActive: true,
        abTestWeight,
        activatedAt: new Date(),
      })
      .where(and(
        eq(promptVersions.promptName, promptName),
        eq(promptVersions.version, version)
      ));
    
    logger.info('Prompt version activated', {
      promptName,
      version,
      abTestWeight,
    });
  }
  
  /**
   * Record prompt performance metrics
   */
  async recordPerformance(
    promptVersionId: string,
    metrics: {
      success: boolean;
      latencyMs: number;
      tokensUsed: number;
      costUsd: number;
      userFeedbackScore?: number;
    }
  ): Promise<void> {
    // Implementation would update aggregated metrics
    // This is simplified for brevity
    logger.info('Prompt performance recorded', {
      promptVersionId,
      ...metrics,
    });
  }
  
  /**
   * Get performance comparison for A/B test
   */
  async getPerformanceComparison(
    promptName: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    version: number;
    executionCount: number;
    successRate: number;
    avgLatencyMs: number;
    avgCostUsd: number;
    userFeedbackScore: number;
  }>> {
    const query = `
      SELECT 
        pv.version,
        pp.execution_count,
        CASE 
          WHEN pp.execution_count > 0 
          THEN (pp.success_count::DECIMAL / pp.execution_count) 
          ELSE 0 
        END as success_rate,
        pp.avg_latency_ms,
        pp.avg_cost_usd,
        pp.user_feedback_score
      FROM prompt_versions pv
      JOIN prompt_performance pp ON pp.prompt_version_id = pv.id
      WHERE 
        pv.prompt_name = $1
        AND pp.measurement_period_start >= $2
        AND pp.measurement_period_end <= $3
      ORDER BY pv.version DESC;
    `;
    
    const results = await db.execute(query, [promptName, startDate, endDate]);
    
    return results.rows as any[];
  }
}
```

---

## 4. Cost Allocation & Chargebacks

### Per-Organization Billing

```typescript
/**
 * Cost Allocation Service
 * File: lib/ai/services/cost-allocation-service.ts
 */

import { db } from '@/db';
import { aiUsageMetrics, organizations } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface CostAllocation {
  organizationId: string;
  organizationName: string;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  breakdown: {
    completions: {
      requests: number;
      tokens: number;
      costUsd: number;
    };
    embeddings: {
      requests: number;
      tokens: number;
      costUsd: number;
    };
    moderation: {
      requests: number;
      tokens: number;
      costUsd: number;
    };
  };
  totalCostUsd: number;
  chargebackRate: number; // Markup percentage
  totalChargeUsd: number;
}

export class CostAllocationService {
  /**
   * Generate cost allocation report
   */
  async generateAllocationReport(
    startDate: Date,
    endDate: Date,
    chargebackRate: number = 1.2 // 20% markup
  ): Promise<CostAllocation[]> {
    const query = sql`
      SELECT 
        o.id as organization_id,
        o.name as organization_name,
        aum.operation,
        COUNT(*) as request_count,
        SUM(aum.tokens_total) as total_tokens,
        SUM(aum.estimated_cost) as total_cost_usd
      FROM ${aiUsageMetrics} aum
      JOIN ${organizations} o ON o.id = aum.organization_id
      WHERE 
        aum.created_at >= ${startDate}
        AND aum.created_at < ${endDate}
      GROUP BY o.id, o.name, aum.operation
      ORDER BY o.name, aum.operation;
    `;
    
    const results = await db.execute(query);
    
    // Group by organization
    const orgMap = new Map<string, CostAllocation>();
    
    for (const row of results.rows as any[]) {
      if (!orgMap.has(row.organization_id)) {
        orgMap.set(row.organization_id, {
          organizationId: row.organization_id,
          organizationName: row.organization_name,
          billingPeriod: { start: startDate, end: endDate },
          breakdown: {
            completions: { requests: 0, tokens: 0, costUsd: 0 },
            embeddings: { requests: 0, tokens: 0, costUsd: 0 },
            moderation: { requests: 0, tokens: 0, costUsd: 0 },
          },
          totalCostUsd: 0,
          chargebackRate,
          totalChargeUsd: 0,
        });
      }
      
      const allocation = orgMap.get(row.organization_id)!;
      const operation = row.operation as keyof typeof allocation.breakdown;
      
      if (operation in allocation.breakdown) {
        allocation.breakdown[operation] = {
          requests: parseInt(row.request_count),
          tokens: parseInt(row.total_tokens),
          costUsd: parseFloat(row.total_cost_usd),
        };
      }
      
      allocation.totalCostUsd += parseFloat(row.total_cost_usd);
    }
    
    // Calculate chargebacks
    for (const allocation of orgMap.values()) {
      allocation.totalChargeUsd = allocation.totalCostUsd * chargebackRate;
    }
    
    return Array.from(orgMap.values());
  }
  
  /**
   * Export cost allocation as CSV
   */
  async exportToCSV(
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const allocations = await this.generateAllocationReport(startDate, endDate);
    
    const headers = [
      'Organization',
      'Completion Requests',
      'Completion Cost',
      'Embedding Requests',
      'Embedding Cost',
      'Total Cost',
      'Chargeback Amount',
    ];
    
    const rows = allocations.map((a) => [
      a.organizationName,
      a.breakdown.completions.requests,
      `$${a.breakdown.completions.costUsd.toFixed(4)}`,
      a.breakdown.embeddings.requests,
      `$${a.breakdown.embeddings.costUsd.toFixed(4)}`,
      `$${a.totalCostUsd.toFixed(2)}`,
      `$${a.totalChargeUsd.toFixed(2)}`,
    ]);
    
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
```

---

## 5. Deployment Scripts

### Phase 4 Deployment

```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Phase 4: Resilience & Observability
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'production')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "`n🚀 Phase 4 Deployment: Resilience & Observability`n" -ForegroundColor Magenta

# 1. Deploy circuit breakers
Write-Host "1. Deploying circuit breaker infrastructure..." -ForegroundColor Cyan

if (-not $DryRun) {
    # Initialize circuit breaker state in Redis
    $redisUrl = (Get-Content ".env.local" | Select-String "REDIS_URL").ToString().Split("=")[1]
    
    redis-cli -u $redisUrl SET "circuit:openai:state" "closed"
    redis-cli -u $redisUrl SET "circuit:anthropic:state" "closed"
    redis-cli -u $redisUrl SET "circuit:google:state" "closed"
    
    Write-Host "✓ Circuit breakers initialized" -ForegroundColor Green
}

# 2. Deploy prompt versioning schema
Write-Host "2. Deploying prompt versioning schema..." -ForegroundColor Cyan

if (-not $DryRun) {
    pnpm drizzle-kit push
    Write-Host "✓ Prompt versioning schema deployed" -ForegroundColor Green
}

# 3. Migrate existing prompts
Write-Host "3. Migrating existing prompts to versioned system..." -ForegroundColor Cyan

if (-not $DryRun) {
    node scripts/migrate-prompts-to-versions.js
    Write-Host "✓ Prompts migrated" -ForegroundColor Green
}

# 4. Deploy cost allocation service
Write-Host "4. Deploying cost allocation service..." -ForegroundColor Cyan

if (-not $DryRun) {
    pnpm build
    Write-Host "✓ Cost allocation service deployed" -ForegroundColor Green
}

# 5. Run integration tests
Write-Host "5. Running integration tests..." -ForegroundColor Cyan

if (-not $DryRun) {
    pnpm test lib/ai/services/provider-orchestrator.test.ts
    pnpm test lib/ai/services/prompt-manager.test.ts
    pnpm test lib/ai/services/cost-allocation-service.test.ts
    
    Write-Host "✓ All tests passed" -ForegroundColor Green
}

Write-Host "`n✅ Phase 4 deployment complete!`n" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Configure provider priorities in admin panel"
Write-Host "  2. Set up A/B tests for key prompts"
Write-Host "  3. Generate first cost allocation report"
Write-Host "  4. Monitor circuit breaker metrics"

exit 0
```

---

## 6. Monitoring Dashboards

### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "LLM Platform Observability",
    "panels": [
      {
        "title": "Provider Health",
        "type": "stat",
        "targets": [
          {
            "expr": "circuit_breaker_state{provider=\"openai\"}",
            "legendFormat": "OpenAI"
          },
          {
            "expr": "circuit_breaker_state{provider=\"anthropic\"}",
            "legendFormat": "Anthropic"
          }
        ]
      },
      {
        "title": "Request Success Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(llm_requests_total{status=\"success\"}[5m]) / rate(llm_requests_total[5m])",
            "legendFormat": "Success Rate"
          }
        ]
      },
      {
        "title": "Cost by Organization",
        "type": "table",
        "targets": [
          {
            "expr": "sum by (organization) (llm_cost_usd_total)",
            "format": "table"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / rate(cache_requests_total[5m])",
            "legendFormat": "Hit Rate"
          }
        ]
      }
    ]
  }
}
```

---

## Success Criteria

### Phase 4 Complete When:
- ✅ Circuit breakers deployed for all providers
- ✅ Automatic failover tested and working
- ✅ Prompt versioning system operational
- ✅ A/B test running on at least one prompt
- ✅ Cost allocation reports available
- ✅ All monitoring dashboards configured
- ✅ Uptime improved to 99.95%+

---

**Status:** Ready for Implementation  
**Dependencies:** Phases 1-3 complete  
**Est. Duration:** 4 weeks  
**Risk Level:** Medium (requires thorough testing)
