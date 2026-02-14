# OpenTelemetry Quick Start Guide 🚀

**Get distributed tracing up and running in 5 minutes**

## Prerequisites

✅ OpenTelemetry packages installed (already done via `pnpm add -D`)  
✅ Configuration added to `.env.local` (already done)  
✅ TypeScript tracing infrastructure in place (already done)

## Step 1: Sign Up for Honeycomb (2 minutes) 🍯

Honeycomb is recommended for its excellent free tier and easy setup:

1. **Create Account**: Go to https://ui.honeycomb.io/signup
   - Free tier: **20M events/month** (more than enough for development)
   - No credit card required

2. **Get API Key**:
   - After signing in, go to: **Account Settings** → **API Keys**
   - Click **Create API Key**
   - Name: `union-eyes-local-dev`
   - Copy the key (starts with `hc...`)

3. **Create Environment**:
   - Go to **Environments** → **Create Environment**
   - Name: `development`
   - Copy the environment name

## Step 2: Update `.env.local` (30 seconds) ⚙️

Open your `.env.local` file and update these lines:

```bash
# Enable tracing
OTEL_ENABLED=true

# Add your Honeycomb API key (replace YOUR_API_KEY_HERE)
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_HONEYCOMB_API_KEY_HERE

# Service identification (customize if needed)
OTEL_SERVICE_NAME=union-eyes-local
OTEL_SERVICE_VERSION=1.0.0

# Honeycomb endpoint (already set correctly)
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443

# Dataset name (customize if needed)
OTEL_EXPORTER_OTLP_DATASET=union-eyes-dev

# Sample all traces during development
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

**Example with real key**:
```bash
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=hcaik_01jzq7x8m9n2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9
```

## Step 3: Restart TypeScript Server (Required) 🔄

**Critical**: TypeScript needs to reload to recognize newly installed packages.

### VS Code:
1. Open Command Palette: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
2. Type: `TypeScript: Restart TS Server`
3. Press Enter

### Other Editors:
- Restart your editor completely
- Or reload the workspace/window

## Step 4: Start Your Dev Server (30 seconds) 🚀

```bash
pnpm dev
```

**What to Expect**:
- You'll see OpenTelemetry initialization messages in the console
- Tracing will start automatically for all HTTP requests, database queries, and Redis operations
- No code changes required for basic auto-instrumentation!

## Step 5: Generate Some Traffic (1 minute) 📊

1. Open your browser: http://localhost:3000
2. Navigate through your app:
   - Login
   - View dashboard
   - Create/edit a record
   - Trigger some API calls

3. Make a few different requests to generate diverse traces

## Step 6: View Your Traces in Honeycomb (1 minute) 👀

1. Go to https://ui.honeycomb.io
2. Select your **development** environment
3. Click **Query** in the sidebar
4. You should see traces appearing in real-time!

### Look for:
- **Service Name**: `union-eyes-local`
- **Trace Duration**: Total request time
- **Span Count**: Number of operations in each trace
- **Database Queries**: PostgreSQL operations
- **Redis Operations**: Cache hits/misses

### Pro Tips:
- Click any trace to see the waterfall view (timeline of all operations)
- Filter by `http.route` to see specific endpoints
- Filter by `db.statement` to see database queries
- Sort by duration to find slow requests

## Step 7: Add Manual Instrumentation (Optional) 🛠️

Auto-instrumentation covers HTTP, DB, and Redis automatically. For custom business logic:

### Example 1: Trace a Service Function

```typescript
import { traced } from '@/lib/tracing';

export async function processPayment(memberId: string, amount: number) {
  return traced('payment.process', async (span) => {
    // Business logic here
    span.setAttribute('member.id', memberId);
    span.setAttribute('payment.amount', amount);
    
    const result = await stripeClient.charge(amount);
    
    span.setAttribute('payment.success', true);
    span.setAttribute('payment.transaction_id', result.id);
    
    return result;
  }, {
    'member.id': memberId,
    'payment.amount': amount
  });
}
```

### Example 2: Add Trace Context to Logs

```typescript
import { logger } from '@/lib/logger';
import { getTraceContext } from '@/lib/tracing';

