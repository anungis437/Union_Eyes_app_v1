/**
 * Environment Validation Tests
 * 
 * Tests for the secure environment variable validation system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateEnvironment,
  env,
  getEnvironmentAuditLog,
  getEnvironmentMetrics,
  EnvironmentManager,
} from '@/lib/config/env-validation';

describe('Environment Validation System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    vi.unstubAllEnvs();
  });

  describe('validateEnvironment()', () => {
    it('should pass validation with all critical variables set', () => {
      // Set minimal required environment variables
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));

      const result = validateEnvironment();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with missing critical DATABASE_URL', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', '');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_123');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));

      const result = validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('DATABASE_URL'))).toBe(true);
    });

    it('should fail validation with invalid DATABASE_URL format', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'mysql://localhost/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_123');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));

      const result = validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('PostgreSQL'))).toBe(true);
    });

    it('should fail validation with VOTING_SECRET too short', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_123');
      vi.stubEnv('VOTING_SECRET', 'tooshort');

      const result = validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('VOTING_SECRET'))).toBe(true);
    });

    it('should warn when SENTRY_DSN missing in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));
      vi.stubEnv('SENTRY_DSN', '');

      const result = validateEnvironment();
      expect(result.warnings.some(w => w.includes('SENTRY_DSN'))).toBe(true);
    });

    it('should validate optional variables correctly', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));
      vi.stubEnv('SENDGRID_API_KEY', '');
      vi.stubEnv('STRIPE_SECRET_KEY', '');

      const result = validateEnvironment();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('env object type-safe access', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));
      validateEnvironment();
    });

    it('should provide type-safe access to environment variables', () => {
      // This test verifies TypeScript type safety at compile time
      // Runtime verification that values are accessible
      const dbUrl = env.DATABASE_URL;
      expect(typeof dbUrl).toBe('string');
      expect(dbUrl).toContain('postgresql');
    });

    it('should return undefined for unset optional variables', () => {
      vi.stubEnv('SENDGRID_API_KEY', '');
      const apiKey = env.SENDGRID_API_KEY;
      expect(apiKey).toBeUndefined();
    });

    it('should track access attempts in audit log', () => {
      validateEnvironment();
      
      // Access a variable
      const _dbUrl = env.DATABASE_URL;
      
      const auditLog = getEnvironmentAuditLog({ eventType: 'ENV_ACCESS' });
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog.some(e => e.variable === 'DATABASE_URL')).toBe(true);
    });
  });

  describe('Audit logging', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));
    });

    it('should log validation events', () => {
      const result = validateEnvironment();
      
      const auditLog = getEnvironmentAuditLog({ eventType: 'ENV_VALIDATION' });
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].eventType).toBe('ENV_VALIDATION');
      if (result.isValid) {
        expect(auditLog[0].status).toBe('PASSED');
      }
    });

    it('should log failed validation events', () => {
      vi.stubEnv('DATABASE_URL', '');
      const result = validateEnvironment();

      const auditLog = getEnvironmentAuditLog({ eventType: 'ENV_VALIDATION', status: 'FAILED' });
      expect(auditLog.length).toBeGreaterThan(0);
    });

    it('should track variable access with counts', () => {
      validateEnvironment();
      
      // Access variables multiple times
      for (let i = 0; i < 3; i++) {
        const _ = env.DATABASE_URL;
      }

      const metrics = getEnvironmentMetrics();
      expect(metrics.totalAccesses).toBeGreaterThanOrEqual(3);
    });

    it('should provide audit log filtering', () => {
      validateEnvironment();
      
      // Access multiple variables
      const _ = env.DATABASE_URL;
      const __ = env.VOTING_SECRET;

      const accessLog = getEnvironmentAuditLog({ eventType: 'ENV_ACCESS' });
      expect(accessLog.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error handling', () => {
    it('should throw helpful error for invalid VOTING_SECRET length', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'too-short');

      const result = validateEnvironment();
      const votingSecretError = result.errors.find(e => e.includes('VOTING_SECRET'));
      
      expect(votingSecretError).toBeDefined();
      expect(votingSecretError).toContain('32 characters');
    });

    it('should provide detailed error for invalid URL format', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'not-a-valid-url');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));

      const result = validateEnvironment();
      expect(result.errors.some(e => e.includes('Invalid APP_URL'))).toBe(true);
    });

    it('should handle missing all variables gracefully', () => {
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubEnv('DATABASE_URL', '');
      vi.stubEnv('CLERK_SECRET_KEY', '');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', '');
      vi.stubEnv('VOTING_SECRET', '');

      const result = validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics collection', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));
      validateEnvironment();
    });

    it('should provide environment metrics', () => {
      // Access some variables
      const _ = env.DATABASE_URL;
      const __ = env.VOTING_SECRET;

      const metrics = getEnvironmentMetrics();
      
      expect(metrics).toHaveProperty('isValid');
      expect(metrics).toHaveProperty('errorCount');
      expect(metrics).toHaveProperty('warningCount');
      expect(metrics).toHaveProperty('totalVariables');
      expect(metrics).toHaveProperty('uniqueAccesses');
      expect(metrics).toHaveProperty('totalAccesses');
    });

    it('should track most accessed variables', () => {
      // Access DATABASE_URL multiple times
      for (let i = 0; i < 5; i++) {
        const _ = env.DATABASE_URL;
      }

      // Access VOTING_SECRET once
      const __ = env.VOTING_SECRET;

      const metrics = getEnvironmentMetrics();
      const mostAccessed = metrics.mostAccessedVariables as Array<{ variable: string; accessCount: number }>;
      
      expect(mostAccessed).toBeDefined();
      expect(mostAccessed.length).toBeGreaterThan(0);
      expect(mostAccessed[0].variable).toBe('DATABASE_URL');
    });
  });

  describe('Production safety checks', () => {
    it('should fail fast in production with missing DATABASE_URL', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', '');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));

      const result = validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn in production without SENTRY_DSN', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));
      vi.stubEnv('SENTRY_DSN', '');

      const result = validateEnvironment();
      expect(result.warnings.some(w => w.includes('SENTRY_DSN'))).toBe(true);
    });

    it('should allow missing optional payment secrets in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');

      const result = validateEnvironment();
      expect(result.isValid).toBe(true);
    });
  });

  describe('EnvironmentManager behavior', () => {
    it('throws when accessed before validation', () => {
      const manager = new EnvironmentManager();

      expect(() => manager.get('DATABASE_URL')).toThrow('Environment not validated');
      expect(() => manager.getAll()).toThrow('Environment not validated');
      expect(() => manager.getValidationResult()).toThrow('Environment not validated');
    });

    it('prints a report without validated state', () => {
      const manager = new EnvironmentManager();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.printReport();

      expect(errorSpy).toHaveBeenCalledWith('❌ Environment not validated');
      errorSpy.mockRestore();
    });

    it('returns validation result after validate() and supports getAll()', () => {
      const manager = new EnvironmentManager();

      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_1234567890123456789012');
      vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_1234567890123456789012');
      vi.stubEnv('VOTING_SECRET', 'a'.repeat(32));

      const result = manager.validate();
      const fromGetter = manager.getValidationResult();

      expect(fromGetter.isValid).toBe(result.isValid);
      expect(manager.getAll().DATABASE_URL).toContain('postgresql');
    });
  });
});
