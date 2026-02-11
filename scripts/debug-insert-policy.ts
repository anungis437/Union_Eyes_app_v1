/**
 * Debug message_threads INSERT policy
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

async function debugInsertPolicy() {
  const sql = postgres(connectionString, { max: 1 });
  
  try {
    // Check the INSERT policy
    const policies = await sql`
      SELECT policyname, cmd, with_check
      FROM pg_policies 
      WHERE tablename = 'message_threads' AND cmd = 'INSERT'
    `;
    
    console.log('message_threads INSERT policy:\n');
    policies.forEach((p: any) => {
      console.log(`Policy: ${p.policyname}`);
      console.log(`WITH CHECK: ${p.with_check}\n`);
    });
    
    // Test session context
    console.log('Testing session context...\n');
    
    const testOrgId = '5ae7fec0-94fe-4791-b49c-d6cdf065ac1b';
    const testUserId = 'b475ff68-4e46-47db-baf5-0ad6b5de1ec1';
    const testTenantId = 'ba6d7e2f-a81d-4a8c-8a88-e7d8c8b0d0d0';
    
    await sql`
      SELECT set_config('app.current_user_id', ${testUserId}, false),
             set_config('app.current_tenant_id', ${testTenantId}, false),
             set_config('app.current_organization_id', ${testOrgId}, false)
    `;
    
    const result = await sql`
      SELECT current_user_id() as user_id,
             current_organization_id() as org_id
    `;
    
    console.log('Session context:', result[0]);
    
    // Check if organization_id matches
    console.log('\nOrganization ID comparison:');
    console.log(`  Set in session: ${testOrgId}`);
    console.log(`  From function: ${result[0].org_id}`);
    console.log(`  Match: ${testOrgId === result[0].org_id}`);
    
    await sql.end();
    
  } catch (error: any) {
    console.error('Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

debugInsertPolicy();
