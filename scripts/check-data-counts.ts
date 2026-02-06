import { db } from '../db/index';
import { sql } from 'drizzle-orm';

async function checkCounts() {
  try {
    const counts = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM organization_members`),
      db.execute(sql`SELECT COUNT(*) as count FROM strike_funds`),
      db.execute(sql`SELECT COUNT(*) as count FROM arbitration_precedents`),
      db.execute(sql`SELECT COUNT(*) as count FROM cross_org_access_log`)
    ]);
    
    console.log('📊 Current Data Counts:');
    console.log('   Organization Members:', counts[0][0].count);
    console.log('   Strike Funds:', counts[1][0].count);
    console.log('   Arbitration Precedents:', counts[2][0].count);
    console.log('   Access Logs:', counts[3][0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCounts();
