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
import { JointTrustFMVValidator } from './validators/06-joint-trust-fmv';
import { CyberInsuranceValidator } from './validators/07-cyber-insurance';
import { OpenSourceLicenseValidator } from './validators/08-open-source-license';
import { ESGUnionWashingValidator } from './validators/09-esg-union-washing';
import { SkillSuccessionValidator } from './validators/10-skill-succession';
import { FounderConflictValidator } from './validators/11-founder-conflict';
import { TransferPricingValidator } from './validators/12-transfer-pricing';
import { ForceMajeureValidator } from './validators/13-force-majeure';
import { LMBPImmigrationValidator } from './validators/14-lmbp-immigration';
import { CarbonExposureValidator } from './validators/15-carbon-exposure';
import { GoldenShareValidator } from './validators/16-golden-share';

async function main() {
  const args = process.argv.slice(2);
  const categoryFilter = args.find(arg => arg.startsWith('--category='))?.split('=')[1];
  const onlyFilter = args.find(arg => arg.startsWith('--only='))?.split('=')[1]?.split(',');

  const runner = new ValidatorRunner();

  // Register all 16 validators ✅
  runner.register(new ProvincialPrivacyValidator());
  runner.register(new OQLFLanguageValidator());
  runner.register(new IndigenousDataValidator());
  runner.register(new StrikeFundTaxValidator());
  runner.register(new GeofencePrivacyValidator());
  runner.register(new JointTrustFMVValidator());
  runner.register(new CyberInsuranceValidator());
  runner.register(new OpenSourceLicenseValidator());
  runner.register(new ESGUnionWashingValidator());
  runner.register(new SkillSuccessionValidator());
  runner.register(new FounderConflictValidator());
  runner.register(new TransferPricingValidator());
  runner.register(new ForceMajeureValidator());
  runner.register(new LMBPImmigrationValidator());
  runner.register(new CarbonExposureValidator());
  runner.register(new GoldenShareValidator());

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
