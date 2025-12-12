/**
 * Check Database Tables - Verify what tables exist
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

async function checkTables() {
  console.log('🔍 Checking database tables...\n');

  const tablesToCheck = [
    'dues_rules',
    'member_dues_assignments',
    'dues_transactions',
    'employer_remittances',
    'arrears',
    'strike_funds',
    'donations',
    'picket_tracking',
    'stipend_disbursements',
    'notification_queue',
    'notification_templates',
  ];

  for (const table of tablesToCheck) {
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        ) as exists
      `;
      
      const exists = result[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
      
      if (exists) {
        // Check column count
        const columns = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
          ORDER BY ordinal_position
        `;
        console.log(`   └─ ${columns.length} columns`);
      }
    } catch (error: any) {
      console.log(`❌ ${table}: ERROR - ${error.message}`);
    }
  }

  await sql.end();
}

checkTables().catch(console.error);
