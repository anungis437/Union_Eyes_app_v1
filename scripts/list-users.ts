import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function listUsers() {
  const users = await db.execute(sql`
    SELECT DISTINCT user_id, email, name 
    FROM organization_members 
    WHERE email LIKE '%@%' 
    ORDER BY user_id, email
    LIMIT 20
  `);
  
  console.log('\n📋 Recent users in database:\n');
  users.forEach((u: any) => {
    console.log(`  ${u.user_id}`);
    console.log(`  └─ ${u.name} <${u.email}>\n`);
  });
  
  process.exit(0);
}

listUsers();
