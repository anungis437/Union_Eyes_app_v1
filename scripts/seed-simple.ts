/**
 * Simplified Data Seeding Script
 * Seeds only tables that don't require the non-existent 'tenants' table
 */

import { db } from '../db/db';
import { 
  organizations,
  arbitrationPrecedents,
  crossOrgAccessLog,
  pensionTrusteeBoards,
  pensionTrustees
} from '../db/migrations/schema';
import crypto from 'crypto';

// Realistic data generators
const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const GRIEVANCE_TYPES = ['termination', 'discipline', 'seniority', 'wages', 'benefits', 'hours', 'safety'];
const OUTCOMES = ['upheld', 'denied', 'partial', 'settled'];
const JURISDICTIONS = ['ON', 'BC', 'AB', 'QC', 'NS', 'MB'];
const SECTORS = ['public', 'healthcare', 'education', 'manufacturing', 'service'];

function random<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0]; // Return date part only for date fields
}

async function seedArbitrationPrecedents(orgIds: string[]) {
  console.log('\n⚖️  Seeding arbitration precedents...');
  
  for (let i = 0; i < 30; i++) {
    const sourceOrg = random(orgIds);
    const firstName = random(FIRST_NAMES);
    const lastName = random(LAST_NAMES);
    const arbitrator = `${firstName} ${lastName}`;
    const year = randomInt(2020, 2024);
    const grievanceType = random(GRIEVANCE_TYPES);
    const outcome = random(OUTCOMES);
    
    await db.insert(arbitrationPrecedents).values({
      sourceOrganizationId: sourceOrg,
      caseTitle: `Union Local vs. Employer Corp ${year}-${i.toString().padStart(3, '0')}`,
      arbitratorName: arbitrator,
      decisionDate: randomDate(randomInt(30, 1095)),
      grievanceType,
      issueSummary: `Arbitration decision regarding ${grievanceType} case.`,
      decisionSummary: `The arbitrator ruled ${outcome} based on contract interpretation and past practices.`,
      outcome,
      jurisdiction: random(JURISDICTIONS),
      sector: random(SECTORS),
      keyPrinciples: [`Principle 1: Contract interpretation`, `Principle 2: Past practices`],
      precedentialValue: random(['high', 'medium', 'low']),
      sharingLevel: random(['private', 'public']),
      citationCount: randomInt(0, 15),
      viewCount: randomInt(5, 150),
      createdBy: random(orgIds), // Using org ID as creator
      createdAt: randomDate(randomInt(30, 1095)),
      updatedAt: randomDate(randomInt(1, 30)),
    });
  }
  
  console.log(`  ✅ Created 30 arbitration precedents`);
}

async function seedPensionData(orgIds: string[]) {
  console.log('\n🏦 Seeding pension trust boards and trustees...');
  
  const boardCount = 5;
  const boardIds: string[] = [];
  
  // Create pension trust boards (requires pension_plans, so create a fake ID)
  // Actually, let's skip this since it requires pension_plans foreign key
  console.log(`  ⚠️  Skipped pension trust boards (requires pension_plans table)`);
}

async function seedAnalyticsData(orgIds: string[]) {
  console.log('\n📊 Seeding analytics cross-org access logs...');
  
  for (let i = 0; i < 100; i++) {
    const userId = crypto.randomUUID();
    const sourceOrg = random(orgIds);
    const targetOrg = random(orgIds);
    
    await db.insert(crossOrgAccessLog).values({
      userId,
      userOrganizationId: sourceOrg,
      resourceType: random(['precedent', 'analytics', 'best_practice', 'template']),
      resourceId: crypto.randomUUID(),
      resourceOrganizationId: targetOrg,
      accessType: random(['view', 'search', 'download', 'reference']),
      metadata: {
        searchQuery: random(['termination', 'discipline', 'seniority', 'wages']),
        resultPosition: randomInt(1, 20),
      },
      createdAt: new Date(Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  console.log(`  ✅ Created 100 cross-org access logs`);
}

async function main() {
  console.log('🌱 Simplified Data Seeding for Union Claims Platform\n');
  console.log('========================================================\n');
  
  // Get existing organizations
  const existingOrgs = await db.select().from(organizations);
  const orgIds = existingOrgs.map(org => org.id);
  
  if (orgIds.length === 0) {
    console.error('❌ No organizations found. Please create organizations first.');
    process.exit(1);
  }
  
  console.log(`📋 Found ${orgIds.length} existing organizations`);
  
  // Seed all data (skip tables that need tenants table)
  await seedArbitrationPrecedents(orgIds);
  await seedAnalyticsData(orgIds);
  await seedPensionData(orgIds); // Will skip inside
  
  console.log('\n========================================================');
  console.log('✅ Data seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   Organizations: ${orgIds.length}`);
  console.log(`   Arbitration Precedents: 30`);
  console.log(`   Analytics Access Logs: 100\n`);
  console.log('\n⚠️  Note: Skipped tables that require the non-existent tenants table:');
  console.log('   - organization_members');
  console.log('   - strike_funds');
  console.log('   - pension_trust_boards/trustees\n');
}

main().catch((error) => {
  console.error('❌ Error seeding data:', error);
  process.exit(1);
});
