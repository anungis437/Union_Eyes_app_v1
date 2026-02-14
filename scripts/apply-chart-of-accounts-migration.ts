/**
 * Apply Chart of Accounts Migration
 * 
 * Executes the generated SQL migration to create the unified schema
 */

import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  console.log('🚀 Applying Chart of Accounts migration...\n');
  
  try {
    // Read the SQL migration file
    const migrationPath = path.join(
      process.cwd(), 
      'db/migrations/1770880100906_consolidate_chart_of_accounts.sql'
    );
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let executed = 0;
    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
        executed++;
        
        // Log progress for major operations
        if (statement.toLowerCase().includes('create table')) {
          const tableName = statement.match(/create table (?:if not exists )?(\w+)/i)?.[1];
          console.log(`✅ Created table: ${tableName}`);
        } else if (statement.toLowerCase().includes('create index')) {
          const indexName = statement.match(/create index (?:if not exists )?(\w+)/i)?.[1];
          console.log(`✅ Created index: ${indexName}`);
        } else if (statement.toLowerCase().includes('create type')) {
          const typeName = statement.match(/create type (?:if not exists )?(\w+)/i)?.[1];
          console.log(`✅ Created enum: ${typeName}`);
        } else if (statement.toLowerCase().includes('insert into')) {
          // Don't log every insert statement
        } else if (statement.toLowerCase().includes('comment on')) {
          // Don't log comments
        } else {
          console.log(`✅ Executed statement (${statement.substring(0, 50)}...)`);
        }
      } catch (error: unknown) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Skipping (already exists): ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
    
    console.log(`\n✅ Migration complete! Executed ${executed}/${statements.length} statements\n`);
    
    // Verify tables exist
    const verifyQuery = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('chart_of_accounts', 'account_mappings')
    `);
    
    console.log('📊 Verification:');
    console.log(`   - chart_of_accounts: ${verifyQuery.find((r: any) => r.table_name === 'chart_of_accounts') ? '✅' : '❌'}`);
    console.log(`   - account_mappings: ${verifyQuery.find((r: any) => r.table_name === 'account_mappings') ? '✅' : '❌'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
