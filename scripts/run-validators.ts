#!/usr/bin/env node
/**
 * Union Blind-Spot Validator CLI
 * 
 * Runs all compliance validators to identify union-specific gaps
 * that standard security/compliance tools miss.
 * 
 * Usage:
 *   pnpm run validate:blind-spots
 *   pnpm run validate:blind-spots --category=privacy
 *   pnpm run validate:blind-spots --only=1,2,3
 */

import { ValidatorRunner } from './validators/framework';
import { ProvincialPrivacyValidator } from './validators/01-provincial-privacy';
import { OQLFLanguageValidator } from './validators/02-oqlf-language';
import { IndigenousDataValidator } from './validators/03-indigenous-data';
import { StrikeFundTaxValidator } from './validators/04-strike-fund-tax';
import { GeofencePrivacyValidator } from './validators/05-geofence-privacy';
import { CyberInsuranceValidator } from './validators/07-cyber-insurance';
import { OpenSourceLicenseValidator } from './validators/08-open-source-license';
import { TransferPricingValidator } from './validators/12-transfer-pricing';

async function main() {
  const args = process.argv.slice(2);
  const categoryFilter = args.find(arg => arg.startsWith('--category='))?.split('=')[1];
  const onlyFilter = args.find(arg => arg.startsWith('--only='))?.split('=')[1]?.split(',');

  const runner = new ValidatorRunner();

  // Register all validators (8 of 16 implemented so far)
  runner.addValidator(new ProvincialPrivacyValidator());
  runner.addValidator(new OQLFLanguageValidator());
  runner.addValidator(new IndigenousDataValidator());
  runner.addValidator(new StrikeFundTaxValidator());
  runner.addValidator(new GeofencePrivacyValidator());
  runner.addValidator(new CyberInsuranceValidator());
  runner.addValidator(new OpenSourceLicenseValidator());
  runner.addValidator(new TransferPricingValidator());
  
  // TODO: Implement remaining validators (6-7, 9-11, 13-16)

  console.log('\n🔍 Union Blind-Spot Validator\n');
  console.log('Checking for union-specific compliance gaps...\n');

  let results;
  
  if (onlyFilter) {
    const validatorIndices = onlyFilter.map(n => parseInt(n) - 1);
    results = await runner.runSelected(validatorIndices);
  } else if (categoryFilter) {
    results = await runner.runByCategory(categoryFilter);
  } else {
    results = await runner.runAll();
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log(`\n✅ Passed: ${passed}`);
  if (warned > 0) console.log(`⚠️  Warnings: ${warned}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);

  console.log(`\nTotal: ${results.length} validators\n`);

  // Exit with error code if any failures
  if (failed > 0) {
    console.log('⚠️  Critical compliance gaps detected. Review fixes above.\n');
    process.exit(1);
  }

  console.log('✅ All validators passed!\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Validator error:', error);
  process.exit(1);
});
