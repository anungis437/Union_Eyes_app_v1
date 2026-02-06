import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env' });

async function dropFunctions() {
const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

console.log('🗑️  Dropping conflicting functions...');

await sql`DROP VIEW IF EXISTS v_organization_hierarchy CASCADE`;
await sql`DROP VIEW IF EXISTS v_member_counts_hierarchy CASCADE`;
await sql`DROP VIEW IF EXISTS v_financial_aggregation_hierarchy CASCADE`;
await sql`DROP VIEW IF EXISTS v_statcan_lab05302_export CASCADE`;
await sql`DROP VIEW IF EXISTS v_pending_remittances CASCADE`;
await sql`DROP VIEW IF EXISTS v_annual_remittance_summary CASCADE`;
await sql`DROP FUNCTION IF EXISTS get_child_organizations(UUID) CASCADE`;
await sql`DROP FUNCTION IF EXISTS get_parent_organizations(UUID) CASCADE`;
await sql`DROP FUNCTION IF EXISTS get_aggregate_member_count(UUID) CASCADE`;
await sql`DROP FUNCTION IF EXISTS generate_statcan_export(INTEGER) CASCADE`;
await sql`DROP FUNCTION IF EXISTS calculate_per_capita_remittance(UUID, INTEGER, INTEGER) CASCADE`;
await sql`DROP FUNCTION IF EXISTS generate_monthly_remittances(INTEGER, INTEGER) CASCADE`;
await sql`DROP FUNCTION IF EXISTS log_organization_hierarchy_changes() CASCADE`;
await sql`DROP FUNCTION IF EXISTS update_organization_hierarchy_path() CASCADE`;
await sql`DROP TRIGGER IF EXISTS trg_log_hierarchy_changes ON organizations`;
await sql`DROP TRIGGER IF EXISTS trg_update_organization_hierarchy_path ON organizations`;

console.log('✅ Dropped all conflicting views, functions, and triggers');

await sql.end();
}

dropFunctions();
