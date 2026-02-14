/**
 * Check Migration Status
 * 
 * Query the drizzle migration journal to see what migrations have been applied
 */

import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkMigrations() {
  console.log('🔍 Checking migration status...\n');
  
  try {
    // Check if __drizzle_migrations table exists
    const tableExistsQuery = sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle'
        AND table_name = '__drizzle_migrations'
      ) as exists;
    `;
    
    const tableExists = await db.execute(tableExistsQuery);
    
    if (!tableExists.rows || !tableExists.rows[0]) {
      console.log('❌ Could not check if migrations table exists');
      process.exit(1);
    }
    
    const exists = (tableExists.rows[0] as any).exists;
    
    if (!exists) {
      console.log('⚠️  No drizzle migrations table found!');
      console.log('   This means migrations have never been run.');
      console.log('   Run: pnpm db:migrate');
      process.exit(1);
    }
    
    console.log('✅ Drizzle migrations table exists\n');
    
    // Get all applied migrations
    const migrationsQuery = sql`
      SELECT * FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    
    const migrations = await db.execute(migrationsQuery);
    
    if (migrations.rows && migrations.rows.length > 0) {
      console.log(`📋 Last ${migrations.rows.length} migrations:\n`);
      migrations.rows.forEach((row: any, index: number) => {
        const date = new Date(row.created_at).toLocaleString();
        console.log(`  ${index + 1}. ${row.hash} (${date})`);
      });
    } else {
      console.log('⚠️  No migrations found in journal');
    }
    
    console.log('\n✨ Migration check complete!');
    process.exit(0);
    
  } catch (error: unknown) {
    console.error('\n❌ Error checking migrations:');
    console.error(error.message);
    
    if (error.message.includes('drizzle') || error.message.includes('does not exist')) {
      console.log('\n💡 Hint: Run migrations with: pnpm db:migrate');
    }
    
    process.exit(1);
  }
}

checkMigrations();
