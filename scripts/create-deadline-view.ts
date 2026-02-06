import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function createView() {
  console.log('=== Creating v_critical_deadlines View ===\n');

  try {
    await db.execute(sql`
      CREATE OR REPLACE VIEW v_critical_deadlines AS
      SELECT 
        cd.*,
        CASE 
          WHEN cd.due_date::date < CURRENT_DATE THEN true
          ELSE false
        END as is_overdue_calc,
        CASE 
          WHEN cd.due_date::date < CURRENT_DATE 
          THEN CURRENT_DATE - cd.due_date::date
          ELSE 0
        END as days_overdue_calc,
        CASE 
          WHEN cd.due_date::date >= CURRENT_DATE 
          THEN cd.due_date::date - CURRENT_DATE
          ELSE NULL
        END as days_until_due_calc
      FROM claim_deadlines cd
      WHERE cd.status IN ('pending', 'extended')
        AND (
          cd.due_date::date < CURRENT_DATE 
          OR cd.due_date::date <= CURRENT_DATE + 3
        )
    `);
    
    console.log('✅ v_critical_deadlines view created successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

createView();
