/**
 * Comprehensive Data Seeding for Union Claims Platform
 * Seeds ALL tables with realistic data using orgId = tenantId pattern
 */

import { db } from '../db/db';
import { 
  organizationMembers, 
  // arbitrationPrecedents, // Not available in current schema
  // crossOrgAccessLog, // Not available in current schema
} from '../db/schema-organizations';
import { strikeFunds } from '../services/financial-service/src/db/schema';
import { sql } from 'drizzle-orm';
import * as crypto from 'crypto';

// Helper functions
function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  return date;
}

// Data arrays
const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 
  'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty'];

const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'];

const DEPARTMENTS = ['Operations', 'Administration', 'Maintenance', 'Sales', 'Production', 
  'Warehouse', 'Customer Service', 'Quality Control', 'Safety', 'Training'];

const POSITIONS = ['Worker', 'Supervisor', 'Lead', 'Coordinator', 'Specialist', 'Manager', 
  'Team Lead', 'Operator', 'Technician', 'Inspector'];

const ROLES = ['member', 'member', 'member', 'member', 'steward', 'steward', 'officer', 'admin'];

const GRIEVANCE_TYPES = ['Discipline', 'Termination', 'Seniority', 'Wages', 'Benefits', 
  'Working Conditions', 'Health & Safety', 'Hours of Work', 'Discrimination', 'Harassment'];

const OUTCOMES = ['Grievance Sustained', 'Grievance Denied', 'Partially Sustained', 
  'Settlement Reached', 'Withdrawn'];

const JURISDICTIONS = ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba', 
  'Saskatchewan', 'Nova Scotia', 'New Brunswick'];

const SECTORS = ['Manufacturing', 'Healthcare', 'Education', 'Transportation', 'Construction', 
  'Retail', 'Hospitality', 'Public Sector', 'Utilities', 'Communications'];

const RESOURCE_TYPES = ['document', 'report', 'claim', 'grievance', 'member_profile', 
  'financial_record', 'arbitration_case', 'policy'];

const ACCESS_TYPES = ['view', 'view', 'view', 'search', 'search', 'download', 'edit'];

