/**
 * Chart of Accounts Schema Consolidation Script
 * 
 * Consolidates duplicate chart of accounts schemas:
 * - services/clc/chart-of-accounts.ts (hardcoded constant)
 * - db/schema/clc-per-capita-schema.ts (clcChartOfAccounts table)
 * - services/financial-service/drizzle/schema.ts (duplicate table)
 * - db/schema/domains/finance/accounting.ts (chartOfAccounts table)
 * - db/schema/domains/data/accounting.ts (externalAccounts table)
 * 
 * Strategy:
 * 1. Create unified schema in db/schema/domains/financial/
 * 2. Generate seed data from CLC_CHART_OF_ACCOUNTS constant
 * 3. Migrate existing data
 * 4. Update service to use DB instead of constant
 * 
 * Usage:
 *   pnpm run schema:consolidate --dry-run   (preview changes)
 *   pnpm run schema:consolidate             (execute migration)
 */

import fs from 'fs';
import path from 'path';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';

// ======================================================================
// CONFIGURATION
// ======================================================================

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const SCHEMA_FILES = {
  // Source of truth: CLC constant
  clcConstant: path.join(process.cwd(), 'services/clc/chart-of-accounts.ts'),
  
  // Duplicate schemas to consolidate
  clcSchema1: path.join(process.cwd(), 'db/schema/clc-per-capita-schema.ts'),
  clcSchema2: path.join(process.cwd(), 'services/financial-service/drizzle/schema.ts'),
  generalLedger: path.join(process.cwd(), 'db/schema/domains/finance/accounting.ts'),
  externalAccounts: path.join(process.cwd(), 'db/schema/domains/data/accounting.ts'),
  
  // Target: unified schema
  unifiedSchema: path.join(process.cwd(), 'db/schema/domains/financial/chart-of-accounts.ts'),
};

const MIGRATION_OUTPUT = path.join(
  process.cwd(),
  'db/migrations',
  `${Date.now()}_consolidate_chart_of_accounts.sql`
);

// ======================================================================
// EXTRACT CLC ACCOUNTS FROM CONSTANT
// ======================================================================

/**
 * Parse CLC_CHART_OF_ACCOUNTS from source file
 */
function extractCLCAccounts(): any[] {
  const content = fs.readFileSync(SCHEMA_FILES.clcConstant, 'utf-8');
  
  // Extract the array definition
  const arrayMatch = content.match(/const CLC_CHART_OF_ACCOUNTS:\s*CLCAccount\[\]\s*=\s*\[([\s\S]*?)\];/);
  
  if (!arrayMatch) {
    throw new Error('Could not find CLC_CHART_OF_ACCOUNTS array in source file');
  }
  
  // Parse account objects (simplified - assumes proper formatting)
  const accountsText = arrayMatch[1];
  const accounts: any[] = [];
  
  // Split by account objects (look for opening braces)
  const accountMatches = accountsText.matchAll(/\{([^}]+)\}/gs);
  
  for (const match of accountMatches) {
    const accountText = match[1];
    const account: any = {};
    
    // Extract fields
    const codeMatch = accountText.match(/code:\s*['"]([^'"]+)['"]/);
    const nameMatch = accountText.match(/name:\s*['"]([^'"]+)['"]/);
    const typeMatch = accountText.match(/type:\s*['"]([^'"]+)['"]/);
    const categoryMatch = accountText.match(/category:\s*['"]([^'"]+)['"]/);
    const descMatch = accountText.match(/description:\s*['"]([^'"]+)['"]/);
    const parentMatch = accountText.match(/parentCode:\s*['"]([^'"]+)['"]/);
    const statcanMatch = accountText.match(/statcanCode:\s*['"]([^'"]+)['"]/);
    const isActiveMatch = accountText.match(/isActive:\s*(true|false)/);
    const sortOrderMatch = accountText.match(/sortOrder:\s*(\d+)/);
    
    if (codeMatch && nameMatch && typeMatch) {
      account.code = codeMatch[1];
      account.name = nameMatch[1];
      account.type = typeMatch[1];
      account.category = categoryMatch?.[1] || null;
      account.description = descMatch?.[1] || null;
      account.parentCode = parentMatch?.[1] || null;
      account.statcanCode = statcanMatch?.[1] || null;
      account.isActive = isActiveMatch?.[1] === 'true';
      account.sortOrder = sortOrderMatch ? parseInt(sortOrderMatch[1]) : null;
      
      accounts.push(account);
    }
  }
  
  console.log(`✅ Extracted ${accounts.length} accounts from CLC constant`);
  return accounts;
}

