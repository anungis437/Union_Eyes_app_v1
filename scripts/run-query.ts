import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function runQuery() {
  const query = process.argv[2];
  
  if (!query) {
    console.error('Usage: pnpm tsx scripts/run-query.ts "SELECT * FROM table"');
    process.exit(1);
  }

  try {
    console.log('Executing query:', query);
    const result = await db.execute(sql.raw(query));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Query failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runQuery();
