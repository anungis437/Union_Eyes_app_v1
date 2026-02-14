import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import * as Sentry from '@sentry/nextjs';
import { Redis } from '@upstash/redis';
import { ErrorCode } from '@/lib/api/standardized-responses';
import { getApiHealthStatus } from '@/lib/api-client';

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: HealthCheckResult[];
  version?: string;
}

/**
 * Check database connectivity and query performance
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Simple query to test connection
    const result = await db.execute(sql`SELECT 1 as health_check`);
    const responseTime = Date.now() - startTime;

    // Get additional database stats
    const [poolStats] = await db.execute(sql`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
    `);

    return {
      name: 'database',
      status: responseTime < 100 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        activeConnections: poolStats?.active_connections || 0,
        maxConnections: poolStats?.max_connections || 0
      }
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Check Sentry connectivity
 */
async function checkSentry(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check if Sentry is configured
    const dsn = process.env.SENTRY_DSN;
    
    if (!dsn) {
      return {
        name: 'sentry',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        details: { configured: false }
      };
    }

    // Sentry client is initialized, consider it healthy
    return {
      name: 'sentry',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: { configured: true }
    };
  } catch (error) {
    return {
      name: 'sentry',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown Sentry error'
    };
  }
}

/**
 * Check Redis connectivity (if configured)
 */
async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!upstashUrl || !upstashToken) {
      return {
        name: 'redis',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        details: { configured: false, optional: true, message: 'Upstash Redis not configured' }
      };
    }

    // Ping Redis to test connectivity
    const redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });
    
    await redis.ping();
    const responseTime = Date.now() - startTime;

    return {
      name: 'redis',
      status: responseTime < 200 ? 'healthy' : 'degraded',
      responseTime,
      details: { configured: true, provider: 'upstash' }
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'degraded',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown Redis error',
      details: { optional: true }
    };
  }
}

/**
 * Check external services (Clerk, Whop, etc.)
 */
async function checkExternalServices(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const requiredEnvVars = [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'DATABASE_URL'
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      return {
        name: 'external_services',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    return {
      name: 'external_services',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: { configured: true }
    };
  } catch (error) {
    return {
      name: 'external_services',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check circuit breaker states
 */
async function checkCircuitBreakers(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const circuitBreakerStats = getApiHealthStatus();
    const openCircuits = Object.entries(circuitBreakerStats)
      .filter(([_, stats]: [string, any]) => stats.state === 'OPEN')
      .map(([name]) => name);

    const status = openCircuits.length > 0 ? 'degraded' : 'healthy';

    return {
      name: 'circuit_breakers',
      status,
      responseTime: Date.now() - startTime,
      details: {
        total: Object.keys(circuitBreakerStats).length,
        open: openCircuits.length,
        openCircuits: openCircuits.length > 0 ? openCircuits : undefined,
        stats: circuitBreakerStats,
      }
    };
  } catch (error) {
    return {
      name: 'circuit_breakers',
      status: 'degraded',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 * 
 * Returns:
 * - 200: All critical services healthy
 * - 503: One or more critical services unhealthy
 */
export async function GET() {
  try {
    const startTime = Date.now();

    // Run all health checks in parallel
    const checks = await Promise.all([
      checkDatabase(),
      checkSentry(),
      checkRedis(),
      checkExternalServices(),
      checkCircuitBreakers()
    ]);

    const overallResponseTime = Date.now() - startTime;

    // Determine overall status
    const hasCriticalFailure = checks.some(
      check => check.status === 'unhealthy' && check.name !== 'redis' // Redis is optional
    );
    
    const hasDegradation = checks.some(
      check => check.status === 'degraded'
    );

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasCriticalFailure) {
      overallStatus = 'unhealthy';
    } else if (hasDegradation) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      version: process.env.npm_package_version || process.env.VERCEL_GIT_COMMIT_SHA
    };

    // Report to Sentry if unhealthy
    if (overallStatus === 'unhealthy') {
      Sentry.captureMessage('Health check failed', {
        level: 'error',
        extra: { checks }
      });
    }

    return NextResponse.json(
      response,
      { 
        status: overallStatus === 'unhealthy' ? 503 : 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Response-Time': `${overallResponseTime}ms`
        }
      }
    );
  } catch (error) {
    // Critical error in health check itself
    Sentry.captureException(error);

    return standardErrorResponse(ErrorCode.SERVICE_UNAVAILABLE);
  }
}

