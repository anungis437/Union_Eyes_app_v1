import pg from 'pg';

const { Client } = pg;

async function checkClaimsRLS() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Check if RLS is enabled
    const rlsEnabled = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname IN ('claims', 'claim_deadlines', 'dues_payments')
    `);
    
    console.log('RLS Status:');
    rlsEnabled.rows.forEach(row => {
      console.log(`  ${row.relname}: ${row.relrowsecurity ? 'ENABLED' : 'DISABLED'}`);
    });
    
    // Check policies on claims
    const policies = await client.query(`
      SELECT 
        schemaname,
        tablename, 
        policyname, 
        permissive,
        cmd
      FROM pg_policies 
      WHERE tablename IN ('claims', 'claim_deadlines', 'dues_payments')
      ORDER BY tablename, policyname
    `);
    
    console.log('\nRLS Policies:');
    if (policies.rows.length === 0) {
      console.log('  ❌ No RLS policies found on these tables!');
    } else {
      policies.rows.forEach(row => {
        console.log(`  ${row.tablename}.${row.policyname} (${row.cmd})`);
      });
    }
    
  } finally {
    await client.end();
  }
}

checkClaimsRLS();
