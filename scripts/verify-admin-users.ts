import { db } from '../db/db';
import { organizationMembers } from '../db/schema';
import { eq, or } from 'drizzle-orm';

async function verifyUsers() {
  try {
    console.log('🔍 Verifying user organization memberships...\n');
    
    const users = ['a_nungisa@yahoo.ca', 'michel@nungisalaw.ca'];
    
    for (const email of users) {
      const memberships = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.email, email));
      
      console.log(`📧 ${email}:`);
      if (memberships.length === 0) {
        console.log('   ❌ No organization memberships found\n');
      } else {
        memberships.forEach(m => {
          console.log(`   ✅ Organization ID: ${m.organizationId}`);
          console.log(`   ✅ Role: ${m.role}`);
          console.log(`   ✅ Status: ${m.status}`);
          console.log(`   ✅ Name: ${m.name}\n`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

verifyUsers();