// ======================================================================
// GENERATE UNIFIED SCHEMA
// ======================================================================

function generateUnifiedSchema(): string {
  return `/**
 * Unified Chart of Accounts Schema
 * 
 * CONSOLIDATED SCHEMA - Single source of truth for all chart of accounts
 * 
 * Replaces:
 * - db/schema/clc-per-capita-schema.ts (clcChartOfAccounts)
 * - services/financial-service/drizzle/schema.ts (clcChartOfAccounts duplicate)
 * - db/schema/domains/finance/accounting.ts (chartOfAccounts)
 * 
 * Related:
 * - db/schema/domains/data/accounting.ts (externalAccounts - ERP integration)
 * 
 * Generated: ${new Date().toISOString()}
 */

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from '../../../schema-organizations';

// ============================================================================
// ENUMS
// ============================================================================

export const accountTypeEnum = pgEnum('account_type', [
  'revenue',
  'expense',
  'asset',
  'liability',
  'equity',
]);

export const accountCategoryEnum = pgEnum('account_category', [
  'dues_revenue',
  'per_capita_revenue',
  'other_revenue',
  'salaries_wages',
  'administrative',
  'legal_professional',
  'strike_fund',
  'education_training',
  'organizing',
  'political_action',
  'assets',
  'liabilities',
  'equity',
]);

// ============================================================================
// UNIFIED CHART OF ACCOUNTS TABLE
// ============================================================================

/**
 * Unified Chart of Accounts
 * 
 * Supports:
 * - CLC standardized accounts (4000-7000 series)
 * - Custom organization accounts
 * - Multi-level hierarchy
 * - Integration with external ERP systems
 */
export const chartOfAccounts = pgTable(
  'chart_of_accounts',
  {
    // Identity
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' }),
    
    // Account identification
    accountCode: varchar('account_code', { length: 50 }).notNull(),
    accountName: varchar('account_name', { length: 255 }).notNull(),
    description: text('description'),
    
    // Classification
    accountType: accountTypeEnum('account_type').notNull(),
    accountCategory: accountCategoryEnum('account_category'),
    
    // Hierarchy
    parentAccountCode: varchar('parent_account_code', { length: 50 }),
    level: integer('level').default(0), // 0 = root, 1 = sub-account, etc.
    sortOrder: integer('sort_order'),
    
    // CLC/StatCan reporting
    isCLCStandard: boolean('is_clc_standard').default(false),
    statisticsCanadaCode: varchar('statistics_canada_code', { length: 50 }),
    financialStatementLine: varchar('financial_statement_line', { length: 100 }),
    
    // Status
    isActive: boolean('is_active').default(true),
    isSystem: boolean('is_system').default(false), // Cannot be edited by users
    
    // External ERP mapping
    externalSystemId: varchar('external_system_id', { length: 255 }), // QuickBooks, Xero ID
    externalProvider: varchar('external_provider', { length: 50 }), // QUICKBOOKS, XERO
    lastSyncedAt: timestamp('last_synced_at'),
    
    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    createdBy: varchar('created_by', { length: 255 }),
    updatedBy: varchar('updated_by', { length: 255 }),
  },
  (table) => ({
    // Indexes for performance
    orgAccountCodeIdx: index('chart_accounts_org_code_idx').on(
      table.organizationId,
      table.accountCode
    ),
    accountCodeIdx: index('chart_accounts_code_idx').on(table.accountCode),
    parentCodeIdx: index('chart_accounts_parent_idx').on(table.parentAccountCode),
    typeIdx: index('chart_accounts_type_idx').on(table.accountType),
    categoryIdx: index('chart_accounts_category_idx').on(table.accountCategory),
    clcIdx: index('chart_accounts_clc_idx').on(table.isCLCStandard),
    externalIdx: index('chart_accounts_external_idx').on(
      table.externalProvider,
      table.externalSystemId
    ),
    
    // Unique constraints
    uniqueOrgAccountCode: unique('chart_accounts_org_code_unique').on(
      table.organizationId,
      table.accountCode
    ),
    // CLC standard accounts are global (null organizationId)
    uniqueCLCAccountCode: unique('chart_accounts_clc_code_unique').on(
      table.accountCode,
      table.isCLCStandard
    ),
  })
);

export const chartOfAccountsRelations = relations(
  chartOfAccounts,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [chartOfAccounts.organizationId],
      references: [organizations.id],
    }),
  })
);

// ============================================================================
// ACCOUNT MAPPINGS (for transaction templates)
// ============================================================================

export const accountMappings = pgTable(
  'account_mappings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' }),
    
    // Transaction type
    transactionType: varchar('transaction_type', { length: 100 }).notNull(),
    transactionCategory: varchar('transaction_category', { length: 100 }),
    
    // Double-entry mapping
    debitAccountCode: varchar('debit_account_code', { length: 50 }).notNull(),
    creditAccountCode: varchar('credit_account_code', { length: 50 }).notNull(),
    
    // Metadata
    description: text('description'),
    isActive: boolean('is_active').default(true),
    
    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orgTypeIdx: index('account_mappings_org_type_idx').on(
      table.organizationId,
      table.transactionType
    ),
    transactionTypeIdx: index('account_mappings_type_idx').on(table.transactionType),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;
export type AccountMapping = typeof accountMappings.$inferSelect;
export type NewAccountMapping = typeof accountMappings.$inferInsert;
`;
}