async function seedOrganizationMembers(orgIds: string[]) {
  console.log('\n👥 Seeding organization members...');
  
  // Check if members already exist
  const existingCount = await db.execute(sql`SELECT COUNT(*) FROM organization_members`);
  if (Number(existingCount[0].count) > 50) {
    console.log(`  ℹ️  Found ${existingCount[0].count} existing members. Clearing for fresh seed...`);
    await db.execute(sql`DELETE FROM organization_members`);
  }
  
  let totalMembers = 0;
  let emailCounter = 0;
  
  for (const orgId of orgIds) {
    const memberCount = randomInt(15, 25);
    
    for (let i = 0; i < memberCount; i++) {
      const firstName = random(FIRST_NAMES);
      const lastName = random(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${emailCounter}@${orgId.substring(0, 8)}.local`;
      emailCounter++;
      
      await db.insert(organizationMembers).values({
        organizationId: orgId,
        tenantId: orgId, // KEY: Using orgId as tenantId
        userId: `user_${crypto.randomUUID().substring(0, 16)}`,
        name: fullName,
        email,
        phone: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        role: random(ROLES),
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        department: Math.random() > 0.2 ? random(DEPARTMENTS) : null,
        position: Math.random() > 0.2 ? random(POSITIONS) : null,
        membershipNumber: `M${randomInt(10000, 99999)}`,
        seniority: randomInt(0, 25),
        unionJoinDate: randomDate(randomInt(365, 3650)),
        preferredContactMethod: random(['email', 'phone', 'mail', null, null]),
        createdAt: randomDate(randomInt(365, 1095)),
        updatedAt: randomDate(randomInt(1, 30)),
      });
      totalMembers++;
    }
  }
  
  console.log(`  ✅ Created ${totalMembers} organization members`);
}

async function seedStrikeFunds(orgIds: string[]) {
  console.log('\n💰 Seeding strike funds...');
  
  // Check if funds already exist
  const existingCount = await db.execute(sql`SELECT COUNT(*) FROM strike_funds`);
  if (Number(existingCount[0].count) > 5) {
    console.log(`  ℹ️  Found ${existingCount[0].count} existing funds. Clearing for fresh seed...`);
    await db.execute(sql`DELETE FROM strike_funds`);
  }
  
  const fundCount = Math.min(15, orgIds.length * 2);
  
  for (let i = 0; i < fundCount; i++) {
    const orgId = random(orgIds);
    const currentBalance = randomInt(50000, 800000);
    const targetAmount = randomInt(500000, 2000000);
    const minimumThreshold = Math.floor(targetAmount * 0.1);
    
    await db.insert(strikeFunds).values({
      tenantId: orgId, // KEY: Using orgId as tenantId
      organizationId: orgId,
      fundName: `Strike Fund ${String.fromCharCode(65 + i)}`,
      fundCode: `SF-${randomInt(100, 999)}`,
      description: random([
        'Emergency fund for labor actions',
        'General strike support fund',
        'Hardship assistance fund',
        'Work stoppage reserve',
        'Labor action support fund',
      ]),
      fundType: random(['general', 'local', 'emergency', 'hardship']),
      currentBalance: currentBalance.toString(),
      targetAmount: targetAmount.toString(),
      minimumThreshold: minimumThreshold.toString(),
      contributionRate: randomInt(5, 25).toString(),
      strikeStatus: random(['inactive', 'preparing', 'active', 'suspended', 'resolved']),
      status: 'active',
      createdAt: randomDate(randomInt(365, 730)),
      updatedAt: randomDate(randomInt(1, 30)),
    });
  }
  
  console.log(`  ✅ Created ${fundCount} strike funds`);
}

/* Disabled - arbitrationPrecedents table not in current schema
async function seedArbitrationPrecedents(orgIds: string[]) {
  console.log('\n⚖️  Seeding arbitration precedents...');
  
  // Check if precedents already exist
  const existing = await db.execute(sql`SELECT COUNT(*) as count FROM arbitration_precedents`);
  const existingCount = Number(existing[0]?.count || 0);
  
  if (existingCount > 0) {
    console.log(`  ℹ️  Skipping - ${existingCount} precedents already exist`);
    return existingCount;
  }
  
  const precedentCount = 35;
  
  for (let i = 0; i < precedentCount; i++) {
    const grievanceType = random(GRIEVANCE_TYPES);
    const outcome = random(OUTCOMES);
    const jurisdiction = random(JURISDICTIONS);
    const sector = random(SECTORS);
    
    await db.insert(arbitrationPrecedents).values({
      sourceOrganizationId: random(orgIds),
      caseTitle: `${grievanceType} Case ${randomInt(100, 999)} - ${random(LAST_NAMES)} v. Company`,
      arbitratorName: `${random(['Hon.', 'Mr.', 'Ms.', 'Prof.'])} ${random(FIRST_NAMES)} ${random(LAST_NAMES)}`,
      decisionDate: randomDate(randomInt(365, 1825)),
      grievanceType,
      issueSummary: `This case involves a ${grievanceType.toLowerCase()} matter where the grievor contested management's decision. Key issues included procedural fairness and interpretation of collective agreement provisions.`,
      decisionSummary: `The arbitrator found that ${outcome === 'Grievance Sustained' ? 'the employer violated the collective agreement and ordered full remedy' : outcome === 'Grievance Denied' ? 'the employer acted within its rights under the agreement' : 'both parties had valid concerns and ordered a compromise solution'}.`,
      outcome,
      jurisdiction,
      sector,
      keyPrinciples: [
        `${grievanceType} - Progressive Discipline`,
        'Procedural Fairness',
        'Just Cause Requirements',
      ],
      precedentialValue: random(['high', 'medium', 'low']),
      sharingLevel: random(['public', 'members_only', 'internal']),
      citationCount: randomInt(0, 15),
      viewCount: randomInt(10, 500),
      createdBy: random(orgIds),
      createdAt: randomDate(randomInt(365, 1095)),
      updatedAt: randomDate(randomInt(1, 30)),
    });
  }
  
  console.log(`  ✅ Created ${precedentCount} arbitration precedents`);
  return precedentCount;
}
*/

