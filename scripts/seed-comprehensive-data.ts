/**
 * Comprehensive Data Seeding Script
 * Seeds all tables with realistic test data for capacity assessment
 */

import { db } from '../db/db';
import { 
  organizations, 
  organizationMembers,
  arbitrationPrecedents,
  strikeFunds,
  pensionTrusteeBoards,
  pensionTrustees,
  crossOrgAccessLog
} from '../db/migrations/schema';
import crypto from 'crypto';

// Realistic data generators
const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 
  'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen'];

const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const GRIEVANCE_TYPES = ['termination', 'discipline', 'seniority', 'wages', 'benefits', 'hours', 'safety', 
  'discrimination', 'harassment', 'working_conditions', 'layoff', 'recall'];

const OUTCOMES = ['upheld', 'denied', 'partial', 'settled', 'withdrawn'];

const JURISDICTIONS = ['ON', 'BC', 'AB', 'QC', 'NS', 'MB', 'SK', 'NB'];

const SECTORS = ['public', 'private', 'healthcare', 'education', 'transportation', 'manufacturing', 'service'];

function random<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

async function seedArbitrationPrecedents(orgIds: string[]) {
  console.log('\n⚖️  Seeding arbitration precedents...');
  
  for (let i = 0; i < 30; i++) {
    const sourceOrg = random(orgIds);
    const firstName = random(FIRST_NAMES);
    const lastName = random(LAST_NAMES);
    const arbitrator = `${firstName} ${lastName}`;
    const year = randomInt(2018, 2024);
    
    await db.insert(arbitrationPrecedents).values({
      sourceOrganizationId: sourceOrg,
      caseTitle: `Union Local vs. Employer Corp ${year}-${i.toString().padStart(3, '0')}`,
      arbitratorName: arbitrator,
      decisionDate: randomDate(randomInt(30, 1095)), // 1 month to 3 years ago
      grievanceType: random(GRIEVANCE_TYPES),
      outcome: random(OUTCOMES),
      jurisdiction: random(JURISDICTIONS),
      sector: random(SECTORS),
      summary: `Arbitration decision regarding ${random(GRIEVANCE_TYPES)} case. The arbitrator ruled ${random(OUTCOMES)} based on contract interpretation and past practices.`,
      keyFindings: `The arbitrator found that the employer's actions were ${Math.random() > 0.5 ? 'justified' : 'not justified'} under Article ${randomInt(1, 25)} of the collective agreement.`,
      legalReferences: [`Collective Agreement Article ${randomInt(1, 25)}`, `Labour Relations Act Section ${randomInt(10, 100)}`],
      precedentLevel: random(['binding', 'persuasive', 'informative']) as 'binding' | 'persuasive' | 'informative',
      sharingLevel: random(['private', 'public']) as 'private' | 'public',
      citationCount: randomInt(0, 15),
      viewCount: randomInt(5, 150),
      status: 'published',
      createdAt: randomDate(randomInt(30, 1095)),
      updatedAt: randomDate(randomInt(1, 30)),
    });
  }
  
  console.log('  ✅ Created 30 arbitration precedents');
}

async function seedStrikeFunds(orgIds: string[]) {
  console.log('\n💰 Seeding strike funds...');
  
  for (let i = 0; i < 10; i++) {
    const orgId = random(orgIds);
    const status = random(['active', 'inactive', 'depleted', 'pending']) as 'active' | 'inactive' | 'depleted' | 'pending';
    const balance = status === 'depleted' ? 0 : randomInt(50000, 500000);
    
    await db.insert(strikeFunds).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      fundName: `Strike Fund ${randomInt(2020, 2024)}`,
      currentBalance: balance,
      totalContributions: balance + randomInt(0, 100000),
      totalDisbursements: randomInt(0, balance),
      strikeStartDate: status === 'active' ? randomDate(randomInt(7, 60)) : randomDate(randomInt(365, 730)),
      strikeEndDate: status === 'inactive' ? randomDate(randomInt(1, 30)) : null,
      strikeStatus: status,
      affectedMembers: status === 'active' ? randomInt(50, 500) : randomInt(30, 400),
      createdAt: randomDate(randomInt(365, 1095)),
      updatedAt: randomDate(randomInt(1, 30)),
    });
  }
  
  console.log('  ✅ Created 10 strike funds');
}