// ======================================================================
// GENERATE SQL MIGRATION
// ======================================================================

function generateMigrationSQL(accounts: any[]): string {
  const lines: string[] = [];
  
  lines.push('-- ============================================================================');
  lines.push('-- Chart of Accounts Schema Consolidation Migration');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- ============================================================================');
  lines.push('');
  
  // 1. Create enums
  lines.push('-- Create enums');
  lines.push(`CREATE TYPE IF NOT EXISTS account_type AS ENUM (
  'revenue',
  'expense',
  'asset',
  'liability',
  'equity'
);`);
  lines.push('');
  
  lines.push(`CREATE TYPE IF NOT EXISTS account_category AS ENUM (
  'dues_revenue',
  'per_capita_revenue',
  'other_revenue',
  'salaries_wages',
  'administrative',
  'legal_professional',
  'strike_fund',
  'education_training',
  'organizing',
  'political_action',
  'assets',
  'liabilities',
  'equity'
);`);
  lines.push('');
  
  // 2. Create unified table
  lines.push('-- Create unified chart_of_accounts table');
  lines.push(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Account identification
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Classification
  account_type account_type NOT NULL,
  account_category account_category,
  
  -- Hierarchy
  parent_account_code VARCHAR(50),
  level INTEGER DEFAULT 0,
  sort_order INTEGER,
  
  -- CLC/StatCan reporting
  is_clc_standard BOOLEAN DEFAULT FALSE,
  statistics_canada_code VARCHAR(50),
  financial_statement_line VARCHAR(100),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  
  -- External ERP mapping
  external_system_id VARCHAR(255),
  external_provider VARCHAR(50),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  
  -- Constraints
  CONSTRAINT chart_accounts_org_code_unique UNIQUE (organization_id, account_code),
  CONSTRAINT chart_accounts_clc_code_unique UNIQUE (account_code, is_clc_standard)
);`);
  lines.push('');
  
  // 3. Create indexes
  lines.push('-- Create indexes for performance');
  lines.push('CREATE INDEX IF NOT EXISTS chart_accounts_org_code_idx ON chart_of_accounts(organization_id, account_code);');
  lines.push('CREATE INDEX IF NOT EXISTS chart_accounts_code_idx ON chart_of_accounts(account_code);');
  lines.push('CREATE INDEX IF NOT EXISTS chart_accounts_parent_idx ON chart_of_accounts(parent_account_code);');
  lines.push('CREATE INDEX IF NOT EXISTS chart_accounts_type_idx ON chart_of_accounts(account_type);');
  lines.push('CREATE INDEX IF NOT EXISTS chart_accounts_category_idx ON chart_of_accounts(account_category);');
  lines.push('CREATE INDEX IF NOT EXISTS chart_accounts_clc_idx ON chart_of_accounts(is_clc_standard);');
  lines.push('CREATE INDEX IF NOT EXISTS chart_accounts_external_idx ON chart_of_accounts(external_provider, external_system_id);');
  lines.push('');
  
  // 4. Create account_mappings table
  lines.push('-- Create account_mappings table for transaction templates');
  lines.push(`CREATE TABLE IF NOT EXISTS account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_type VARCHAR(100) NOT NULL,
  transaction_category VARCHAR(100),
  debit_account_code VARCHAR(50) NOT NULL,
  credit_account_code VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
  lines.push('');
  
  lines.push('CREATE INDEX IF NOT EXISTS account_mappings_org_type_idx ON account_mappings(organization_id, transaction_type);');
  lines.push('CREATE INDEX IF NOT EXISTS account_mappings_type_idx ON account_mappings(transaction_type);');
  lines.push('');
  
  // 5. Seed CLC standard accounts
  lines.push('-- Seed CLC standard chart of accounts');
  lines.push('-- NOTE: These are global (organization_id = NULL) and marked as is_clc_standard = TRUE');
  lines.push('');
  
  for (const account of accounts) {
    const values = [
      `'${account.code}'`, // account_code
      `'${account.name.replace(/'/g, "''")}'`, // account_name
      account.description ? `'${account.description.replace(/'/g, "''")}'` : 'NULL', // description
      `'${account.type}'::account_type`, // account_type
      account.category ? `'${account.category}'::account_category` : 'NULL', // account_category
      account.parentCode ? `'${account.parentCode}'` : 'NULL', // parent_account_code
      account.parentCode ? '1' : '0', // level (simple: 0 or 1)
      account.sortOrder || 'NULL', // sort_order
      'TRUE', // is_clc_standard
      account.statcanCode ? `'${account.statcanCode}'` : 'NULL', // statistics_canada_code
      'NULL', // financial_statement_line
      account.isActive !== false ? 'TRUE' : 'FALSE', // is_active
      'TRUE', // is_system
    ];
    
    lines.push(`INSERT INTO chart_of_accounts (
  organization_id,
  account_code,
  account_name,
  description,
  account_type,
  account_category,
  parent_account_code,
  level,
  sort_order,
  is_clc_standard,
  statistics_canada_code,
  financial_statement_line,
  is_active,
  is_system
) VALUES (
  NULL,
  ${values.join(',\n  ')}
) ON CONFLICT (account_code, is_clc_standard) DO NOTHING;`);
    lines.push('');
  }
  
  // 6. Migrate existing data from old tables
  lines.push('-- Migrate existing organization-specific accounts from clc_chart_of_accounts');
  lines.push(`INSERT INTO chart_of_accounts (
  organization_id,
  account_code,
  account_name,
  description,
  account_type,
  account_category,
  parent_account_code,
  is_clc_standard,
  statistics_canada_code,
  financial_statement_line,
  is_active,
  created_at,
  updated_at
)
SELECT
  NULL as organization_id, -- Old schema had no org_id
  account_code,
  account_name,
  description,
  account_type::account_type,
  NULL::account_category, -- Map manually if needed
  parent_account_code,
  TRUE as is_clc_standard,
  statistics_canada_code,
  financial_statement_line,
  COALESCE(is_active, TRUE),
  created_at,
  updated_at
FROM clc_chart_of_accounts
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts coa
  WHERE coa.account_code = clc_chart_of_accounts.account_code
  AND coa.is_clc_standard = TRUE
)
ON CONFLICT (account_code, is_clc_standard) DO NOTHING;`);
  lines.push('');
  
  // 7. Add comments
  lines.push('-- Add table comments');
  lines.push(`COMMENT ON TABLE chart_of_accounts IS 'Unified chart of accounts - consolidates CLC standard accounts and organization-specific accounts';`);
  lines.push(`COMMENT ON COLUMN chart_of_accounts.is_clc_standard IS 'TRUE for CLC standard accounts (4000-7000 series), FALSE for custom org accounts';`);
  lines.push(`COMMENT ON COLUMN chart_of_accounts.is_system IS 'TRUE for system accounts that cannot be modified by users';`);
  lines.push('');
  
  // 8. Deprecation notice
  lines.push('-- ============================================================================');
  lines.push('-- DEPRECATION NOTICE');
  lines.push('-- ============================================================================');
  lines.push('-- The following tables are now deprecated and should be removed after migration:');
  lines.push('-- 1. clc_chart_of_accounts (db/schema/clc-per-capita-schema.ts)');
  lines.push('-- 2. financial_service.clc_chart_of_accounts (services/financial-service/drizzle/schema.ts)');
  lines.push('--');
  lines.push('-- DO NOT DROP YET - Validate data migration first!');
  lines.push('-- After validation:');
  lines.push('--   DROP TABLE IF EXISTS clc_chart_of_accounts CASCADE;');
  lines.push('');
  
  return lines.join('\n');
}

