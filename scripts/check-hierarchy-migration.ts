import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkMigration() {
  try {
    // Check for functions
    const functionsResult = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN ('get_descendant_org_ids', 'get_ancestor_org_ids', 'user_can_access_org', 'get_current_user_visible_orgs')
      ORDER BY routine_name
    `);
    
    console.log(`\nHierarchical RLS Functions found: ${functionsResult.rows.length}/4`);
    functionsResult.rows.forEach(f => console.log(`  ✓ ${f.routine_name}`));
    
    // Check for RLS policies on organizations table
    const rlsResult = await pool.query(`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'organizations'
      ORDER BY policyname
    `);
    
    console.log(`\nRLS Policies on organizations table: ${rlsResult.rows.length}`);
    rlsResult.rows.forEach(p => console.log(`  ✓ ${p.policyname} (${p.cmd})`));
    
    // Check test requirements
    console.log(`\nTest Requirements Check:`);
    console.log(`  Functions (need 3+): ${functionsResult.rows.length >= 3 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  RLS Policies (need 1+): ${rlsResult.rows.length >= 1 ? '✓ PASS' : '✗ FAIL'}`);
    
    if (functionsResult.rows.length >= 3 && rlsResult.rows.length >= 1) {
      console.log(`\n✅ All requirements met - tests should run`);
    } else {
      console.log(`\n⚠️  Missing requirements - tests will skip`);
      if (rlsResult.rows.length === 0) {
        console.log(`   Need to add RLS policies to organizations table`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMigration();
