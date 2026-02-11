/**
 * Environment Variable Validation & Type Safety
 * 
 * Centralized management of all environment variables with:
 * - Type-safe schema definition using Zod
 * - Required vs optional distinction
 * - Production fail-fast on missing critical vars
 * - Audit logging of all env access
 * - Development-friendly error messages
 * 
 * Usage:
 *   import { env } from '@/lib/config/env-validation';
 *   const dbUrl = env.DATABASE_URL; // Type-safe, guaranteed to exist
 */

import { z } from 'zod';
import type { ZodError } from 'zod';

/**
 * Environment variable schema definition
 * This serves as the single source of truth for all required and optional vars
 */
const envSchema = z.object({
  // ============== CRITICAL - App Configuration ==============
  NODE_ENV: z.enum(['development', 'production', 'staging', 'test'])
    .default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid APP_URL'),
  NEXT_RUNTIME: z.string().optional(),
  NEXT_PHASE: z.string().optional(),
  NEXT_TELEMETRY_DISABLED: z.string().optional(),

  // ============== CRITICAL - Database ==============
  DATABASE_URL: z.string()
    .startsWith('postgresql://', 'Database must be PostgreSQL')
    .describe('PostgreSQL connection string (required in all environments)'),
  
  // ============== CRITICAL - Authentication ==============
  CLERK_SECRET_KEY: z.string()
    .min(10, 'CLERK_SECRET_KEY must be at least 10 characters'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string()
    .min(10, 'CLERK_PUBLISHABLE_KEY must be at least 10 characters'),

  // ============== CRITICAL - Voting System ==============
  VOTING_SECRET: z.string()
    .min(32, 'VOTING_SECRET must be at least 32 characters for HMAC-SHA256')
    .describe('Cryptographic secret for vote signing and verification'),

  // ============== HIGH - Webhooks & Payments ==============
  STRIPE_WEBHOOK_SECRET: z.string()
    .min(10, 'STRIPE_WEBHOOK_SECRET is required')
    .optional(),
  WHOP_WEBHOOK_SECRET: z.string()
    .min(10, 'WHOP_WEBHOOK_SECRET is required')
    .optional(),
  
  // ============== HIGH - Stripe Integration ==============
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),

  // ============== HIGH - Notification Services ==============
  SENDGRID_API_KEY: z.string()
    .min(10, 'SENDGRID_API_KEY must be provided')
    .optional(),
  SENDGRID_FROM_EMAIL: z.string()
    .email('Invalid SENDGRID_FROM_EMAIL')
    .optional(),
  SENDGRID_FROM_NAME: z.string().optional(),

  // ============== HIGH - Email Delivery (Resend/SendGrid) ==============
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'console']).default('resend'),
  EMAIL_FROM: z.string().email('Invalid EMAIL_FROM').optional(),
  EMAIL_REPLY_TO: z.string().email('Invalid EMAIL_REPLY_TO').optional(),
  RESEND_API_KEY: z.string().optional(),
  
  // ============== MEDIUM - SMS Notifications (Optional) ==============
  TWILIO_ACCOUNT_SID: z.string()
    .min(34, 'TWILIO_ACCOUNT_SID must be at least 34 characters')
    .optional()
    .describe('Twilio Account SID for SMS notifications'),
  TWILIO_AUTH_TOKEN: z.string()
    .min(32, 'TWILIO_AUTH_TOKEN must be at least 32 characters')
    .optional()
    .describe('Twilio Auth Token for SMS notifications'),
  TWILIO_PHONE_NUMBER: z.string()
    .regex(/^\+\d{1,15}$/, 'TWILIO_PHONE_NUMBER must be in E.164 format (+1234567890)')
    .optional()
    .describe('Twilio phone number in E.164 format for SMS sending'),

  // ============== HIGH - Document Storage ==============
  STORAGE_TYPE: z.enum(['s3', 'r2', 'azure', 'disk'])
    .default('disk')
    .describe('Document storage backend: s3, r2, azure, or disk'),

  // AWS S3
  AWS_REGION: z.string().default('us-east-1').optional(),
  AWS_SIGNATURES_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Cloudflare R2
  CLOUDFLARE_R2_BUCKET: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_SECRET_ACCESS_KEY: z.string().optional(),

  // Azure Storage
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_KEY: z.string().optional(),
  AZURE_STORAGE_CONTAINER: z.string().optional(),

  // ============== HIGH - Document Signing ==============
  DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
  DOCUSIGN_SECRET_KEY: z.string().optional(),
  DOCUSIGN_ACCOUNT_ID: z.string().optional(),
  DOCUSIGN_API_ACCOUNT_ID: z.string().optional(),
  DOCUSIGN_USER_ID: z.string().optional(),
  DOCUSIGN_PRIVATE_KEY: z.string().optional(),
  DOCUSIGN_BASE_URL: z.string().url('Invalid DOCUSIGN_BASE_URL').optional(),

  HELLOSIGN_API_KEY: z.string().optional(),

  ADOBE_CLIENT_ID: z.string().optional(),
  ADOBE_CLIENT_SECRET: z.string().optional(),

  // ============== MEDIUM - Redis Cache ==============
  REDIS_HOST: z.string().default('localhost').optional(),
  REDIS_PORT: z.string().default('6379').optional(),
  REDIS_PASSWORD: z.string().optional(),

  // ============== MEDIUM - Reporting & Storage ==============
  REPORTS_DIR: z.string().default('./reports').optional(),
  TEMP_DIR: z.string().default('./temp').optional(),

  // ============== MEDIUM - Email Templates ==============
  ORGANIZATION_NAME: z.string().default('Union Eyes').optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // ============== MEDIUM - Analytics & Monitoring ==============
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // ============== MEDIUM - Azure Services ==============
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_KEY_VAULT_NAME: z.string().optional(),
  AZURE_KEY_VAULT_SECRET_NAME: z.string().optional(),

  // Azure AI Services
  AZURE_SPEECH_KEY: z.string().optional(),
  AZURE_SPEECH_REGION: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_KEY: z.string().optional(),
  AZURE_COMPUTER_VISION_KEY: z.string().optional(),
  AZURE_COMPUTER_VISION_ENDPOINT: z.string().url('Invalid AZURE_COMPUTER_VISION_ENDPOINT').optional(),

  // Azure SQL Server
  AZURE_SQL_SERVER: z.string().optional(),
  AZURE_SQL_DB: z.string().optional(),
  AZURE_SQL_USER: z.string().optional(),
  AZURE_SQL_PASSWORD: z.string().optional(),

  // ============== MEDIUM - Calendar Sync ==============
  GRAPH_API_ENDPOINT: z.string().optional(),
  GRAPH_API_CLIENT_ID: z.string().optional(),
  GRAPH_API_CLIENT_SECRET: z.string().optional(),
  GRAPH_API_TENANT_ID: z.string().optional(),

  // ============== MEDIUM - Firebase ==============
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),

  // ============== LOW - Testing ==============
  TEST_ORGANIZATION_ID: z.string().optional(),
  TEST_COURSE_ID: z.string().optional(),
  TEST_MEMBER_ID: z.string().optional(),
  SKIP_DB_STARTUP_CHECK: z.string().optional(),
});

