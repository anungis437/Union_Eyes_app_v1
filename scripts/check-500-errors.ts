import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function checkErrors() {
  console.log('=== Checking for 500 Error Sources ===\n');

  try {
    // 1. Check if v_critical_deadlines view exists
    console.log('1. Checking v_critical_deadlines view...');
    const viewCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'v_critical_deadlines'
      ) as view_exists
    `);
    console.log('   v_critical_deadlines exists:', viewCheck[0]?.view_exists);

    // 2. Check if deadlines table exists
    console.log('\n2. Checking deadlines table...');
    const deadlinesCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'deadlines'
      ) as table_exists
    `);
    console.log('   deadlines table exists:', deadlinesCheck[0]?.table_exists);

    // 3. Test the getOrganizationAncestors query with the specific org ID from the error
    console.log('\n3. Testing organization path query...');
    const orgId = '458a56cb-251a-4c91-a0b5-81bb8ac39087';
    
    const org = await db.execute(sql`
      SELECT id, slug, hierarchy_path, hierarchy_level 
      FROM organizations 
      WHERE id = ${orgId}
    `);
    console.log('   Organization found:', org.length > 0);
    if (org[0]) {
      console.log('   Organization:', JSON.stringify(org[0], null, 2));
    }

    // 4. If org has hierarchy_path, test getting ancestors
    if (org[0] && org[0].hierarchy_path) {
      console.log('\n4. Testing ancestor query...');
      const ancestors = await db.execute(sql`
        SELECT id, name, slug, hierarchy_level
        FROM organizations 
        WHERE slug = ANY(${org[0].hierarchy_path}::text[])
        ORDER BY hierarchy_level ASC
      `);
      console.log('   Ancestors found:', ancestors.length);
      console.log('   Ancestors:', JSON.stringify(ancestors, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Error during checks:', error);
  } finally {
    await client.end();
  }
}

checkErrors();
