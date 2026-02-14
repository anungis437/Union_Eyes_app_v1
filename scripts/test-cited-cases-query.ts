import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { arbitrationPrecedents } from '../services/financial-service/src/db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool);

async function testQuery() {
  try {
    console.log('Testing arbitration precedents query with cited_cases column...\n');
    
    // Try to query with cited_cases included
    const result = await db
      .select()
      .from(arbitrationPrecedents)
      .limit(1);
    
    console.log('✅ Query successful!');
    console.log('Number of records:', result.length);
    
    if (result.length > 0) {
      console.log('\nSample record fields:');
      console.log('- id:', result[0].id);
      console.log('- caseTitle:', result[0].caseTitle);
      console.log('- citedCases:', result[0].citedCases);
      console.log('- citationCount:', result[0].citationCount);
    } else {
      console.log('\nNo records found in database (table is empty)');
    }
    
  } catch (error: unknown) {
    console.error('❌ Query failed:', error.message);
    if (error.message.includes('cited_cases')) {
      console.error('\n⚠️  The cited_cases column is still causing issues!');
    }
  } finally {
    await pool.end();
  }
}

testQuery();
