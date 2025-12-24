/**
 * Seed Historical Claims for ML Training
 * 
 * Creates 2+ years of historical claims data with realistic daily patterns
 * for existing tenants to enable workload forecasting model training.
 * 
 * Run: pnpm seed:historical
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

const CLAIM_TYPES = [
  'grievance_discipline',
  'grievance_schedule',
  'grievance_pay',
  'workplace_safety',
  'discrimination_age',
  'discrimination_gender',
  'discrimination_race',
  'discrimination_disability',
  'harassment_verbal',
  'harassment_physical',
  'harassment_sexual',
  'contract_dispute',
  'retaliation',
  'other',
] as const;

const CLAIM_STATUSES = [
  'submitted',
  'under_review',
  'assigned',
  'investigation',
  'pending_documentation',
  'resolved',
  'rejected',
  'closed',
] as const;

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

function random<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate realistic daily claim volume with patterns:
 * - Higher volume on weekdays (Mon-Fri)
 * - Lower volume on weekends
 * - Seasonal variation (higher in winter, lower in summer)
 * - Random variation (±20%)
 */
function getDailyClaimCount(date: Date): number {
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  
  // Base volume
  let baseVolume = 5;
  
  // Weekend reduction (40% of weekday volume)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    baseVolume *= 0.4;
  }
  
  // Seasonal variation
  // Winter (Nov-Feb): +30%
  // Spring (Mar-May): normal
  // Summer (Jun-Aug): -25%
  // Fall (Sep-Oct): +15%
  if (month >= 10 || month <= 1) {
    baseVolume *= 1.3; // Winter
  } else if (month >= 5 && month <= 7) {
    baseVolume *= 0.75; // Summer
  } else if (month >= 8 && month <= 9) {
    baseVolume *= 1.15; // Fall
  }
  
  // Random variation (±20%)
  const variation = 0.8 + Math.random() * 0.4;
  baseVolume *= variation;
  
  return Math.max(1, Math.round(baseVolume));
}

async function seedHistoricalClaims() {
  console.log('🌱 Seeding Historical Claims for ML Training\n');
  console.log('===============================================\n');
  
  // Get an existing member_id from claims
  const memberResult = await db.execute(sql`
    SELECT member_id FROM claims WHERE member_id IS NOT NULL LIMIT 1
  `);
  
  const members = Array.isArray(memberResult) ? memberResult : ((memberResult as any).rows || []);
  
  if (members.length === 0) {
    console.error('❌ No existing claims with member_id found. Cannot seed historical data.');
    console.error('   Please create at least one claim first.');
    process.exit(1);
  }
  
  const defaultMemberId = members[0].member_id as string;
  console.log(`✅ Using existing member_id: ${defaultMemberId}\n`);
  
  // Get existing organizations - use organization_id from claims table directly
  const organizationsResult = await db.execute(sql`
    SELECT DISTINCT organization_id 
    FROM claims 
    WHERE organization_id IS NOT NULL
    LIMIT 10
  `);
  
  let organizations = Array.isArray(organizationsResult) ? organizationsResult : ((organizationsResult as any).rows || []);
  
  // If no organizations found in claims, use default test organizations
  if (organizations.length === 0) {
    console.log('⚠️  No organizations found in claims table. Using default test organizations.\n');
    organizations = [
      { organization_id: '00000000-0000-0000-0000-000000000001' },
      { organization_id: 'a1111111-1111-1111-1111-111111111111' },
      { organization_id: 'b2222222-2222-2222-2222-222222222222' },
    ];
  }
  
  console.log(`📋 Using ${organizations.length} organization(s)\n`);
  
  // Generate claims for last 2 years (730 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 730);
  
  console.log(`📅 Generating claims from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);
  
  let totalClaimsCreated = 0;
  
  for (const organization of organizations) {
    const organizationId = organization.organization_id as string;
    
    console.log(`🏢 Processing organization: ${organizationId}`);
    
    let organizationClaimCount = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const claimCount = getDailyClaimCount(currentDate);
      
      // Create claims for this day
      for (let i = 0; i < claimCount; i++) {
        const claimType = random(CLAIM_TYPES);
        const status = random(CLAIM_STATUSES);
        const priority = random(PRIORITIES);
        
        // Add random time to spread throughout the day
        const claimDate = new Date(currentDate);
        claimDate.setHours(randomInt(8, 17)); // Business hours
        claimDate.setMinutes(randomInt(0, 59));
        claimDate.setSeconds(randomInt(0, 59));
        
        // Generate claim number
        const claimNumber = `CLM-${organizationId.substring(0, 8)}-${claimDate.getFullYear()}${String(claimDate.getMonth() + 1).padStart(2, '0')}${String(claimDate.getDate()).padStart(2, '0')}-${String(organizationClaimCount + i + 1).padStart(4, '0')}`;
        
        await db.execute(sql`
          INSERT INTO claims (
            organization_id,
            claim_number,
            member_id,
            is_anonymous,
            claim_type,
            status,
            priority,
            incident_date,
            location,
            description,
            desired_outcome,
            witnesses_present,
            previously_reported,
            created_at,
            updated_at
          ) VALUES (
            ${organizationId},
            ${claimNumber},
            ${defaultMemberId},
            ${randomInt(1, 10) > 8},
            ${claimType},
            ${status},
            ${priority},
            ${claimDate.toISOString()},
            'Plant Floor ' || floor(random() * 5 + 1)::text,
            'Historical claim - ' || ${claimType},
            'Resolution for ' || ${claimType},
            ${randomInt(1, 10) > 6},
            ${randomInt(1, 10) > 7},
            ${claimDate.toISOString()},
            ${claimDate.toISOString()}
          )
          ON CONFLICT (claim_number) DO NOTHING
        `);
        
        organizationClaimCount++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`   ✅ Created ${organizationClaimCount} historical claims\n`);
    totalClaimsCreated += organizationClaimCount;
  }
  
  console.log('===============================================');
  console.log(`\n🎉 Seeding completed successfully!`);
  console.log(`📊 Total claims created: ${totalClaimsCreated}`);
  console.log(`📈 Average per organization: ${Math.round(totalClaimsCreated / organizations.length)}`);
  console.log(`\n✅ Database ready for ML model training`);
  console.log(`   Run: pnpm ml:train:workload\n`);
}

seedHistoricalClaims()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