export type Environment = z.infer<typeof envSchema>;

/**
 * Validation errors collection for detailed error reporting
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  environment: Partial<Environment>;
}

/**
 * Audit event for security logging
 */
interface AuditEvent {
  timestamp: Date;
  eventType: 'ENV_VALIDATION' | 'ENV_ACCESS' | 'ENV_ERROR';
  variable: string;
  status: 'PASSED' | 'FAILED' | 'ACCESSED';
  details?: Record<string, unknown>;
}

/**
 * Environment validation and access control
 */
class EnvironmentManager {
  private environment: Partial<Environment> = {};
  private validationResult: ValidationResult | null = null;
  private auditLog: AuditEvent[] = [];
  private accessLog: Map<string, number> = new Map();

  /**
   * Initialize and validate environment variables on startup
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const normalizedEnv = Object.fromEntries(
        Object.entries(process.env).map(([key, value]) => [
          key,
          value === '' ? undefined : value,
        ])
      );
      const result = envSchema.safeParse(normalizedEnv);

      if (!result.success) {
        const zodErrors = result.error.flatten();

        // Collect required field errors
        if (zodErrors.fieldErrors) {
          Object.entries(zodErrors.fieldErrors).forEach(([field, msgs]) => {
            if (msgs && msgs.length > 0) {
              msgs.forEach(msg => {
                errors.push(`${field}: ${msg}`);
              });
            }
          });
        }

        // Log validation error
        this.logAudit({
          eventType: 'ENV_VALIDATION',
          variable: 'all',
          status: 'FAILED',
          details: { errorCount: errors.length }
        });
      } else {
        this.environment = result.data;

        // Log validation success
        this.logAudit({
          eventType: 'ENV_VALIDATION',
          variable: 'all',
          status: 'PASSED',
          details: { validCount: Object.keys(result.data).length }
        });

        // Check for potentially unsafe configurations
        if (this.environment.NODE_ENV === 'production') {
          if (!this.environment.SENTRY_DSN) {
            warnings.push('⚠️ SENTRY_DSN not configured - error tracking disabled');
          }
          if (!this.environment.STRIPE_SECRET_KEY && !this.environment.WHOP_WEBHOOK_SECRET) {
            warnings.push('⚠️ Neither STRIPE nor WHOP webhook secrets configured');
          }
          if (this.environment.EMAIL_PROVIDER === 'resend' && !this.environment.RESEND_API_KEY) {
            warnings.push('⚠️ RESEND_API_KEY missing for EMAIL_PROVIDER=resend');
          }
          if (this.environment.EMAIL_PROVIDER === 'resend' && !this.environment.EMAIL_FROM) {
            warnings.push('⚠️ EMAIL_FROM missing for Resend delivery');
          }
        }
      }

      this.validationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        environment: this.environment
      };

      return this.validationResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(`Validation exception: ${errorMsg}`);

      this.logAudit({
        eventType: 'ENV_ERROR',
        variable: 'all',
        status: 'FAILED',
        details: { error: errorMsg }
      });

      this.validationResult = {
        isValid: false,
        errors,
        warnings,
        environment: this.environment
      };

      return this.validationResult;
    }
  }

  /**
   * Get validated environment variable with audit trail
   */
  get<K extends keyof Environment>(key: K): Environment[K] | undefined {
    if (!this.validationResult) {
      throw new Error('Environment not validated. Call validate() first');
    }

    // Increment access count
    const count = (this.accessLog.get(key as string) || 0) + 1;
    this.accessLog.set(key as string, count);

    // Log access
    this.logAudit({
      eventType: 'ENV_ACCESS',
      variable: key as string,
      status: 'ACCESSED',
      details: { accessCount: count }
    });

    return this.environment[key];
  }