// ======================================================================
// GENERATE SEED DATA SCRIPT
// ======================================================================

function generateSeedScript(accounts: any[]): string {
  return `/**
 * Seed CLC Standard Chart of Accounts
 * 
 * Generated from services/clc/chart-of-accounts.ts constant
 * ${new Date().toISOString()}
 */

import { db } from '@/db/db';
import { chartOfAccounts } from '@/db/schema/domains/financial/chart-of-accounts';

const CLC_ACCOUNTS = ${JSON.stringify(accounts, null, 2)};

export async function seedCLCAccounts() {
  console.log('Seeding CLC standard chart of accounts...');
  
  for (const account of CLC_ACCOUNTS) {
    await db.insert(chartOfAccounts).values({
      organizationId: null, // CLC accounts are global
      accountCode: account.code,
      accountName: account.name,
      description: account.description,
      accountType: account.type as any,
      accountCategory: account.category as any,
      parentAccountCode: account.parentCode || null,
      level: account.parentCode ? 1 : 0,
      sortOrder: account.sortOrder,
      isCLCStandard: true,
      statisticsCanadaCode: account.statcanCode || null,
      isActive: account.isActive !== false,
      isSystem: true,
    }).onConflictDoNothing();
  }
  
  console.log(\`✅ Seeded \${CLC_ACCOUNTS.length} CLC accounts\`);
}

// Run if called directly
if (require.main === module) {
  seedCLCAccounts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
`;
}

