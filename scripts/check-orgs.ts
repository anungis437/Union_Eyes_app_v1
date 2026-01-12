import { db } from '../db/db';
import { organizations } from '../db/schema';

async function checkOrgs() {
  try {
    const result = await db.select().from(organizations).limit(5);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkOrgs();
