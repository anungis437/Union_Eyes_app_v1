import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env' });

(async () => {
  console.log('🗑️  Dropping 045 tables...');
  
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    await sql`DROP TABLE IF EXISTS signature_workflow_steps CASCADE`;
    await sql`DROP TABLE IF EXISTS signature_workflows CASCADE`;
    await sql`DROP TABLE IF EXISTS attestation_templates CASCADE`;
    await sql`DROP TABLE IF EXISTS digital_signatures CASCADE`;
    await sql`DROP TABLE IF EXISTS root_certificates CASCADE`;
    await sql`DROP TYPE IF EXISTS signature_type CASCADE`;
    await sql`DROP TYPE IF EXISTS signature_status CASCADE`;
    
    console.log('✅ Dropped all migration 045 objects');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
})();
