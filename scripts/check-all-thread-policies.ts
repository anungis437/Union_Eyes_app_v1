/**
 * Check all message_threads policies for INSERT+SELECT interaction
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

async function checkAllPolicies() {
  const sql = postgres(connectionString, { max: 1 });
  
  try {
    const policies = await sql`
      SELECT policyname, cmd, qual as using_clause, with_check  
      FROM pg_policies 
      WHERE tablename = 'message_threads'
      ORDER BY cmd, policyname
    `;
    
    console.log('All message_threads RLS policies:\n');
    
    policies.forEach((p: any) => {
      console.log(`📋 ${p.policyname} (${p.cmd})`);
      if (p.using_clause) {
        console.log(`   USING: ${p.using_clause.substring(0, 200)}...`);
      }
      if (p.with_check) {
        console.log(`   WITH CHECK: ${p.with_check.substring(0, 200)}...`);
      }
      console.log('');
    });
    
    await sql.end();
    
  } catch (error: any) {
    console.error('Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

checkAllPolicies();