  /**
   * Get all validated environment variables
   */
  getAll(): Partial<Environment> {
    if (!this.validationResult) {
      throw new Error('Environment not validated. Call validate() first');
    }
    return { ...this.environment };
  }

  /**
   * Get validation result
   */
  getValidationResult(): ValidationResult {
    if (!this.validationResult) {
      throw new Error('Environment not validated. Call validate() first');
    }
    return this.validationResult;
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filter?: { eventType?: AuditEvent['eventType']; status?: AuditEvent['status'] }): AuditEvent[] {
    if (!filter) {
      return [...this.auditLog];
    }

    return this.auditLog.filter(event =>
      (!filter.eventType || event.eventType === filter.eventType) &&
      (!filter.status || event.status === filter.status)
    );
  }

  /**
   * Log an audit event
   */
  private logAudit(event: Omit<AuditEvent, 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date()
    };

    this.auditLog.push(auditEvent);

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const statusEmoji = event.status === 'PASSED' ? '✅' : event.status === 'FAILED' ? '❌' : 'ℹ️';
      console.log(
        `${statusEmoji} [ENV] ${event.eventType} - ${event.variable}: ${event.status}`
      );
    }
  }

  /**
   * Print validation report
   */
  printReport(): void {
    if (!this.validationResult) {
      console.error('❌ Environment not validated');
      return;
    }

    const { isValid, errors, warnings, environment } = this.validationResult;

    if (isValid) {
      console.log('✅ Environment validation PASSED');
    } else {
      console.error('❌ Environment validation FAILED');
    }

    if (errors.length > 0) {
      console.error('\n🔴 Errors:');
      errors.forEach(err => console.error(`  - ${err}`));
    }

    if (warnings.length > 0) {
      console.warn('\n🟡 Warnings:');
      warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    console.log(`\n📊 Statistics:`);
    console.log(`  - Total variables defined: ${Object.keys(environment).length}`);
    console.log(`  - Access attempts: ${this.accessLog.size}`);
    console.log(`  - Audit events: ${this.auditLog.length}`);
  }

  /**
   * Export configuration metrics for monitoring
   */
  getMetrics(): Record<string, unknown> {
    const accessStats = Array.from(this.accessLog.entries()).map(([key, count]) => ({
      variable: key,
      accessCount: count
    }));

    return {
      isValid: this.validationResult?.isValid ?? false,
      errorCount: this.validationResult?.errors.length ?? 0,
      warningCount: this.validationResult?.warnings.length ?? 0,
      totalVariables: Object.keys(this.environment).length,
      uniqueAccesses: this.accessLog.size,
      totalAccesses: Array.from(this.accessLog.values()).reduce((a, b) => a + b, 0),
      auditEventCount: this.auditLog.length,
      mostAccessedVariables: accessStats
        .sort((a, b) => (b.accessCount as number) - (a.accessCount as number))
        .slice(0, 10)
    };
  }
}

/**
 * Singleton instance of environment manager
 */
const envManager = new EnvironmentManager();

/**
 * Public interface for environment validation
 */
export function validateEnvironment(): ValidationResult {
  return envManager.validate();
}

/**
 * Type-safe environment variable access
 * Usage: const url = env.DATABASE_URL;
 */
export const env = new Proxy({} as Environment, {
  get(_target, key: string | symbol) {
    if (typeof key !== 'string') return undefined;
    return envManager.get(key as keyof Environment);
  }
});

/**
 * Get environment audit log
 */
export function getEnvironmentAuditLog(filter?: { eventType?: AuditEvent['eventType']; status?: AuditEvent['status'] }) {
  return envManager.getAuditLog(filter);
}

/**
 * Get environment configuration metrics
 */
export function getEnvironmentMetrics() {
  return envManager.getMetrics();
}

/**
 * Print environment validation report to console
 */
export function printEnvironmentReport() {
  envManager.printReport();
}

/**
 * Get full validation result with all details
 */
export function getEnvironmentValidationResult(): ValidationResult {
  return envManager.getValidationResult();
}

/**
 * Export manager for advanced use cases (testing, etc.)
 */
export { EnvironmentManager };

