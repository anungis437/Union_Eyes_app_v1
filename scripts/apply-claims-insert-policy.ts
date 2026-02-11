import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function applyClaimsInsertPolicy() {
  console.log('=== Applying claims_insert_policy update ===\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  const policySql = `
    CREATE POLICY claims_insert_policy ON claims
      FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = current_setting('app.current_user_id', TRUE)::VARCHAR
        )
        OR organization_id = COALESCE(
          NULLIF(current_setting('app.current_organization_id', TRUE), '')::UUID,
          organization_id
        )
      );
  `;

  const client = postgres(connectionString, { onnotice: () => {}, max: 1 });
  try {
    await client.unsafe(`
      DROP POLICY IF EXISTS claims_insert_policy ON claims;
      ${policySql}
    `);
    console.log('✅ claims_insert_policy updated');
  } finally {
    await client.end();
  }
}

applyClaimsInsertPolicy().catch((error) => {
  console.error('\n❌ Policy update failed:', error.message || error);
  process.exitCode = 1;
});
