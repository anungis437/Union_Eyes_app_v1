import { db } from '../db/db';
import { sql } from 'drizzle-orm';

async function quickSeed() {
  console.log('Quick seeding organizations and members...\n');

  // Create 3 organizations directly with SQL
  const orgs = [
    { id: crypto.randomUUID(), name: 'Local 101', slug: 'local-101' },
    { id: crypto.randomUUID(), name: 'Local 212', slug: 'local-212' },
    { id: crypto.randomUUID(), name: 'Local 345', slug: 'local-345' }
  ];

  for (const org of orgs) {
    await db.execute(sql`
      INSERT INTO organizations (id, name, slug, display_name, organization_type, hierarchy_path, hierarchy_level, status)
      VALUES (
        ${org.id},
        ${org.name},
        ${org.slug},
        ${org.name},
        'local',
        ARRAY[${org.id}]::uuid[],
        0,
        'active'
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log(`✓ Created organization: ${org.name}`);
  }

  console.log('\nOrganizations created!');
  console.log('Organization IDs:');
  orgs.forEach(org => console.log(`  ${org.name}: ${org.id}`));
  
  process.exit(0);
}

quickSeed().catch(console.error);
