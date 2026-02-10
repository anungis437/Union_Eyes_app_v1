import { db } from '../database';
import { sql } from 'drizzle-orm';

async function debugRLSContext() {
  console.log('\n=== Debugging RLS Context ===\n');

  // First check if there are ANY organization_members
  console.log('0. Checking total organization_members:');
  const allMembers = await db.execute(sql`
    SELECT COUNT(*) as total FROM organization_members
  `);
  console.log('Total organization_members:', JSON.stringify(allMembers, null, 2));

  // Test user IDs from rls-hierarchy.test.ts
  const opseu562MemberId = '00000000-0000-0000-0000-000000000005';
  const cupe79MemberId = '00000000-0000-0000-0000-000000000003';
  const claimOrgId = '00000000-0000-0000-0000-000000000006'; // CUPE Local 79

  // Check organization_members for OPSEU member
  console.log('\n1. Checking organization_members for OPSEU 562 member:');
  const opseuMembers = await db.execute(sql`
    SELECT user_id, organization_id, role
    FROM organization_members
    WHERE user_id = ${opseu562MemberId}::VARCHAR
  `);
  console.log('OPSEU 562 member org memberships:', JSON.stringify(opseuMembers, null, 2));

  // Check organization_members for CUPE 79 member
  console.log('\n2. Checking organization_members for CUPE 79 member:');
  const cupeMembers = await db.execute(sql`
    SELECT user_id, organization_id, role
    FROM organization_members
    WHERE user_id = ${cupe79MemberId}::VARCHAR
  `);
  console.log('CUPE 79 member org memberships:', JSON.stringify(cupeMembers, null, 2));

  // Get descendant orgs for OPSEU 562
  console.log('\n3. Getting descendant orgs for OPSEU 562:');
  const opseu562OrgId = '00000000-0000-0000-0000-000000000009'; // OPSEU Local 562
  const opseuDescendants = await db.execute(sql`
    SELECT * FROM get_descendant_org_ids(${opseu562OrgId}::UUID)
  `);
  console.log('OPSEU 562 descendants:', JSON.stringify(opseuDescendants, null, 2));

  // Get descendant orgs for CUPE 79
  console.log('\n4. Getting descendant orgs for CUPE Local 79:');
  const cupeDescendants = await db.execute(sql`
    SELECT * FROM get_descendant_org_ids(${claimOrgId}::UUID)
  `);
  console.log('CUPE 79 descendants:', JSON.stringify(cupeDescendants, null, 2));

  // Simulate RLS SELECT policy check
  console.log('\n5. Simulating RLS SELECT policy for OPSEU member viewing CUPE claim:');
  const rlsCheck = await db.execute(sql`
    SELECT 
      claim_id,
      organization_id as claim_org_id,
      EXISTS (
        SELECT 1 FROM get_descendant_org_ids(
          (SELECT organization_id FROM organization_members 
           WHERE user_id = ${opseu562MemberId}::VARCHAR
           LIMIT 1)
        ) AS descendant_id
        WHERE descendant_id = organization_id::VARCHAR
      ) as should_be_visible
    FROM claims
    WHERE organization_id = ${claimOrgId}::UUID
    LIMIT 1
  `);
  console.log('RLS policy evaluation:', JSON.stringify(rlsCheck, null, 2));

  // Test with CUPE 79 member
  console.log('\n6. Simulating RLS SELECT policy for CUPE 79 member viewing CUPE claim:');
  const rlsCheckCupe = await db.execute(sql`
    SELECT 
      claim_id,
      organization_id as claim_org_id,
      EXISTS (
        SELECT 1 FROM get_descendant_org_ids(
          (SELECT organization_id FROM organization_members 
           WHERE user_id = ${cupe79MemberId}::VARCHAR
           LIMIT 1)
        ) AS descendant_id
        WHERE descendant_id = organization_id::VARCHAR
      ) as should_be_visible
    FROM claims
    WHERE organization_id = ${claimOrgId}::UUID
    LIMIT 1
  `);
  console.log('RLS policy evaluation (CUPE member):', JSON.stringify(rlsCheckCupe, null, 2));

  console.log('\n=== Debug Complete ===\n');
  process.exit(0);
}

debugRLSContext().catch(console.error);
