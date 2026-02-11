import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkDuesTables() {
  const result = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('dues_payments', 'dues_transactions')
    ORDER BY table_name
  `);

  console.log(result);
  process.exit(0);
}

checkDuesTables().catch((error) => {
  console.error(error);
  process.exit(1);
});
