/**
 * Database Abstraction Layer - Multi-Database Support
 * 
 * Provides unified interface for Drizzle ORM supporting:
 * - PostgreSQL (Supabase)
 * - Azure SQL Server
 * - Local PostgreSQL
 */

import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleMssql } from 'drizzle-orm/node-postgres';
import postgres from 'postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';
import { eq, and, or, sql, inArray, isNull, desc, asc, ilike, gte, lte } from 'drizzle-orm';

// Database types
export type DatabaseType = 'postgresql' | 'azure-sql' | 'mssql';

// Database configuration
interface DatabaseConfig {
  type: DatabaseType;
  connectionString: string;
  options?: {
    max?: number;
    idleTimeout?: number;
    connectionTimeout?: number;
    ssl?: boolean;
  };
}

// Unified database client interface
export interface UnifiedDatabaseClient {
  query: any;
  insert: any;
  update: any;
  delete: any;
  select: any;
  transaction: any;
  execute: any;
}

/**
 * Get database configuration from environment
 */
export function getDatabaseConfig(): DatabaseConfig {
  const dbType = (process.env.DATABASE_TYPE || 'postgresql') as DatabaseType;
  const connectionString = process.env.DATABASE_URL || process.env.AZURE_SQL_CONNECTION_STRING || '';

  return {
    type: dbType,
    connectionString,
    options: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10'),
      ssl: process.env.DB_SSL === 'true',
    },
  };
}

/**
 * Create database client based on configuration
 */
export async function createDatabaseClient(config?: DatabaseConfig): Promise<UnifiedDatabaseClient> {
  const dbConfig = config || getDatabaseConfig();

  switch (dbConfig.type) {
    case 'azure-sql':
    case 'mssql':
      return createAzureSqlClient(dbConfig);
    case 'postgresql':
    default:
      return createPostgresClient(dbConfig);
  }
}

/**
 * Create PostgreSQL client (Supabase compatible)
 */
function createPostgresClient(config: DatabaseConfig): UnifiedDatabaseClient {
  const client = postgres(config.connectionString, {
    max: config.options?.max || 10,
    idle_timeout: config.options?.idleTimeout || 30,
    connect_timeout: config.options?.connectionTimeout || 10,
    prepare: false,
  });

  return drizzlePg(client, { schema }) as UnifiedDatabaseClient;
}

/**
 * Create Azure SQL / MSSQL client
 */
function createAzureSqlClient(config: DatabaseConfig): UnifiedDatabaseClient {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.options?.max || 10,
    idleTimeoutMillis: (config.options?.idleTimeout || 30) * 1000,
    connectionTimeoutMillis: (config.options?.connectionTimeout || 10) * 1000,
    ssl: config.options?.ssl ? { rejectUnauthorized: false } : undefined,
  });

  return drizzleMssql(pool, { schema }) as UnifiedDatabaseClient;
}

/**
 * Execute query with database abstraction
 * Handles differences between PostgreSQL and Azure SQL syntax
 */
