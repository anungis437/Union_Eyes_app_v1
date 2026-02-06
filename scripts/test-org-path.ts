import { db } from "@/db/db";
import { organizations } from "@/db/schema-organizations";
import { eq, inArray, asc } from "drizzle-orm";

async function testOrgPath() {
  const orgId = '458a56cb-251a-4c91-a0b5-81bb8ac39087';
  
  console.log('=== Testing Organization Path Query ===\n');
  
  try {
    // Step 1: Find the organization
    console.log('1. Looking up organization by ID:', orgId);
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    
    if (!org) {
      console.log('   ❌ Organization not found!');
      return;
    }
    
    console.log('   ✅ Organization found:', {
      id: org.id,
      name: org.name,
      slug: org.slug,
      hierarchyPath: org.hierarchyPath,
      hierarchyLevel: org.hierarchyLevel
    });
    
    // Step 2: Check hierarchy path
    if (!org.hierarchyPath || org.hierarchyPath.length === 0) {
      console.log('\n2. No hierarchy path - returning empty array');
      return;
    }
    
    console.log('\n2. Hierarchy path:', org.hierarchyPath);
    
    // Step 3: Get ancestors
    console.log('\n3. Fetching ancestors using hierarchy path...');
    const ancestors = await db
      .select()
      .from(organizations)
      .where(inArray(organizations.slug, org.hierarchyPath))
      .orderBy(asc(organizations.hierarchyLevel));
    
    console.log('   ✅ Found', ancestors.length, 'ancestors:');
    ancestors.forEach(a => {
      console.log('     -', a.name, `(${a.slug}) - Level ${a.hierarchyLevel}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
  
  process.exit(0);
}

testOrgPath();
