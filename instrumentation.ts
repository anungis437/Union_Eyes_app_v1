import * as Sentry from '@sentry/nextjs';
import { initializeConsoleWrapper } from './lib/console-wrapper';

export async function register() {
  // Initialize console wrapper for production logging control
  initializeConsoleWrapper();

  // Skip Sentry initialization during build to prevent "self is not defined" errors
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  // Validate environment variables on startup (Node.js runtime only)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Import and run comprehensive environment validation
      const { validateEnvironment, printEnvironmentReport } = await import('./lib/config/env-validation');
      const envValidation = validateEnvironment();
      
      if (!envValidation.isValid) {
        console.error('❌ Environment validation failed:');
        envValidation.errors.forEach(error => {
          console.error(`  - ${error}`);
        });
        
        // In production, fail fast on missing critical environment variables
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Critical environment variables are missing. Service cannot start.');
        } else {
          console.warn('⚠️  Development mode: continuing despite validation errors');
        }
      } else {
        console.log('✅ Environment validation passed');
      }

      // Print warnings if any
      if (envValidation.warnings.length > 0) {
        console.warn('⚠️ Environment warnings:');
        envValidation.warnings.forEach(warning => {
          console.warn(`  - ${warning}`);
        });
      }

      // Run database startup checks (optional, can be disabled with env var)
      if (process.env.SKIP_DB_STARTUP_CHECK !== 'true') {
        const { runDatabaseStartupChecks } = await import('./lib/db-validator');
        const dbValidation = await runDatabaseStartupChecks();
        
        if (!dbValidation.isHealthy) {
          console.error('❌ Database startup checks failed:');
          dbValidation.errors.forEach(error => {
            console.error(`  - ${error}`);
          });
          
          // In production, warn but don't crash (database might be temporarily unavailable)
          if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️  Service starting with database issues - some features may not work');
          }
        } else {
          console.log('✅ Database startup checks passed');
        }
      }

      // SECURITY FIX: Validate Redis is available for rate limiting
      // Rate limiter fails-closed if Redis unavailable (prevents DoS)
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
          const { Redis } = await import('@upstash/redis');
          const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
          });
          const { logger } = await import('./lib/logger');
          
          // Test Redis connection with ping
          await redis.ping();
          logger.info('Redis connection verified - rate limiting enabled');
        } catch (error) {
          const { logger } = await import('./lib/logger');
          logger.error('Redis connection failed - rate limiting will fail-closed', error as Error);
          if (process.env.NODE_ENV === 'production') {
            logger.error('CRITICAL: All rate-limited endpoints will reject requests until Redis is available');
          }
        }
      } else if (process.env.NODE_ENV === 'production') {
        const { logger } = await import('./lib/logger');
        logger.error('Redis not configured - rate limiting will fail-closed in production');
      }
    } catch (error) {
      console.error('❌ Startup validation error:', error);
      
      // Re-throw in production to prevent starting with invalid config
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }

    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
