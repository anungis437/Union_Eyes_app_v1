/**
 * Chaos Engineering Test Script
 * 
 * Run chaos experiments to test system resilience
 * 
 * Usage:
 *   tsx scripts/run-chaos-tests.ts --experiment high-latency
 *   tsx scripts/run-chaos-tests.ts --all
 */

import { ChaosMonkey } from '../lib/chaos-engineering/chaos-monkey.js';
import {
  CHAOS_EXPERIMENTS,
  runExperiment,
  runAllExperiments,
  type ChaosExperiment,
} from '../lib/chaos-engineering/experiments.js';

async function main() {
  const args = process.argv.slice(2);
  const experimentName = args[0]?.replace('--experiment=', '') || args[1];
  const runAll = args.includes('--all');

  // Initialize chaos monkey
  const chaos = new ChaosMonkey({
    enabled: true,
    environment: 'development',
  });

  if (runAll) {
    await runAllExperiments(chaos);
  } else if (experimentName) {
    const experiment = CHAOS_EXPERIMENTS.find(
      (exp) => exp.name.toLowerCase() === experimentName.toLowerCase().replace(/-/g, ' ')
    );

    if (!experiment) {
      console.error(`❌ Experiment not found: ${experimentName}`);
      console.log('\nAvailable experiments:');
      CHAOS_EXPERIMENTS.forEach((exp: ChaosExperiment) => {
        console.log(`  - ${exp.name}`);
      });
      process.exit(1);
    }

    await runExperiment(experiment, chaos);
  } else {
    console.log('Usage:');
    console.log('  tsx scripts/run-chaos-tests.ts --experiment <name>');
    console.log('  tsx scripts/run-chaos-tests.ts --all');
    console.log('\nAvailable experiments:');
    CHAOS_EXPERIMENTS.forEach((exp: ChaosExperiment) => {
      console.log(`  - ${exp.name.toLowerCase().replace(/ /g, '-')}`);
    });
  }
}

main().catch(console.error);
