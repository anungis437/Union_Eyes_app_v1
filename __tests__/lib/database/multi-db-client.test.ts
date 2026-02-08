/**
 * Unit Tests: Database Abstraction Layer - Multi-Database Client
 * Tests database configuration, client creation, and connection logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDatabaseConfig,
  createDatabaseClient,
  type DatabaseType,
} from '@/lib/database/multi-db-client';

// Mock external dependencies
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn((client) => ({
    query: {},
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    execute: vi.fn(),
  })),
}));

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: vi.fn(() => ({
    query: {},
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    execute: vi.fn(),
  })),
}));

vi.mock('postgres', () => ({
  default: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn(),
  })),
}));

vi.mock('pg', () => {
  class Pool {
    query = vi.fn();
    connect = vi.fn();
    end = vi.fn();
  }

  return { Pool };
});

describe('Multi-DB Client - Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return PostgreSQL configuration by default', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    
    const config = getDatabaseConfig();
    
    expect(config.type).toBe('postgresql');
    expect(config.connectionString).toBe('postgresql://user:pass@localhost:5432/db');
  });

  it('should use DATABASE_TYPE environment variable', () => {
    process.env.DATABASE_TYPE = 'azure-sql';
    process.env.AZURE_SQL_CONNECTION_STRING = 'Server=test.database.windows.net';
    
    const config = getDatabaseConfig();
    
    expect(config.type).toBe('azure-sql');
    expect(config.connectionString).toBe('Server=test.database.windows.net');
  });

  it('should parse pool configuration from environment', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.DB_POOL_MAX = '20';
    process.env.DB_IDLE_TIMEOUT = '60';
    process.env.DB_CONNECTION_TIMEOUT = '15';
    process.env.DB_SSL = 'true';
    
    const config = getDatabaseConfig();
    
    expect(config.options?.max).toBe(20);
    expect(config.options?.idleTimeout).toBe(60);
    expect(config.options?.connectionTimeout).toBe(15);
    expect(config.options?.ssl).toBe(true);
  });

  it('should use default pool values when not specified', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    delete process.env.DB_POOL_MAX;
    delete process.env.DB_IDLE_TIMEOUT;
    
    const config = getDatabaseConfig();
    
    expect(config.options?.max).toBe(10);
    expect(config.options?.idleTimeout).toBe(30);
    expect(config.options?.connectionTimeout).toBe(10);
  });

  it('should fallback to empty connection string when DATABASE_URL missing', () => {
    delete process.env.DATABASE_URL;
    delete process.env.AZURE_SQL_CONNECTION_STRING;
    
    const config = getDatabaseConfig();
    
    expect(config.connectionString).toBe('');
  });
});

describe('Multi-DB Client - Client Creation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create PostgreSQL client for postgresql type', async () => {
    const config = {
      type: 'postgresql' as DatabaseType,
      connectionString: 'postgresql://localhost:5432/test',
      options: { max: 10, idleTimeout: 30, connectionTimeout: 10 },
    };

    const client = await createDatabaseClient(config);

    expect(client).toBeDefined();
    expect(client.query).toBeDefined();
    expect(client.insert).toBeDefined();
    expect(client.select).toBeDefined();
  });

  it('should create Azure SQL client for azure-sql type', async () => {
    const config = {
      type: 'azure-sql' as DatabaseType,
      connectionString: 'Server=test.database.windows.net;Database=test',
      options: { max: 5 },
    };

    const client = await createDatabaseClient(config);

    expect(client).toBeDefined();
    expect(client.query).toBeDefined();
  });

  it('should create MSSQL client for mssql type', async () => {
    const config = {
      type: 'mssql' as DatabaseType,
      connectionString: 'Server=localhost;Database=test',
    };

    const client = await createDatabaseClient(config);

    expect(client).toBeDefined();
    expect(client.transaction).toBeDefined();
  });

  it('should use environment config when no config provided', async () => {
    process.env.DATABASE_TYPE = 'postgresql';
    process.env.DATABASE_URL = 'postgresql://localhost/testdb';

    const client = await createDatabaseClient();

    expect(client).toBeDefined();
    expect(client.execute).toBeDefined();
  });

  it('should default to PostgreSQL for unknown database type', async () => {
    const config = {
      type: 'unknown' as DatabaseType,
      connectionString: 'postgresql://localhost/db',
    };

    const client = await createDatabaseClient(config);

    expect(client).toBeDefined();
  });
});

describe('Multi-DB Client - Connection Options', () => {
  it('should support custom max connections', async () => {
    const config = {
      type: 'postgresql' as DatabaseType,
      connectionString: 'postgresql://localhost/test',
      options: { max: 50 },
    };

    const client = await createDatabaseClient(config);

    expect(client).toBeDefined();
  });

  it('should support custom idle timeout', async () => {
    const config = {
      type: 'postgresql' as DatabaseType,
      connectionString: 'postgresql://localhost/test',
      options: { idleTimeout: 120 },
    };

    const client = await createDatabaseClient(config);

    expect(client).toBeDefined();
  });

  it('should support SSL configuration', async () => {
    const config = {
      type: 'postgresql' as DatabaseType,
      connectionString: 'postgresql://localhost/test',
      options: { ssl: true },
    };

    const client = await createDatabaseClient(config);

    expect(client).toBeDefined();
  });
});