/* Disabled - crossOrgAccessLog table not in current schema
async function seedAnalyticsData(orgIds: string[]) {
  console.log('\n📊 Seeding analytics cross-org access logs...');
  
  // Check if logs already exist
  const existing = await db.execute(sql`SELECT COUNT(*) as count FROM cross_org_access_log`);
  const existingCount = Number(existing[0]?.count || 0);
  
  if (existingCount > 0) {
    console.log(`  ℹ️  Skipping - ${existingCount} access logs already exist`);
    return existingCount;
  }
  
  const logCount = 120;
  
  for (let i = 0; i < logCount; i++) {
    const sourceOrg = random(orgIds);
    const targetOrg = random(orgIds.filter(id => id !== sourceOrg)); // Different org
    const resourceType = random(RESOURCE_TYPES);
    const accessType = random(ACCESS_TYPES);
    
    await db.insert(crossOrgAccessLog).values({
      userId: `user_${crypto.randomUUID().substring(0, 16)}`,
      userOrganizationId: sourceOrg,
      resourceType,
      resourceId: crypto.randomUUID(),
      resourceOrganizationId: targetOrg,
      accessType,
      accessGrantedVia: random(['direct_permission', 'group_membership', 'shared_resource', 'public_access']),
      metadata: {
        searchQuery: accessType === 'search' ? random(['grievance', 'arbitration', 'discipline', 'wages']) : undefined,
        durationSeconds: accessType === 'view' ? randomInt(10, 300) : undefined,
        fileSize: accessType === 'download' ? randomInt(1024, 1048576) : undefined,
      },
      createdAt: randomDate(randomInt(1, 180)),
    });
  }
  
  console.log(`  ✅ Created ${logCount} cross-org access logs`);
  return logCount;
}
*/

async function main() {
  try {
    console.log('🌱 Comprehensive Data Seeding for Union Claims Platform');
    console.log('========================================================\n');
    
    // Get all organizations
    const orgs = await db.execute(sql`SELECT id FROM organizations`);
    const orgIds = orgs.map((org: any) => org.id);
    console.log(`📋 Found ${orgIds.length} existing organizations`);
    
    // Verify tenants table exists
    const tenants = await db.execute(sql`SELECT COUNT(*) as count FROM tenant_management.tenants`);
    const tenantCount = Number(tenants[0]?.count || 0);
    console.log(`🔧 Verified ${tenantCount} tenants in database`);
    
    if (tenantCount === 0) {
      console.error('❌ ERROR: Tenants table is empty!');
      console.log('   Please run: npx tsx scripts/create-tenants-from-orgs.ts');
      process.exit(1);
    }
    
    // Seed all tables
    await seedOrganizationMembers(orgIds);
    await seedStrikeFunds(orgIds);
    // const precedentsCount = await seedArbitrationPrecedents(orgIds); // Disabled - table not in schema
    // const logsCount = await seedAnalyticsData(orgIds); // Disabled - table not in schema
    
    // Final summary
    const memberCount = await db.execute(sql`SELECT COUNT(*) as count FROM organization_members`);
    const fundCount = await db.execute(sql`SELECT COUNT(*) as count FROM strike_funds`);
    // const precedentCount = await db.execute(sql`SELECT COUNT(*) as count FROM arbitration_precedents`); // Disabled
    // const logCount = await db.execute(sql`SELECT COUNT(*) as count FROM cross_org_access_log`); // Disabled
    
    console.log('\n========================================================');
    console.log('✅ Complete data seeding successful!\n');
    console.log('📊 Final Database Summary:');
    console.log(`   Organizations: ${orgIds.length}`);
    console.log(`   Tenants: ${tenantCount}`);
    console.log(`   Organization Members: ${memberCount[0]?.count || 0}`);
    console.log(`   Strike Funds: ${fundCount[0]?.count || 0}`);
    // console.log(`   Arbitration Precedents: ${precedentCount[0]?.count || 0}`); // Disabled
    // console.log(`   Analytics Access Logs: ${logCount[0]?.count || 0}`); // Disabled
    
    const totalRecords = Number(memberCount[0]?.count || 0) + 
                        Number(fundCount[0]?.count || 0);
    console.log(`\n   Total Records: ${totalRecords}`);
    console.log('\n✅ Application ready for capacity assessment and stakeholder review!');
    
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
