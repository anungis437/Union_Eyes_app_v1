import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

async function checkClaimsSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    console.log('=== claims table (actual database) ===');
    const dbResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'claims'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Database columns:');
    dbResult.rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Check for schema mismatches
    console.log('\n=== Schema Comparison ===');
    
    const schemaColumns = [
      'claim_id', 'claim_number', 'tenant_id', 'member_id', 'is_anonymous',
      'claim_type', 'status', 'priority', 'incident_date', 'location', 
      'description', 'desired_outcome', 'witnesses_present', 'witness_details',
      'previously_reported', 'previous_report_details', 'assigned_to', 'assigned_at',
      'ai_score', 'ai_analysis', 'merit_confidence', 'precedent_match', 'complexity_score',
      'progress', 'claim_amount', 'settlement_amount', 'legal_costs', 'court_costs',
      'resolution_outcome', 'filed_date', 'resolved_at', 'attachments',
      'voice_transcriptions', 'metadata', 'created_at', 'updated_at', 'closed_at'
    ];
    
    const actualColumns = dbResult.rows.map((r: any) => r.column_name);
    
    console.log('\n⚠️  Columns in Drizzle schema but NOT in database:');
    const missingInDb = schemaColumns.filter(c => !actualColumns.includes(c));
    if (missingInDb.length > 0) {
      missingInDb.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('  ✅ All schema columns exist in database');
    }
    
    console.log('\n⚠️  Columns in database but NOT in schema:');
    const extraInDb = actualColumns.filter(c => !schemaColumns.includes(c));
    if (extraInDb.length > 0) {
      extraInDb.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('  ✅ No extra columns in database');
    }
    
    // Check for tenant_id vs organization_id
    if (actualColumns.includes('organization_id') && !actualColumns.includes('tenant_id')) {
      console.log('\n❌ CRITICAL: Database uses organization_id, but schema defines tenant_id!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkClaimsSchema().catch(console.error);