export async function executeQuery<T = any>(
  db: UnifiedDatabaseClient,
  queryFn: (db: UnifiedDatabaseClient) => Promise<T>
): Promise<T> {
  try {
    return await queryFn(db);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Handle full-text search differences between databases
 */
export function createFullTextSearchQuery(
  searchTerm: string,
  columns: string[],
  dbType: DatabaseType = 'postgresql'
) {
  if (dbType === 'azure-sql' || dbType === 'mssql') {
    // Azure SQL uses CONTAINS or FREETEXT
    const searchCondition = columns
      .map(col => `CONTAINS(${col}, '${searchTerm}')`)
      .join(' OR ');
    return sql.raw(`(${searchCondition})`);
  } else {
    // PostgreSQL uses to_tsquery and ts_rank
    const searchCondition = columns
      .map(col => `to_tsvector('english', ${col}) @@ plainto_tsquery('english', '${searchTerm}')`)
      .join(' OR ');
    return sql.raw(`(${searchCondition})`);
  }
}

/**
 * Handle date/time functions differences
 */
export function getCurrentTimestamp(dbType: DatabaseType = 'postgresql') {
  if (dbType === 'azure-sql' || dbType === 'mssql') {
    return sql`GETUTCDATE()`;
  } else {
    return sql`NOW()`;
  }
}

/**
 * Handle array operations differences
 */
export function arrayAppend(
  column: string,
  value: string,
  dbType: DatabaseType = 'postgresql'
) {
  if (dbType === 'azure-sql' || dbType === 'mssql') {
    // Azure SQL doesn't have native array type, use JSON
    return sql`JSON_MODIFY(${sql.raw(column)}, 'append $', ${value})`;
  } else {
    // PostgreSQL array_append
    return sql`array_append(${sql.raw(column)}, ${value})`;
  }
}

/**
 * Handle ILIKE vs LIKE differences
 */
export function createLikeQuery(
  column: any,
  pattern: string,
  dbType: DatabaseType = 'postgresql'
) {
  if (dbType === 'azure-sql' || dbType === 'mssql') {
    // Azure SQL LIKE is case-insensitive by default with proper collation
    return sql`${column} LIKE ${pattern}`;
  } else {
    // PostgreSQL ILIKE for case-insensitive
    return ilike(column, pattern);
  }
}

/**
 * Handle JSON operations differences
 */
export function jsonExtract(
  column: string,
  path: string,
  dbType: DatabaseType = 'postgresql'
) {
  if (dbType === 'azure-sql' || dbType === 'mssql') {
    return sql`JSON_VALUE(${sql.raw(column)}, '${sql.raw(path)}')`;
  } else {
    return sql`${sql.raw(column)}::jsonb->>'${sql.raw(path)}'`;
  }
}

/**
 * Handle UUID generation differences
 */
export function generateUuid(dbType: DatabaseType = 'postgresql') {
  if (dbType === 'azure-sql' || dbType === 'mssql') {
    return sql`NEWID()`;
  } else {
    return sql`gen_random_uuid()`;
  }
}

/**
 * Handle pagination differences (LIMIT/OFFSET vs TOP/OFFSET)
 */
export function createPaginationQuery(
  limit: number,
  offset: number,
  dbType: DatabaseType = 'postgresql'
) {
  if (dbType === 'azure-sql' || dbType === 'mssql') {
    // Azure SQL uses OFFSET...FETCH NEXT
    return {
      offset: sql`OFFSET ${offset} ROWS`,
      limit: sql`FETCH NEXT ${limit} ROWS ONLY`,
    };
  } else {
    // PostgreSQL uses LIMIT/OFFSET
    return {
      offset: sql`OFFSET ${offset}`,
      limit: sql`LIMIT ${limit}`,
    };
  }
}

/**
 * Handle boolean type differences
 */
export function createBooleanQuery(
  column: any,
  value: boolean,
  dbType: DatabaseType = 'postgresql'
) {
  if (dbType === 'azure-sql' || dbType === 'mssql') {
    // Azure SQL uses BIT (0/1)
    return eq(column, value ? 1 : 0);
  } else {
    // PostgreSQL uses BOOLEAN
    return eq(column, value);
  }
}

/**
 * Handle NULL checks differences
 */
export function createNullCheck(
  column: any,
  checkNull: boolean = true,
  dbType: DatabaseType = 'postgresql'
) {
  if (checkNull) {
    return isNull(column);
  } else {
    if (dbType === 'azure-sql' || dbType === 'mssql') {
      return sql`${column} IS NOT NULL`;
    } else {
      return sql`${column} IS NOT NULL`;
    }
  }
}

/**
 * Export common Drizzle operators
 */
export { eq, and, or, sql, inArray, isNull, desc, asc, ilike, gte, lte };

/**
 * Singleton database instance
 */
let dbInstance: UnifiedDatabaseClient | null = null;

export async function getDatabase(): Promise<UnifiedDatabaseClient> {
  if (!dbInstance) {
    dbInstance = await createDatabaseClient();
  }
  return dbInstance;
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  message: string;
  type: DatabaseType;
}> {
  const config = getDatabaseConfig();
  
  try {
    const db = await getDatabase();
    const startTime = Date.now();
    
    // Simple health check query
    await executeQuery(db, async (db) => {
      if (config.type === 'azure-sql' || config.type === 'mssql') {
        return await db.execute(sql`SELECT 1`);
      } else {
        return await db.execute(sql`SELECT 1`);
      }
    });
    
    const duration = Date.now() - startTime;
    
    return {
      ok: true,
      message: `Database connection successful (${duration}ms)`,
      type: config.type,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      type: config.type,
    };
  }
}

