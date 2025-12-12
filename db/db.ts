/**
 * Database Client - Multi-Database Support
 * 
 * This module re-exports the unified database client from the multi-db abstraction layer.
 * It maintains backward compatibility while supporting PostgreSQL and Azure SQL Server.
 * 
 * For direct multi-db operations, import from '@/lib/database/multi-db-client'
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getDatabase as getUnifiedDatabase, checkDatabaseHealth } from "@/lib/database/multi-db-client";

// Legacy PostgreSQL client (for backward compatibility)
// Consider migrating to getUnifiedDatabase() for multi-database support
const connectionOptions = {
  max: 3,               // Lower max connections to prevent overloading
  idle_timeout: 10,     // Shorter idle timeout
  connect_timeout: 5,   // Shorter connect timeout
  prepare: false,       // Disable prepared statements
  keepalive: true,      // Keep connections alive
  debug: false,         // Disable debug logging in production
  connection: {
    application_name: "union-claims-app" // Identify app in database logs
  }
};

// Create a postgres client with optimized connection options
// This is used when DATABASE_TYPE is 'postgresql' or not set
export const client = postgres(process.env.DATABASE_URL!, connectionOptions);

// Create a drizzle client (PostgreSQL only)
export const db = drizzle(client, { schema });

// Export unified database client (supports PostgreSQL and Azure SQL)
export const getDatabase = getUnifiedDatabase;

/**
 * Check database connection health
 * Uses unified health check that supports all database types
 */
export async function checkDatabaseConnection(): Promise<{ ok: boolean, message: string }> {
  const health = await checkDatabaseHealth();
  return {
    ok: health.ok,
    message: health.message
  };
}

/**
 * Function to check and log connection status
 * Supports both PostgreSQL and Azure SQL Server
 */
export async function logDatabaseConnectionStatus(): Promise<void> {
  try {
    const status = await checkDatabaseConnection();
    if (status.ok) {
      console.log(`✓ ${status.message}`);
    } else {
      console.error(`✗ ${status.message}`);
    }
  } catch (error) {
    console.error("Failed to check database connection:", error);
  }
}
