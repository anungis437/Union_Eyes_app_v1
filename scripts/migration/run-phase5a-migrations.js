// =====================================================
// Execute Phase 5A Migrations
// Hierarchical Organizations for CLC Support
// =====================================================

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const migrations = [
  '030_hierarchical_organizations.sql',
  '031_migrate_tenant_data.sql',
  '032_update_rls_policies.sql',
];

async function executeMigration(client, filePath) {
  console.log(`\n📄 Executing: ${path.basename(filePath)}`);
  console.log('─'.repeat(60));
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    await client.query(sql);
    console.log(`✅ Success: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error in ${path.basename(filePath)}:`);
    console.error(error.message);
    if (error.position) {
      const lines = sql.split('\n');
      const errorLine = parseInt(error.position);
      console.error(`\nError near line ${errorLine}:`);
      console.error(lines.slice(Math.max(0, errorLine - 3), errorLine + 2).join('\n'));
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Phase 5A: Hierarchical Multi-Tenancy Migration');
  console.log('━'.repeat(60));
  console.log('Target: Canadian Labour Congress (CLC) Support');
  console.log('━'.repeat(60));

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to:', client.database);

    // Check if we're running against production
    if (process.env.DATABASE_URL.includes('postgres.database.azure.com')) {
      console.log('\n⚠️  WARNING: Running against Azure PostgreSQL');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Execute each migration in order
    let allSuccessful = true;
    for (const migrationFile of migrations) {
      const filePath = path.join(__dirname, 'database', 'migrations', migrationFile);
      
      if (!fs.existsSync(filePath)) {
        console.error(`\n❌ Migration file not found: ${filePath}`);
        allSuccessful = false;
        break;
      }

      const success = await executeMigration(client, filePath);
      if (!success) {
        allSuccessful = false;
        console.log('\n🛑 Migration stopped due to error');
        break;
      }
    }

    if (allSuccessful) {
      console.log('\n' + '━'.repeat(60));
      console.log('✨ All migrations completed successfully!');
      console.log('━'.repeat(60));

      // Show summary
      console.log('\n📊 Migration Summary:');
      const result = await client.query(`
        SELECT 
          'Organizations' as entity,
          COUNT(*) as count
        FROM organizations
        UNION ALL
        SELECT 
          'Relationships',
          COUNT(*)
        FROM organization_relationships
        UNION ALL
        SELECT 
          'Organization Members',
          COUNT(*)
        FROM organization_members
        WHERE organization_id IS NOT NULL
      `);
      console.table(result.rows);

      // Show organization hierarchy
      console.log('\n🌳 Organization Hierarchy:');
      const hierarchy = await client.query(`
        SELECT 
          hierarchy_level,
          REPEAT('  ', hierarchy_level) || name as indented_name,
          organization_type,
          short_name,
          member_count,
          ARRAY_TO_STRING(sectors, ', ') as sectors
        FROM organizations
        ORDER BY hierarchy_path
      `);
      console.table(hierarchy.rows);

      console.log('\n✅ Phase 5A migration complete!');
      console.log('\nNext steps:');
      console.log('1. Update API queries to use organization_id');
      console.log('2. Create organization management UI');
      console.log('3. Update tenant context to organization context');
      console.log('4. Test hierarchical access with CLC → Union → Local');
    } else {
      console.log('\n❌ Migration failed. Please review errors above.');
      console.log('Database may be in inconsistent state.');
      console.log('Consider restoring from backup before retrying.');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:');
    console.error(error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

main().catch(console.error);
