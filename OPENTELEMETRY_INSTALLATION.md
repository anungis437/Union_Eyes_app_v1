# OpenTelemetry Packages - Installation Required

## ⚠️ Action Required

The following OpenTelemetry packages need to be installed to enable distributed tracing:

```bash
pnpm add -w @opentelemetry/api \
           @opentelemetry/sdk-node \
           @opentelemetry/auto-instrumentations-node \
           @opentelemetry/exporter-trace-otlp-http \
           @opentelemetry/resources \
           @opentelemetry/semantic-conventions
```

## Why These Packages?

- **@opentelemetry/api** - Core OpenTelemetry API for creating spans and traces
- **@opentelemetry/sdk-node** - Node.js SDK for trace collection and export
- **@opentelemetry/auto-instrumentations-node** - Automatic instrumentation for HTTP, PostgreSQL, Redis, etc.
- **@opentelemetry/exporter-trace-otlp-http** - OTLP exporter for sending traces to observability platforms
- **@opentelemetry/resources** - Resource detection (service name, version, environment)
- **@opentelemetry/semantic-conventions** - Standard attribute keys for consistency

## Known Issue: pnpm Installation Error

There is a known issue with pnpm on Windows causing installation failures:
```
ENOENT: no such file or directory, mkdir '\\?'
```

### Workarounds:

**Option 1: Clear pnpm cache**
```bash
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
pnpm add -w @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

**Option 2: Use npm temporarily**
```bash
npm install --save @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

**Option 3: Update pnpm**
```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm add -w @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

## Graceful Degradation

The tracing implementation is designed to **gracefully degrade** if packages aren't installed:

- Application will start normally
- A warning message will be logged: "OpenTelemetry packages not installed"
- No-op implementations will be used (zero overhead)
- You can install packages later without code changes

## After Installation

1. **Configure environment variables** in `.env.local`:
   ```bash
   OTEL_ENABLED=true
   OTEL_SERVICE_NAME=unioneyes
   OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
   OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY
   ```

2. **Restart the application**:
   ```bash
   pnpm dev
   ```

3. **Verify initialization** in logs:
   ```
   [INFO] OpenTelemetry tracing initialized { serviceName: 'unioneyes', ... }
   ```

4. **Check traces** in your observability platform (Honeycomb/Jaeger)

## Documentation

- [P1 Implementation Complete](./docs/P1_IMPLEMENTATION_COMPLETE.md) - Full guide
- [Tracing Quick Reference](./docs/TRACING_QUICK_REFERENCE.md) - Quick start examples
- [OpenTelemetry Docs](https://opentelemetry.io/docs/languages/js/) - Official documentation

## Need Help?

See [P1_IMPLEMENTATION_COMPLETE.md](./docs/P1_IMPLEMENTATION_COMPLETE.md) Troubleshooting section.
