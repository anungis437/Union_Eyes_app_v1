import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  onnotice: () => {}, // Suppress notices
});
const db = drizzle(client);

async function updateClaimDeadlinesColumn() {
  console.log('=== Updating claim_deadlines to use organization_id ===\n');

  try {
    // Check if organization_id column already exists
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'claim_deadlines' 
      AND column_name IN ('tenant_id', 'organization_id')
    `);
    
    console.log('Current columns:', columnCheck.map((c: any) => c.column_name));

    const hasTenantId = columnCheck.some((c: any) => c.column_name === 'tenant_id');
    const hasOrgId = columnCheck.some((c: any) => c.column_name === 'organization_id');

    if (hasTenantId && !hasOrgId) {
      console.log('\n1. Renaming tenant_id to organization_id...');
      await db.execute(sql`
        ALTER TABLE claim_deadlines 
        RENAME COLUMN tenant_id TO organization_id
      `);
      console.log('   ✅ Column renamed');

      console.log('\n2. Updating column type to UUID...');
      await db.execute(sql`
        ALTER TABLE claim_deadlines 
        ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID
      `);
      console.log('   ✅ Column type updated');

      console.log('\n3. Dropping old RLS policies...');
      await db.execute(sql`
        DROP POLICY IF EXISTS claim_deadlines_select_policy ON claim_deadlines;
        DROP POLICY IF EXISTS claim_deadlines_insert_policy ON claim_deadlines;
        DROP POLICY IF EXISTS claim_deadlines_update_policy ON claim_deadlines;
        DROP POLICY IF EXISTS claim_deadlines_delete_policy ON claim_deadlines;
      `);
      console.log('   ✅ Old policies dropped');

      console.log('\n4. Creating new RLS policies with organization_id...');
      await db.execute(sql`
        CREATE POLICY claim_deadlines_select_policy ON claim_deadlines
          FOR SELECT
          USING (
            organization_id IN (
              SELECT * FROM get_descendant_org_ids(
                (SELECT organization_id FROM organization_members 
                 WHERE user_id = current_setting('app.current_user_id', TRUE)::VARCHAR 
                 LIMIT 1)
              )
            )
          );

        CREATE POLICY claim_deadlines_insert_policy ON claim_deadlines
          FOR INSERT
          WITH CHECK (
            organization_id IN (
              SELECT organization_id FROM organization_members 
              WHERE user_id = current_setting('app.current_user_id', TRUE)::VARCHAR
            )
          );

        CREATE POLICY claim_deadlines_update_policy ON claim_deadlines
          FOR UPDATE
          USING (
            organization_id IN (
              SELECT * FROM get_descendant_org_ids(
                (SELECT organization_id FROM organization_members 
                 WHERE user_id = current_setting('app.current_user_id', TRUE)::VARCHAR 
                 LIMIT 1)
              )
            )
          );

        CREATE POLICY claim_deadlines_delete_policy ON claim_deadlines
          FOR DELETE
          USING (
            EXISTS (
              SELECT 1 
              FROM organization_members om
              WHERE om.user_id = current_setting('app.current_user_id', TRUE)::VARCHAR
                AND om.organization_id = claim_deadlines.organization_id
                AND om.role = 'admin'
                AND om.status = 'active'
            )
          );
      `);
      console.log('   ✅ New policies created');

    } else if (hasOrgId) {
      console.log('\n✅ Table already has organization_id column');
    } else {
      console.log('\n❌ Table structure unexpected - manual intervention required');
    }

    console.log('\n✅ Migration complete!');

  } catch (error: unknown) {
    console.error('\n❌ Error:', error.message || error);
  } finally {
    await client.end();
  }
}

updateClaimDeadlinesColumn();