// ======================================================================
// MAIN EXECUTION
// ======================================================================

async function main() {
  console.log('🔧 Chart of Accounts Schema Consolidation\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'EXECUTION'}\n`);
  
  // Step 1: Extract accounts from constant
  console.log('📊 Step 1: Extracting CLC accounts from constant...');
  const accounts = extractCLCAccounts();
  
  if (VERBOSE) {
    console.log('\nSample accounts:');
    accounts.slice(0, 5).forEach(acc => {
      console.log(`  - ${acc.code}: ${acc.name} (${acc.type})`);
    });
    console.log(`  ... and ${accounts.length - 5} more\n`);
  }
  
  // Step 2: Generate unified schema
  console.log('📝 Step 2: Generating unified schema file...');
  const schemaContent = generateUnifiedSchema();
  
  if (!DRY_RUN) {
    const schemaDir = path.dirname(SCHEMA_FILES.unifiedSchema);
    if (!fs.existsSync(schemaDir)) {
      fs.mkdirSync(schemaDir, { recursive: true });
    }
    fs.writeFileSync(SCHEMA_FILES.unifiedSchema, schemaContent, 'utf-8');
    console.log(`✅ Created: ${SCHEMA_FILES.unifiedSchema}`);
  } else {
    console.log(`📄 Would create: ${SCHEMA_FILES.unifiedSchema}`);
  }
  
  // Step 3: Generate SQL migration
  console.log('\n📝 Step 3: Generating SQL migration...');
  const migrationSQL = generateMigrationSQL(accounts);
  
  if (!DRY_RUN) {
    const migrationDir = path.dirname(MIGRATION_OUTPUT);
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }
    fs.writeFileSync(MIGRATION_OUTPUT, migrationSQL, 'utf-8');
    console.log(`✅ Created: ${MIGRATION_OUTPUT}`);
  } else {
    console.log(`📄 Would create: ${MIGRATION_OUTPUT}`);
    if (VERBOSE) {
      console.log('\nMigration preview (first 50 lines):');
      console.log(migrationSQL.split('\n').slice(0, 50).join('\n'));
      console.log('\n... (truncated)');
    }
  }
  
  // Step 4: Generate seed script
  console.log('\n📝 Step 4: Generating seed data script...');
  const seedScript = generateSeedScript(accounts);
  const seedPath = path.join(process.cwd(), 'scripts/seed-clc-accounts.ts');
  
  if (!DRY_RUN) {
    fs.writeFileSync(seedPath, seedScript, 'utf-8');
    console.log(`✅ Created: ${seedPath}`);
  } else {
    console.log(`📄 Would create: ${seedPath}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 CONSOLIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n📊 Accounts extracted: ${accounts.length}`);
  console.log(`📁 Files ${DRY_RUN ? 'to be created' : 'created'}:`);
  console.log(`   1. ${SCHEMA_FILES.unifiedSchema}`);
  console.log(`   2. ${MIGRATION_OUTPUT}`);
  console.log(`   3. ${seedPath}`);
  
  console.log('\n📚 Next steps:');
  if (DRY_RUN) {
    console.log('   1. Review this output');
    console.log('   2. Run without --dry-run to execute');
  } else {
    console.log('   1. Review generated files');
    console.log('   2. Run migration: psql $DATABASE_URL -f ' + MIGRATION_OUTPUT);
    console.log('   3. Or use Drizzle: pnpm db:migrate');
    console.log('   4. Update imports in existing code');
    console.log('   5. Test thoroughly before deprecating old schemas');
  }
  
  console.log('\n⚠️  IMPORTANT:');
  console.log('   - Back up database before running migration');
  console.log('   - Test in staging environment first');
  console.log('   - Update all imports to use new unified schema');
  console.log('   - Do NOT drop old tables until fully validated');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  if (VERBOSE) {
    console.error(error.stack);
  }
  process.exit(1);
});
