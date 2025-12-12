const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verifyAccess() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const query = `
      SELECT 
        om.tenant_id,
        t.tenant_name,
        om.user_id,
        om.name,
        om.email,
        om.role,
        om.status,
        om.membership_number
      FROM organization_members om
      JOIN tenant_management.tenants t ON t.tenant_id = om.tenant_id
      WHERE om.user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb'
      AND om.deleted_at IS NULL
      ORDER BY t.tenant_name;
    `;
    
    const result = await client.query(query);
    
    console.log(`📊 Found ${result.rows.length} tenant access records:\n`);
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyAccess();
