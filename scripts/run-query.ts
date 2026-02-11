import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * ⚠️  SECURITY WARNING: DANGEROUS SCRIPT - ADMIN USE ONLY! ⚠️ 
 * 
 * This script executes arbitrary SQL queries passed as command-line arguments.
 * This is EXTREMELY DANGEROUS and can be used to:
 * - Delete all data
 * - Expose sensitive information
 * - Bypass all security controls
 * - Cause irreversible damage
 * 
 * ⚠️  DO NOT:
 * - Use with user input
 * - Expose this functionality through APIs
 * - Use in production without audit logging
 * - Share queries that contain sensitive data
 * 
 * ✅ ONLY FOR:
 * - Database administrators
 * - One-off maintenance tasks
 * - Debugging in development environments
 * 
 * Consider using Drizzle Studio or database management tools instead.
 */

async function runQuery() {
  const query = process.argv[2];
  
  if (!query) {
    console.error('Usage: pnpm tsx scripts/run-query.ts "SELECT * FROM table"');
    console.error('\n⚠️  WARNING: This script allows arbitrary SQL execution!');
    console.error('Only use for administrative tasks. Never expose to users.\n');
    process.exit(1);
  }

  // Log warning
  console.warn('⚠️  EXECUTING ARBITRARY SQL - ADMIN SCRIPT');
  console.warn('Query:', query);
  console.warn('');

  try {
    console.log('Executing query:', query);
    // SECURITY WARNING: This is intentionally dangerous for admin use only
    const result = await db.execute(sql.raw(query));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Query failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runQuery();