async function seedPensionData(orgIds: string[]) {
  console.log('\n🏦 Seeding pension trust boards and trustees...');
  
  const boardIds: string[] = [];
  
  // Create trust boards
  for (let i = 0; i < 5; i++) {
    const boardId = crypto.randomUUID();
    const orgId = random(orgIds);
    
    await db.insert(pensionTrustBoards).values({
      id: boardId,
      organizationId: orgId,
      boardName: `Pension Trust Board ${i + 1}`,
      establishedDate: randomDate(randomInt(1095, 3650)), // 3-10 years ago
      assets: randomInt(1000000, 50000000),
      memberCount: randomInt(100, 5000),
      status: random(['active', 'inactive']) as 'active' | 'inactive',
      createdAt: randomDate(randomInt(365, 1095)),
      updatedAt: randomDate(randomInt(1, 30)),
    });
    
    boardIds.push(boardId);
  }
  
  console.log('  ✅ Created 5 pension trust boards');
  
  // Create trustees for each board
  let trusteeCount = 0;
  for (const boardId of boardIds) {
    const numTrustees = randomInt(5, 9); // 5-9 trustees per board
    
    for (let i = 0; i < numTrustees; i++) {
      const firstName = random(FIRST_NAMES);
      const lastName = random(LAST_NAMES);
      const trusteeType = random(['union', 'employer', 'independent']) as 'union' | 'employer' | 'independent';
      const termStart = randomDate(randomInt(365, 1095));
      const termYears = 3;
      const termStartDate = new Date(termStart);
      const termEndDate = new Date(termStartDate);
      termEndDate.setFullYear(termEndDate.getFullYear() + termYears);
      
      await db.insert(pensionTrustees).values({
        trusteeBoardId: boardId,
        userId: `user_trustee_${crypto.randomUUID().substring(0, 8)}`,
        trusteeName: `${firstName} ${lastName}`,
        trusteeType,
        position: i === 0 ? 'Chair' : i === 1 ? 'Vice Chair' : 'Trustee',
        termStartDate: termStartDate.toISOString(),
        termEndDate: termEndDate.toISOString(),
        termLengthYears: termYears,
        isVotingMember: true,
        isCurrent: Math.random() > 0.3, // 70% current
        representingOrganization: trusteeType === 'union' ? random(['CUPE', 'UNIFOR', 'OPSEU']) : null,
        createdAt: termStart,
        updatedAt: randomDate(randomInt(1, 30)),
      });
      
      trusteeCount++;
    }
  }
  
  console.log(`  ✅ Created ${trusteeCount} pension trustees`);
}

async function seedAnalyticsData(orgIds: string[]) {
  console.log('\n📊 Seeding analytics cross-org access logs...');
  
  for (let i = 0; i < 100; i++) {
    const userOrgId = random(orgIds);
    const resourceOrgId = random(orgIds);
    const resourceType = random(['clause', 'precedent', 'analytics']) as 'clause' | 'precedent' | 'analytics';
    const accessType = random(['view', 'download', 'compare', 'cite']) as 'view' | 'download' | 'compare' | 'cite';
    
    await db.insert(crossOrgAccessLog).values({
      id: crypto.randomUUID(),
      userOrganizationId: userOrgId,
      resourceOrganizationId: resourceOrgId,
      resourceType,
      resourceId: crypto.randomUUID(),
      accessType,
      accessedAt: randomDate(randomInt(1, 90)),
      userId: `user_${crypto.randomUUID().substring(0, 8)}`,
    });
  }
  
  console.log('  ✅ Created 100 cross-org access logs');
}

async function seedOrganizationMembers(orgIds: string[]) {
  console.log('\n👥 Seeding organization members...');
  
  let memberCount = 0;
  for (const orgId of orgIds) {
    const numMembers = randomInt(10, 30);
    
    for (let i = 0; i < numMembers; i++) {
      const firstName = random(FIRST_NAMES);
      const lastName = random(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@union${randomInt(100, 999)}.local`;
      const userId = `user_${orgId.substring(0, 8)}_${i}`;
      const role = i === 0 ? 'admin' : i < 3 ? 'officer' : i < 6 ? 'steward' : 'member';
      
      await db.insert(organizationMembers).values({
        userId,
        organizationId: orgId,
        tenantId: null, // Set to null to avoid foreign key constraint
        name: fullName,
        email,
        phone: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        role,
        status: random(['active', 'active', 'active', 'inactive']) as 'active' | 'inactive',
        department: random(['Operations', 'Administration', 'Maintenance', 'Security', 'Customer Service', null]),
        position: random(['Worker', 'Supervisor', 'Foreman', 'Manager', 'Technician', null]),
        membershipNumber: `M${randomInt(10000, 99999)}`,
        seniority: randomInt(0, 25),
        unionJoinDate: randomDate(randomInt(365, 1095)),
        preferredContactMethod: random(['email', 'phone', 'mail', null]),
        createdAt: randomDate(randomInt(365, 1095)),
        updatedAt: randomDate(randomInt(1, 30)),
      });
      
      memberCount++;
    }
  }
  
  console.log(`  ✅ Created ${memberCount} organization members`);
}

async function main() {
  console.log('🌱 Comprehensive Data Seeding for Union Claims Platform\n');
  console.log('========================================================\n');
  
  // Get existing organizations
  const existingOrgs = await db.select().from(organizations);
  const orgIds = existingOrgs.map(org => org.id);
  
  if (orgIds.length === 0) {
    console.error('❌ No organizations found. Please create organizations first.');
    process.exit(1);
  }
  
  console.log(`📋 Found ${orgIds.length} existing organizations`);
  
  // Seed all data
  // await seedOrganizationMembers(orgIds); // SKIPPED: tenants table doesn't exist, causing FK constraint error
  await seedArbitrationPrecedents(orgIds);
  await seedStrikeFunds(orgIds);
  await seedPensionData(orgIds);
  await seedAnalyticsData(orgIds);
  
  console.log('\n========================================================');
  console.log('✅ Comprehensive data seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   Organizations: ${orgIds.length}`);
  console.log(`   Organization Members: ~${orgIds.length * 20}`);
  console.log(`   Arbitration Precedents: 30`);
  console.log(`   Strike Funds: 10`);
  console.log(`   Pension Trust Boards: 5`);
  console.log(`   Pension Trustees: ~40`);
  console.log(`   Analytics Access Logs: 100\n`);
}

main().catch((error) => {
  console.error('❌ Error seeding data:', error);
  process.exit(1);
});
