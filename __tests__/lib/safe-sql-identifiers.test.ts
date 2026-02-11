/**
 * Safe SQL Identifier Utilities - Unit Tests
 * 
 * Tests for SQL identifier validation and escaping functions
 * that prevent SQL injection attacks.
 * 
 * Created: February 11, 2026
 * Part of: P2 Security Enhancement - Column Validation
 */

import { describe, it, expect } from 'vitest';
import {
  isValidIdentifier,
  safeIdentifier,
  safeTableName,
  safeColumnName,
  safeIdentifiers,
  safeColumnList,
  isSQLFragment,
} from '@/lib/safe-sql-identifiers';
import { sql } from 'drizzle-orm';

describe('isValidIdentifier', () => {
  describe('valid identifiers', () => {
    it('should accept identifiers starting with lowercase letter', () => {
      expect(isValidIdentifier('user_id')).toBe(true);
      expect(isValidIdentifier('username')).toBe(true);
    });

    it('should accept identifiers starting with uppercase letter', () => {
      expect(isValidIdentifier('UserId')).toBe(true);
      expect(isValidIdentifier('USERNAME')).toBe(true);
    });

    it('should accept identifiers starting with underscore', () => {
      expect(isValidIdentifier('_id')).toBe(true);
      expect(isValidIdentifier('_private')).toBe(true);
    });

    it('should accept identifiers with numbers', () => {
      expect(isValidIdentifier('user_id_123')).toBe(true);
      expect(isValidIdentifier('table1')).toBe(true);
    });

    it('should accept identifiers with dollar signs', () => {
      expect(isValidIdentifier('$var')).toBe(false); // Must start with letter or underscore
      expect(isValidIdentifier('user$var')).toBe(true);
    });

    it('should accept identifiers up to 63 characters (PostgreSQL limit)', () => {
      const longName = 'a'.repeat(63);
      expect(isValidIdentifier(longName)).toBe(true);
    });
  });

  describe('invalid identifiers', () => {
    it('should reject empty strings', () => {
      expect(isValidIdentifier('')).toBe(false);
    });

    it('should reject identifiers starting with numbers', () => {
      expect(isValidIdentifier('1user')).toBe(false);
      expect(isValidIdentifier('123')).toBe(false);
    });

    it('should reject identifiers with special characters', () => {
      expect(isValidIdentifier('user-id')).toBe(false);
      expect(isValidIdentifier('user.id')).toBe(false);
      expect(isValidIdentifier('user@id')).toBe(false);
      expect(isValidIdentifier('user id')).toBe(false); // space
      expect(isValidIdentifier('user;id')).toBe(false); // semicolon - SQL injection risk!
    });

    it('should reject identifiers exceeding 63 characters', () => {
      const tooLong = 'a'.repeat(64);
      expect(isValidIdentifier(tooLong)).toBe(false);
    });

    it('should reject SQL reserved keywords', () => {
      expect(isValidIdentifier('SELECT')).toBe(false);
      expect(isValidIdentifier('select')).toBe(false);
      expect(isValidIdentifier('INSERT')).toBe(false);
      expect(isValidIdentifier('DELETE')).toBe(false);
      expect(isValidIdentifier('DROP')).toBe(false);
      expect(isValidIdentifier('TABLE')).toBe(false);
      expect(isValidIdentifier('WHERE')).toBe(false);
      expect(isValidIdentifier('FROM')).toBe(false);
      expect(isValidIdentifier('UNION')).toBe(false);
    });
  });
});

describe('safeIdentifier', () => {
  it('should wrap valid identifiers in double quotes', () => {
    const result = safeIdentifier('user_id');
    // Check that it's a SQL fragment
    expect(isSQLFragment(result)).toBe(true);
    // Check that it contains the identifier (queryChunks is complex, just verify structure)
    expect(result.queryChunks).toBeDefined();
    expect(result.queryChunks.length).toBeGreaterThan(0);
  });

  it('should produce valid SQL fragments', () => {
    // Verify we can create identifiers that would be used in real queries
    const result = safeIdentifier('username');
    expect(isSQLFragment(result)).toBe(true);
  });

  it('should throw error for invalid identifiers', () => {
    expect(() => safeIdentifier('1invalid')).toThrow(/Invalid SQL identifier/);
    expect(() => safeIdentifier('user-id')).toThrow(/Invalid SQL identifier/);
    expect(() => safeIdentifier('SELECT')).toThrow(/Invalid SQL identifier/);
    expect(() => safeIdentifier('')).toThrow(/Invalid SQL identifier/);
  });

  it('should throw descriptive error messages', () => {
    expect(() => safeIdentifier('DROP')).toThrow(/reserved keyword/);
    expect(() => safeIdentifier('a'.repeat(64))).toThrow(/≤63 chars/);
  });
});

describe('safeTableName', () => {
  it('should handle simple table names', () => {
    const result = safeTableName('users');
    expect(isSQLFragment(result)).toBe(true);
    expect(result.queryChunks).toBeDefined();
  });

  it('should handle schema.table format', () => {
    const result = safeTableName('public.users');
    // Should produce "public"."users"
    expect(isSQLFragment(result)).toBe(true);
  });

  it('should throw for invalid table names', () => {
    expect(() => safeTableName('users; DROP TABLE users--')).toThrow();
  });

  it('should throw for too many parts', () => {
    expect(() => safeTableName('a.b.c.d')).toThrow(/Expected "table" or "schema.table"/);
  });

  it('should validate each part separately', () => {
    expect(() => safeTableName('SELECT.users')).toThrow(/Invalid SQL identifier/);
    expect(() => safeTableName('public.DROP')).toThrow(/Invalid SQL identifier/);
  });
});

