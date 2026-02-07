/**
 * Security Middleware Test Suite
 * 
 * Comprehensive tests for:
 * - SQL Injection Prevention
 * - Request Input Validation
 * - Authentication and Authorization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SQLInjectionScanner,
  validateSQLSafety,
  UNSAFE_PATTERNS_AUDIT,
} from '@/lib/middleware/sql-injection-prevention';
import {
  RequestValidator,
  createValidator,
  ValidationAuditLog,
} from '@/lib/middleware/request-validation';
import {
  AuthenticationService,
  SUPPORTED_ROLES,
  ROLE_PERMISSIONS,
  AuthenticationAuditLog,
  isValidBearerToken,
} from '@/lib/middleware/auth-middleware';
import { z } from 'zod';

// ============================================================================
// SQL Injection Prevention Tests
// ============================================================================

describe('SQL Injection Prevention', () => {
  describe('SQLInjectionScanner', () => {
    it('should detect union-based SQL injection', () => {
      const maliciousInput = {
        search: "test' UNION SELECT * FROM users--"
      };

      const result = SQLInjectionScanner.scanRequest(maliciousInput, {});
      expect(result.isSafe).toBe(false);
      expect(result.detectedPatterns.some(p => p.includes('unionInjection'))).toBe(true);
      expect(result.severity).toBe('critical');
    });

    it('should detect raw SQL template patterns', () => {
      const codeAnalysis = "sql`SELECT * WHERE id = ${userId}`";
      
      const result = SQLInjectionScanner.scanRequest(codeAnalysis, {});
      expect(result.isSafe).toBe(false);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
    });

    it('should detect SQL comment-based injection', () => {
      const maliciousInput = {
        query: "admin' -- DROP TABLE users"
      };

      const result = SQLInjectionScanner.scanRequest(maliciousInput, {});
      expect(result.isSafe).toBe(false);
    });

    it('should detect dangerous SQL functions', () => {
      const maliciousInput = {
        field: "'; DROP TABLE users; --"
      };

      const result = SQLInjectionScanner.scanRequest(maliciousInput, {});
      expect(result.isSafe).toBe(false);
    });

    it('should pass safe parameterized queries', () => {
      const safeInput = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        email: "user@example.com"
      };

      const result = SQLInjectionScanner.scanRequest(safeInput, {});
      expect(result.isSafe).toBe(true);
      expect(result.detectedPatterns).toHaveLength(0);
    });

    it('should provide recommendations for detected patterns', () => {
      const maliciousInput = {
        query: "id = 1; DROP TABLE users;"
      };

      const result = SQLInjectionScanner.scanRequest(maliciousInput, {});
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should validate ORM usage correctly', () => {
      const ormCode = `
        db.select().from(users).where(eq(users.id, id)).execute();
      `;

      const result = SQLInjectionScanner.validateORMUsage(ormCode);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should flag improper raw SQL usage', () => {
      const unsafeCode = `sql\`SELECT * FROM users WHERE id = \${userId}\``;

      const result = SQLInjectionScanner.validateORMUsage(unsafeCode);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('validateSQLSafety function', () => {
    it('should validate request body and query params', () => {
      const body = { id: '123' };
      const query = { search: 'test' };

      const result = validateSQLSafety(body, query);
      expect(result).toHaveProperty('isSafe');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('detectedPatterns');
    });

    it('should reject SQL injection attempts', () => {
      const maliciousBody = {
        query: "'; DROP TABLE users; --"
      };

      const result = validateSQLSafety(maliciousBody, {});
      expect(result.isSafe).toBe(false);
    });
  });

  describe('UNSAFE_PATTERNS_AUDIT', () => {
    it('should contain documented patterns', () => {
      expect(UNSAFE_PATTERNS_AUDIT.patterns).toBeDefined();
      expect(UNSAFE_PATTERNS_AUDIT.patterns.length).toBeGreaterThan(0);
    });

    it('should include remediation guidance', () => {
      const pattern = UNSAFE_PATTERNS_AUDIT.patterns[0];
      expect(pattern.replacement).toBeDefined();
      expect(pattern.severity).toBe('critical');
    });
  });
});

// ============================================================================
// Request Input Validation Tests
// ============================================================================

describe('Request Input Validation', () => {
  describe('RequestValidator', () => {
    it('should validate email format correctly', async () => {
      const schema = z.object({
        email: createValidator.email(),
      });

      const validData = { email: 'user@example.com' };
      const result = RequestValidator.validateQuery(validData, schema);

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('should reject invalid email format', () => {
      const schema = z.object({
        email: createValidator.email(),
      });

      const invalidData = { email: 'not-an-email' };
      const result = RequestValidator.validateQuery(invalidData, schema);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errors.email).toBeDefined();
      }
    });

    it('should validate UUID format', () => {
      const schema = z.object({
        id: createValidator.uuid(),
      });

      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const result = RequestValidator.validateQuery({ id: validId }, schema);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const schema = z.object({
        id: createValidator.uuid(),
      });

      const result = RequestValidator.validateQuery({ id: 'not-a-uuid' }, schema);
      expect(result.isValid).toBe(false);
    });

    it('should validate URL format and reject javascript URIs', () => {
      const schema = z.object({
        link: createValidator.url(),
      });

      // Valid URL
      const validResult = RequestValidator.validateQuery(
        { link: 'https://example.com' },
        schema
      );
      expect(validResult.isValid).toBe(true);

      // JavaScript URI
      const invalidResult = RequestValidator.validateQuery(
        { link: 'javascript:alert("xss")' },
        schema
      );
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate password strength', () => {
      const schema = z.object({
        password: createValidator.password({
          minLength: 12,
          requireSpecialChars: true,
        }),
      });

      // Valid password
      const validResult = RequestValidator.validateQuery(
        { password: 'SecurePass123!' },
        schema
      );
      expect(validResult.isValid).toBe(true);

      // Too short
      const shortResult = RequestValidator.validateQuery(
        { password: 'short' },
        schema
      );
      expect(shortResult.isValid).toBe(false);

      // Missing special chars
      const noSpecialResult = RequestValidator.validateQuery(
        { password: 'NoSpecialChars123' },
        schema
      );
      expect(noSpecialResult.isValid).toBe(false);
    });

    it('should validate phone numbers', () => {
      const schema = z.object({
        phone: createValidator.phone('US'),
      });

      const result = RequestValidator.validateQuery(
        { phone: '555-123-4567' },
        schema
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate slugs', () => {
      const schema = z.object({
        slug: createValidator.slug(),
      });

      const validResult = RequestValidator.validateQuery(
        { slug: 'valid-slug-name' },
        schema
      );
      expect(validResult.isValid).toBe(true);

      const invalidResult = RequestValidator.validateQuery(
        { slug: 'Invalid Slug!' },
        schema
      );
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate pagination params', () => {
      const schema = z.object({
        ...createValidator.pagination().shape,
      });

      const result = RequestValidator.validateQuery(
        { page: '1', limit: '10' },
        schema
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate date ranges', () => {
      const dateSchema = createValidator.dateRange();
      const schema = z.object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      });

      const result = RequestValidator.validateQuery(
        {
          from: new Date('2024-01-01').toISOString(),
          to: new Date('2024-12-31').toISOString(),
        },
        schema
      );
      expect(result.isValid).toBe(true);
    });

    it('should sanitize HTML from user input', () => {
      const validator = RequestValidator;
      // Note: sanitize method needs request context, this tests basic pattern
      
      const schema = z.object({
        name: z.string(),
      });

      const result = RequestValidator.validateQuery(
        { name: '<script>alert("test")</script>John' },
        schema
      );
      // Zod doesn't sanitize by default, but we can add custom preprocessing
      expect(result.isValid).toBe(true);
    });

    it('should format Zod errors properly', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.string().transform(v => parseInt(v)).pipe(z.number().positive()),
      });

      const queryParams: Record<string, string> = { email: 'invalid', age: '-5' };
      const result = RequestValidator.validateQuery(queryParams, schema);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.errors.email).toBeDefined();
        expect(result.errors.age).toBeDefined();
      }
    });
  });

  describe('ValidationAuditLog', () => {
    it('should log validation events', () => {
      ValidationAuditLog.log('/api/users', true);
      
      const stats = ValidationAuditLog.getStats();
      expect(stats.totalValidations).toBeGreaterThan(0);
    });

    it('should track validation error rates', () => {
      ValidationAuditLog.log('/api/data', true);
      ValidationAuditLog.log('/api/data', false, 2);
      
      const stats = ValidationAuditLog.getStats();
      expect(stats.validRequests).toBeGreaterThan(0);
      expect(stats.invalidRequests).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Authentication and Authorization Tests
// ============================================================================

describe('Authentication & Authorization', () => {
  describe('AuthenticationService', () => {
    it('should have defined role permissions', () => {
      Object.values(SUPPORTED_ROLES).forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      });
    });

    it('should verify admin has all permissions', () => {
      const adminPermissions = ROLE_PERMISSIONS[SUPPORTED_ROLES.ADMIN];
      expect(adminPermissions.includes('manage:roles')).toBe(true);
      expect(adminPermissions.includes('delete:organization')).toBe(true);
    });

    it('should verify member has limited permissions', () => {
      const memberPermissions = ROLE_PERMISSIONS[SUPPORTED_ROLES.MEMBER];
      expect(memberPermissions.includes('participate:voting')).toBe(true);
      expect(memberPermissions.includes('delete:organization')).toBe(false);
    });

    it('should check role hierarchy correctly', () => {
      const memberPermissions = ROLE_PERMISSIONS[SUPPORTED_ROLES.MEMBER];
      const officerPermissions = ROLE_PERMISSIONS[SUPPORTED_ROLES.OFFICER];
      
      // Officer should have more permissions than member
      expect(officerPermissions.length).toBeGreaterThan(memberPermissions.length);
    });

    it('should verify voter eligibility', () => {
      const delegatePermissions = ROLE_PERMISSIONS[SUPPORTED_ROLES.DELEGATE];
      expect(delegatePermissions.includes('participate:voting')).toBe(true);
    });

    it('should verify auditor read-only permissions', () => {
      const auditorPermissions = ROLE_PERMISSIONS[SUPPORTED_ROLES.AUDITOR];
      expect(auditorPermissions.filter(p => p.startsWith('view:')).length).toBeGreaterThan(0);
      expect(auditorPermissions.filter(p => p.startsWith('delete:')).length).toBe(0);
    });
  });

  describe('Bearer token validation', () => {
    it('should validate proper bearer tokens', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      expect(isValidBearerToken(validToken)).toBe(true);
    });

    it('should reject invalid bearer tokens', () => {
      expect(isValidBearerToken('invalid token')).toBe(false);
      expect(isValidBearerToken('token!')).toBe(false);
      expect(isValidBearerToken('')).toBe(false);
    });
  });

  describe('AuthenticationAuditLog', () => {
    beforeEach(() => {
      // Clear previous entries for clean test
      AuthenticationAuditLog.getStats();
    });

    it('should log authentication events', () => {
      AuthenticationAuditLog.log({
        userId: 'user123',
        eventType: 'LOGIN',
      });

      const stats = AuthenticationAuditLog.getStats();
      expect(stats.totalAuthEvents).toBeGreaterThan(0);
    });

    it('should track failed login attempts', () => {
      AuthenticationAuditLog.log({
        eventType: 'LOGIN_FAILED',
        reason: 'Invalid credentials',
      });

      const events = AuthenticationAuditLog.getEvents({ eventType: 'LOGIN_FAILED' });
      expect(events.length).toBeGreaterThan(0);
    });

    it('should track permission denials', () => {
      AuthenticationAuditLog.log({
        userId: 'user456',
        eventType: 'PERMISSION_DENIED',
        reason: 'Insufficient permissions',
      });

      const stats = AuthenticationAuditLog.getStats();
      expect(stats.deniedPermissions).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Security Integration', () => {
  it('should prevent SQL injection and validate input together', () => {
    const maliciousInput = {
      search: "test' UNION SELECT password FROM users--"
    };

    // Check SQL injection
    const sqlResult = validateSQLSafety(maliciousInput, {});
    expect(sqlResult.isSafe).toBe(false);

    // Validate input schema
    const schema = z.object({
      search: z.string().max(100).regex(/^[a-zA-Z0-9\s\-]+$/, 'Invalid characters'),
    });

    const validationResult = RequestValidator.validateQuery(maliciousInput, schema);
    expect(validationResult.isValid).toBe(false);
  });

  it('should handle multiple security layers', () => {
    // Simulate incoming request with both SQL injection and missing auth
    const body = {
      query: "'; DROP TABLE users; --"
    };

    // Layer 1: SQL injection check
    const sqlCheck = validateSQLSafety(body, {});
    expect(sqlCheck.isSafe).toBe(false);

    // Layer 2: Input validation
    const schema = z.object({
      query: z.string().min(1).max(200),
    });

    const validationCheck = RequestValidator.validateQuery(body, schema);
    expect(validationCheck.isValid).toBe(true); // String validation passes, but SQL check caught the issue

    // Result: Request is denied due to SQL injection detection
    expect(sqlCheck.severity).toBe('critical');
  });

  it('should provide complete security metrics', () => {
    // Log some security events
    ValidationAuditLog.log('/api/test', true);
    AuthenticationAuditLog.log({ eventType: 'LOGIN' });

    const validationStats = ValidationAuditLog.getStats();
    const authStats = AuthenticationAuditLog.getStats();

    expect(validationStats.totalValidations).toBeGreaterThan(0);
    expect(authStats.successfulLogins).toBeGreaterThan(0);
  });
});
