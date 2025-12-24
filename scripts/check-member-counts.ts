import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function checkMemberCounts() {
  console.log('\n📊 Member counts per organization:\n');
  
  const results = await db.execute(sql`
    SELECT 
      o.id,
      o.name,
      o.slug,
      COUNT(om.id) as member_count
    FROM organizations o
    LEFT JOIN organization_members om ON om.organization_id = o.id::text
      AND om.deleted_at IS NULL
    GROUP BY o.id, o.name, o.slug
    ORDER BY member_count DESC, o.name
  `);
  
  let totalMembers = 0;
  
  results.forEach((row: any) => {
    const count = Number(row.member_count);
    totalMembers += count;
    console.log(`  ${row.name}`);
    console.log(`  └─ ${count} active members (slug: ${row.slug})`);
    console.log('');
  });
  
  console.log(`\n✅ Total members across all orgs: ${totalMembers}\n`);
  
  process.exit(0);
}

checkMemberCounts().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
