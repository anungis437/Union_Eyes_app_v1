/**
 * Test Utilities and Helpers
 * Common utilities for testing across the application
 */

import { vi } from 'vitest';
import React from 'react';

/**
 * Mock Database Client
 * Provides mock implementation of Drizzle ORM database client
 */
export const createMockDb = () => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
      orderBy: vi.fn(() => Promise.resolve([])),
      limit: vi.fn(() => Promise.resolve([])),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
      onConflictDoUpdate: vi.fn(() => Promise.resolve([])),
      onConflictDoNothing: vi.fn(() => Promise.resolve([])),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({ changes: 0 })),
      returning: vi.fn(() => Promise.resolve([])),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve({ changes: 0 })),
  })),
  execute: vi.fn(() => Promise.resolve({ rows: [] })),
  transaction: vi.fn((callback) => callback(createMockDb())),
});

/**
 * Mock Supabase Client
 * Provides mock implementation of Supabase client for integration tests
 */
export const createMockSupabase = () => ({
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      in: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
      download: vi.fn(() => Promise.resolve({ data: null, error: null })),
      remove: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
});

/**
 * Create a mock fetch response
 */
export const createMockFetchResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
  blob: async () => new Blob([JSON.stringify(data)]),
  arrayBuffer: async () => new ArrayBuffer(0),
  headers: new Headers(),
  redirected: false,
  statusText: ok ? 'OK' : 'Error',
  type: 'basic' as ResponseType,
  url: '',
  clone: vi.fn(),
  body: null,
  bodyUsed: false,
});

/**
 * Create test wrapper with NextIntl provider
 */
export const createIntlWrapper = (locale = 'en', messages = {}) => {
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement('div', { 'data-testid': 'intl-wrapper' }, children);
};

/**
 * Wait for async operations in tests
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Create mock logger
 */
export const createMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

/**
 * Create mock encryption service
 */
export const createMockEncryption = () => ({
  encrypt: vi.fn((text: string) => `encrypted_${text}`),
  decrypt: vi.fn((cipher: string) => cipher.replace('encrypted_', '')),
  encryptSIN: vi.fn((sin: string) => `encrypted_${sin}`),
  decryptSIN: vi.fn((cipher: string) => cipher.replace('encrypted_', '')),
  hash: vi.fn((text: string) => `hashed_${text}`),
});

/**
 * Create mock date utilities
 */
export const createMockDate = (isoString: string) => {
  const date = new Date(isoString);
  vi.setSystemTime(date);
  return date;
};

/**
 * Reset mock date to current time
 */
export const resetMockDate = () => {
  vi.useRealTimers();
};

/**
 * Create test user
 */
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'member',
  tenantId: 'test-tenant',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

/**
 * Create test organization
 */
export const createTestOrganization = (overrides = {}) => ({
  id: 'test-org-id',
  name: 'Test Organization',
  type: 'local',
  status: 'active',
  jurisdiction: 'CA-ON',
  memberCount: 100,
  createdAt: new Date('2025-01-01'),
  ...overrides,
});

/**
 * Create test member
 */
export const createTestMember = (overrides = {}) => ({
  id: 'test-member-id',
  userId: 'test-user-id',
  organizationId: 'test-org-id',
  membershipNumber: 'MEM-001',
  status: 'active',
  joinDate: new Date('2025-06-01'),
  goodStanding: true,
  ...overrides,
});

/**
 * Skip integration tests if no database connection
 */
export const skipIfNoDatabaseConnection = () => {
  const hasDbConnection = process.env.DATABASE_URL || process.env.SUPABASE_URL;
  if (!hasDbConnection) {
return true;
  }
  return false;
};

/**
 * Mock environment variables for test
 */
export const mockEnvVars = (vars: Record<string, string>) => {
  const original = { ...process.env };
  Object.assign(process.env, vars);
  return () => {
    process.env = original;
  };
};
