import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkConstraints() {
  console.log('\n=== Checking Foreign Key Constraints ===\n');
  
  try {
    const constraints = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'user_management'
        AND tc.table_name = 'tenant_users'
    `);
    
    console.log('Foreign Key Constraints on tenant_users:');
    console.log(JSON.stringify(constraints, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkConstraints();
