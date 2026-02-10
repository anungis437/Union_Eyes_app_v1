#!/usr/bin/env node
/**
 * Hierarchy Validation Script
 * 
 * Validates organizational hierarchy integrity:
 * - Detects circular references
 * - Finds orphaned organizations
 * - Checks hierarchy depth limits
 * - Validates path consistency
 * 
 * Usage:
 *   pnpm tsx scripts/validate-hierarchy.ts
 *   pnpm tsx scripts/validate-hierarchy.ts --fix-orphans
 */

import { validateAllOrganizations, fixOrphanedOrganizations, findOrphanedOrganizations } from '../lib/utils/hierarchy-validation';

const args = process.argv.slice(2);
const shouldFixOrphans = args.includes('--fix-orphans');

async function main() {
  console.log('🔍 Starting hierarchy validation...\n');

  // Run comprehensive validation
  const results = await validateAllOrganizations();

  // Display summary
  console.log('📊 VALIDATION SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Total Organizations: ${results.total}`);
  console.log(`✅ Valid: ${results.valid}`);
  console.log(`❌ Invalid: ${results.invalid}`);
  console.log(`🔗 Orphaned: ${results.orphans}`);
  console.log('═'.repeat(50));
  console.log();

  // Display issues
  if (results.issues.length > 0) {
    console.log('⚠️  VALIDATION ISSUES');
    console.log('═'.repeat(50));
    for (const issue of results.issues) {
      console.log(`\n📍 ${issue.orgName} (${issue.orgId.slice(0, 8)}...)`);
      
      if (issue.errors.length > 0) {
        console.log('  ❌ Errors:');
        issue.errors.forEach((err: string) => console.log(`     - ${err}`));
      }
      
      if (issue.warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        issue.warnings.forEach((warn: string) => console.log(`     - ${warn}`));
      }
    }
    console.log();
  }

  // Handle orphans
  if (results.orphans > 0) {
    console.log('🔗 ORPHANED ORGANIZATIONS');
    console.log('═'.repeat(50));
    const orphanIds = await findOrphanedOrganizations();
    console.log(`Found ${orphanIds.length} organizations with invalid parent references`);
    console.log(`Orphan IDs: ${orphanIds.map((id: string) => id.slice(0, 8)).join(', ')}...`);
    console.log();

    if (shouldFixOrphans) {
      console.log('🔧 Fixing orphaned organizations...');
      const fixed = await fixOrphanedOrganizations(orphanIds);
      console.log(`✅ Fixed ${fixed} orphaned organizations`);
      console.log();
    } else {
      console.log('💡 Run with --fix-orphans to automatically fix these issues');
      console.log();
    }
  }

  // Final status
  if (results.invalid === 0 && results.orphans === 0) {
    console.log('✅ All organizations have valid hierarchy structure!');
    process.exit(0);
  } else {
    console.log('❌ Validation completed with issues. Please review and fix.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Hierarchy validation failed:', error);
  process.exit(1);
});
