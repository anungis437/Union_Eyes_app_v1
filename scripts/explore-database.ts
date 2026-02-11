/**
 * Check Database Schema
 * 
 * This script explores the database structure
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
  console.log('🔍 Exploring Database Structure...\n');
  
  try {
    // Check current database
    console.log('1️⃣  Current connection info...\n');
    
    const currentDbQuery = sql`
      SELECT current_database(), current_schema(), current_user;
    `;
    
    const currentInfo = await db.execute(currentDbQuery);
    
    if (currentInfo.rows && currentInfo.rows.length > 0) {
      const info = currentInfo.rows[0] as any;
      console.log(`  Database: ${info.current_database}`);
      console.log(`  Schema: ${info.current_schema}`);
      console.log(`  User: ${info.current_user}`);
    }
    
    // Check all schemas
    console.log('\n2️⃣  All schemas in database...\n');
    
    const schemasQuery = sql`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name;
    `;
    
    const schemas = await db.execute(schemasQuery);
    
    if (schemas.rows && schemas.rows.length > 0) {
      console.log(`Found ${schemas.rows.length} schemas:\n`);
      schemas.rows.forEach((row: any) => {
        console.log(`  - ${row.schema_name}`);
      });
    }
    
    // Check tables in ALL schemas (not just public)
    console.log('\n3️⃣  All tables in all schemas...\n');
    
    const allTablesQuery = sql`
      SELECT 
        schemaname, 
        tablename
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schemaname, tablename;
    `;
    
    const allTables = await db.execute(allTablesQuery);
    
    if (allTables.rows && allTables.rows.length > 0) {
      console.log(`Found ${allTables.rows.length} tables:\n`);
      
      let currentSchema = '';
      allTables.rows.forEach((row: any) => {
        if (row.schemaname !== currentSchema) {
          currentSchema = row.schemaname;
          console.log(`\n  📁 ${currentSchema}:`);
        }
        console.log(`     - ${row.tablename}`);
      });
    } else {
      console.log('  ⚠️  No tables found in any schema');
    }
    
    // Check if our specific tables exist anywhere
    console.log('\n4️⃣  Searching for messaging tables...\n');
    
    const messageTablesQuery = sql`
      SELECT 
        schemaname,
        tablename
      FROM pg_tables 
      WHERE tablename LIKE '%message%' OR tablename LIKE '%notification%'
      ORDER BY schemaname, tablename;
    `;
    
    const messageTables = await db.execute(messageTablesQuery);
    
    if (messageTables.rows && messageTables.rows.length > 0) {
      console.log(`Found ${messageTables.rows.length} messaging-related tables:\n`);
      messageTables.rows.forEach((row: any) => {
        console.log(`  - ${row.schemaname}.${row.tablename}`);
      });
    } else {
      console.log('  ⚠️  No messaging tables found');
    }
    
    console.log('\n✨ Exploration complete!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error during exploration:');
    console.error(error);
    process.exit(1);
  }
}

// Run check
checkDatabase();
