# Distributed Tracing Quick Reference

## Installation

```bash
pnpm add -w @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

## Basic Usage

### 1. Trace an Async Function

```typescript
import { traced, TraceAttributes } from '@/lib/tracing';

async function processClaim(claimId: string) {
  return await traced('process-claim', async (span) => {
    span.setAttribute(TraceAttributes.CLAIM_ID, claimId);
    
    // Your logic here
    const result = await doWork();
    
    return result;
  });
}
```

### 2. Add Trace Context to Logs

```typescript
import { logger } from '@/lib/logger';
import { getTraceContext } from '@/lib/tracing';

logger.info('Processing payment', {
  paymentId,
  ...getTraceContext() // Adds trace_id and span_id
});
```

### 3. Manual Span

```typescript
import { startSpan, SpanStatusCode } from '@/lib/tracing';

const span = startSpan('operation-name', {
  'attribute.key': 'value'
});

try {
  await doWork();
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
} finally {
  span.end();
}
```

### 4. Add Events

```typescript
import { addSpanEvent } from '@/lib/tracing';

addSpanEvent('payment-approved', {
  'approval.amount': 5000,
  'approval.level': 'manager'
});
```

## Environment Variables

```bash
OTEL_ENABLED=true
OTEL_SERVICE_NAME=unioneyes
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY
OTEL_TRACES_SAMPLER=parentbased_always_on
```

## Standard Attributes

Use `TraceAttributes` for consistency:

```typescript
import { TraceAttributes } from '@/lib/tracing';

span.setAttribute(TraceAttributes.USER_ID, userId);
span.setAttribute(TraceAttributes.CLAIM_ID, claimId);
span.setAttribute(TraceAttributes.PAYMENT_AMOUNT, 5000);
span.setAttribute(TraceAttributes.DB_TABLE, 'claims');
span.setAttribute(TraceAttributes.HTTP_METHOD, 'POST');
span.setAttribute(TraceAttributes.OPERATION_SUCCESS, true);
```

## Best Practices

1. **Always add trace context to logs** for correlation
2. **Use standard attributes** (TraceAttributes) for consistency
3. **Trace critical paths**: Claims, Payments, Documents, Tax calculations
4. **Add business context**: IDs, amounts, types, statuses
5. **Don't over-trace**: Skip health checks, static assets, debug endpoints
6. **Sample in production**: Use `traceidratio` sampler if too much data

## Troubleshooting

### No traces appearing?
- Check OTEL_ENABLED=true
- Verify OTEL_EXPORTER_OTLP_ENDPOINT
- Check API key in OTEL_EXPORTER_OTLP_HEADERS
- Look for initialization message in logs

### Too much data?
```bash
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling
```

### Package not found errors?
Packages are lazy-loaded. Make sure they're installed:
```bash
pnpm add -w @opentelemetry/api @opentelemetry/sdk-node
```

## Full Documentation

See [P1_IMPLEMENTATION_COMPLETE.md](./P1_IMPLEMENTATION_COMPLETE.md) for complete guide.