export async function createClaim(data: ClaimData) {
  const traceCtx = getTraceContext();
  
  logger.info('Creating claim', {
    ...traceCtx,  // Adds trace_id and span_id
    claimType: data.type,
    amount: data.amount
  });
  
  // ... create claim
}
```

## Troubleshooting 🔧

### Issue: "Cannot find module '@opentelemetry/...'"

**Solution**: Restart TypeScript server (see Step 3)

### Issue: No traces appearing in Honeycomb

**Checklist**:
1. ✅ `OTEL_ENABLED=true` in `.env.local`?
2. ✅ API key correct (starts with `hc...`)?
3. ✅ Dev server restarted after changing `.env.local`?
4. ✅ Check console for OpenTelemetry initialization messages
5. ✅ Check Honeycomb environment matches `OTEL_EXPORTER_OTLP_DATASET`

### Issue: Too many traces / performance impact

**Solution**: Reduce sampling rate in `.env.local`:

```bash
# Sample 10% of traces instead of 100%
OTEL_TRACES_SAMPLER_ARG=0.1
```

### Issue: Want to disable tracing temporarily

**Solution**:
```bash
OTEL_ENABLED=false
```
Restart dev server.

## What Gets Traced Automatically? 🎯

With zero code changes, OpenTelemetry auto-instruments:

✅ **HTTP Requests**
- Request method, path, status code
- Response time
- Headers (sanitized)

✅ **Database Queries (PostgreSQL)**
- Query text
- Execution time
- Row count
- Connection pool stats

✅ **Redis Operations**
- Command name (GET, SET, etc.)
- Key names
- Execution time

✅ **External HTTP Calls**
- Outbound API requests
- Response times
- Status codes

## Next Steps 📚

**Fully Operational** ✅
Your distributed tracing is now live! You can:

1. **Monitor Performance**: Identify slow database queries and API calls
2. **Debug Issues**: Trace requests end-to-end across services
3. **Optimize**: Find N+1 queries and unnecessary operations
4. **Set Alerts**: Configure Honeycomb alerts for slow traces or errors

**For Production**:
- Study the full implementation guide: [P1_IMPLEMENTATION_COMPLETE.md](P1_IMPLEMENTATION_COMPLETE.md)
- Add custom spans for critical business logic
- Configure sampling (100% in dev, 10% in prod)
- Set up Honeycomb dashboards and alerts

## Quick Reference Commands

```bash
# Restart dev server
pnpm dev

# Check TypeScript compilation
pnpm type-check

# View environment variables
cat .env.local | grep OTEL

# Test database connection
pnpm tsx scripts/validate-db-connection.ts
```

## Success Metrics 🎉

You know tracing is working when:

✅ Console shows: "OpenTelemetry tracing initialized"  
✅ Honeycomb shows traces with service name `union-eyes-local`  
✅ Traces include database spans and HTTP spans  
✅ Clicking a trace shows waterfall visualization  
✅ Can filter traces by endpoint, duration, or status code  

## Support & Resources 📖

- **Full Implementation Guide**: [P1_IMPLEMENTATION_COMPLETE.md](./P1_IMPLEMENTATION_COMPLETE.md)
- **Tracing API Reference**: [TRACING_QUICK_REFERENCE.md](./TRACING_QUICK_REFERENCE.md)
- **OpenTelemetry Docs**: https://opentelemetry.io/docs/
- **Honeycomb Docs**: https://docs.honeycomb.io/

---

**Need Help?** Check [OPENTELEMETRY_INSTALLATION.md](../OPENTELEMETRY_INSTALLATION.md) for troubleshooting or file an issue.
