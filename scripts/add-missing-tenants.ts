import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function main() {
  // Get org IDs that don't have corresponding tenant records
  const result = await db.execute(sql`
    SELECT o.id, o.slug, o.name
    FROM organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_management.tenants t 
      WHERE t.tenant_id = o.id
    )
  `);
  
  console.log(`Found ${result.length} organizations without tenant records:`);
  result.forEach((org: any) => {
    console.log(`  - ${org.id}: ${org.name} (slug: ${org.slug})`);
  });
  
  // Insert them with unique slugs if needed
  for (const org of result) {
    let slug = org.slug;
    let suffix = 1;
    
    while (true) {
      try {
        await db.execute(sql`
          INSERT INTO tenant_management.tenants (
            tenant_id, 
            tenant_slug, 
            tenant_name, 
            subscription_tier, 
            status
          )
          VALUES (
            ${org.id}, 
            ${slug}, 
            ${org.name},
            'free',
            'active'
          )
        `);
        console.log(`  ✅ Added tenant ${org.name} with slug ${slug}`);
        break;
      } catch (e: any) {
        if (e.code === '23505') {
          // Slug collision, try with suffix
          slug = `${org.slug}-${suffix}`;
          suffix++;
        } else {
          throw e;
        }
      }
    }
  }
  
  // Final count
  const finalCount = await db.execute(sql`SELECT COUNT(*) as count FROM tenant_management.tenants`);
  console.log(`\n✅ Total tenants: ${finalCount[0].count}`);
  
  process.exit(0);
}

main().catch(console.error);