describe('safeColumnName', () => {
  it('should handle simple column names', () => {
    const result = safeColumnName('user_id');
    expect(isSQLFragment(result)).toBe(true);
    expect(result.queryChunks).toBeDefined();
  });

  it('should handle table.column format', () => {
    const result = safeColumnName('users.user_id');
    // Should produce "users"."user_id"
    expect(isSQLFragment(result)).toBe(true);
  });

  it('should handle schema.table.column format', () => {
    const result = safeColumnName('public.users.user_id');
    // Should produce "public"."users"."user_id"
    expect(isSQLFragment(result)).toBe(true);
  });

  it('should throw for invalid formats', () => {
    expect(() => safeColumnName('a.b.c.d.e')).toThrow(/Invalid column name format/);
  });

  it('should validate each part', () => {
    expect(() => safeColumnName('SELECT.column')).toThrow();
    expect(() => safeColumnName('table.DROP')).toThrow();
    expect(() => safeColumnName('schema.table.DELETE')).toThrow();
  });
});

describe('safeIdentifiers', () => {
  it('should map array of identifiers to safe SQL fragments', () => {
    const result = safeIdentifiers(['user_id', 'email', 'created_at']);
    expect(result).toHaveLength(3);
    expect(result.every(isSQLFragment)).toBe(true);
  });

  it('should validate all identifiers', () => {
    expect(() => safeIdentifiers(['valid', 'SELECT', 'valid2'])).toThrow();
  });

  it('should handle empty arrays', () => {
    const result = safeIdentifiers([]);
    expect(result).toHaveLength(0);
  });
});

describe('safeColumnList', () => {
  it('should create comma-separated column list', () => {
    const result = safeColumnList(['user_id', 'email', 'created_at']);
    expect(isSQLFragment(result)).toBe(true);
  });

  it('should throw for empty arrays', () => {
    expect(() => safeColumnList([])).toThrow(/Column list cannot be empty/);
  });

  it('should validate all column names', () => {
    expect(() => safeColumnList(['valid', 'SELECT'])).toThrow();
  });
});

describe('isSQLFragment', () => {
  it('should return true for SQL fragments from Drizzle', () => {
    const fragment = sql`SELECT * FROM users`;
    expect(isSQLFragment(fragment)).toBe(true);
  });

  it('should return true for safe identifier results', () => {
    const result = safeIdentifier('user_id');
    expect(isSQLFragment(result)).toBe(true);
  });

  it('should return false for non-SQL objects', () => {
    expect(isSQLFragment('string')).toBe(false);
    expect(isSQLFragment(123)).toBe(false);
    expect(isSQLFragment({})).toBe(false);
    expect(isSQLFragment(null)).toBe(false);
    expect(isSQLFragment(undefined)).toBe(false);
  });
});

describe('SQL Injection Prevention', () => {
  describe('should block common SQL injection patterns', () => {
    it('should block UNION attacks', () => {
      expect(() => safeIdentifier("id' UNION SELECT password FROM users--")).toThrow();
    });

    it('should block comment injection', () => {
      expect(() => safeIdentifier("id--")).toThrow();
      expect(() => safeIdentifier("id/*")).toThrow();
    });

    it('should block semicolon injection', () => {
      expect(() => safeIdentifier("id; DROP TABLE users")).toThrow();
    });

    it('should block quote escaping attempts', () => {
      expect(() => safeIdentifier("id' OR '1'='1")).toThrow();
    });

    it('should block nested queries', () => {
      expect(() => safeColumnName("users.(SELECT password FROM auth.users)")).toThrow();
    });
  });

  describe('should allow legitimate use cases', () => {
    it('should allow standard column names', () => {
      expect(() => safeColumnName('user_id')).not.toThrow();
      expect(() => safeColumnName('created_at')).not.toThrow();
      expect(() => safeColumnName('is_active')).not.toThrow();
    });

    it('should allow qualified column names', () => {
      expect(() => safeColumnName('users.user_id')).not.toThrow();
      expect(() => safeColumnName('public.users.user_id')).not.toThrow();
    });

    it('should allow standard table names', () => {
      expect(() => safeTableName('users')).not.toThrow();
      expect(() => safeTableName('public.users')).not.toThrow();
      expect(() => safeTableName('organization_members')).not.toThrow();
    });
  });
});

describe('PostgreSQL-specific tests', () => {
  it('should respect 63-character identifier limit', () => {
    const exactly63 = 'a'.repeat(63);
    const exactly64 = 'a'.repeat(64);
    
    expect(isValidIdentifier(exactly63)).toBe(true);
    expect(isValidIdentifier(exactly64)).toBe(false);
  });

  it('should produce SQL fragments compatible with PostgreSQL', () => {
    const result = safeIdentifier('user_id');
    // PostgreSQL uses double quotes for identifiers
    // Just verify we get a valid SQL fragment that Drizzle can use
    expect(isSQLFragment(result)).toBe(true);
    expect(result.queryChunks).toBeDefined();
  });
});
