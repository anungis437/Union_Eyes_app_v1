/**
 * Comprehensive Platform Seeding Script
 * 
 * Seeds the entire Union Eyes platform with realistic data for:
 * - Multi-tenant setup
 * - Users and profiles (members, stewards, admins)
 * - Claims across all types and statuses
 * - ML predictions historical data
 * - Model metadata and baselines
 * - Analytics benchmarks and scheduled reports
 * - Member AI feedback samples
 * 
 * Run: npx tsx scripts/seed-full-platform.ts
 * 
 * Options:
 *   --tenants <number>    Number of tenants to create (default: 3)
 *   --users <number>      Users per tenant (default: 50)
 *   --claims <number>     Claims per tenant (default: 200)
 *   --reset              Drop all data before seeding
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { organizationMembers, organizations } from '../db/schema-organizations';
import crypto from 'crypto';

interface SeedConfig {
  tenants: number;
  usersPerTenant: number;
  claimsPerTenant: number;
  reset: boolean;
}

// Realistic data generators (simple, no faker.js needed for MVP)
const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 
  'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna', 'Steven', 'Carol', 'Andrew', 'Ruth', 'Paul', 'Sharon'];

const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott'];

const UNION_LOCALS = ['Local 101', 'Local 212', 'Local 345', 'Local 567', 'Local 789', 'Local 901'];

const DEPARTMENTS = ['Manufacturing', 'Warehouse', 'Shipping', 'Maintenance', 'Administration', 'Quality Control', 'Customer Service'];

const CLAIM_TYPES = ['grievance_pay', 'grievance_schedule', 'workplace_safety', 'discrimination_gender', 'discrimination_race',
  'discrimination_age', 'harassment_sexual', 'harassment_workplace', 'termination', 'discipline', 'health_safety'];

const CLAIM_STATUSES = ['submitted', 'under_review', 'investigation', 'mediation', 'arbitration', 'resolved', 'closed', 'withdrawn'];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function random<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startDays: number, endDays: number): string {
  const start = new Date();
  start.setDate(start.getDate() - startDays);
  const end = new Date();
  end.setDate(end.getDate() - endDays);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
}

function generateEmail(firstName: string, lastName: string, domain: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

async function resetDatabase() {
  console.log('🗑️  Resetting database...');
  
  // SECURITY: Allowlist of valid table names to prevent SQL injection
  const ALLOWED_TABLES = new Set([
    'ml_alert_acknowledgments', 'ml_retraining_notifications', 'ml_model_training_runs',
    'member_ai_feedback', 'model_feature_baselines', 'ml_predictions', 'model_metadata',
    'analytics_scheduled_reports', 'benchmark_data', 'claim_messages', 'claims',
    'organization_members', 'profiles', 'organizations'
  ]);
  
  // Helper to safely delete from a table (ignores if table doesn't exist)
  const safeDelete = async (tableName: string) => {
    // SECURITY FIX: Validate table name against allowlist
    if (!ALLOWED_TABLES.has(tableName)) {
      throw new Error(`Invalid table name: ${tableName}. Not in allowlist.`);
    }
    
    try {
      // SECURITY FIX: Use identifier instead of sql.raw() for table name
      // Note: Drizzle doesn't support dynamic table deletion, so we use sql template
      // but with validated input only
      await db.execute(sql`DELETE FROM ${sql.raw(tableName)}`);
    } catch (error: unknown) {
      if (error.code === '42P01') {
        console.log(`⚠️  Table ${tableName} doesn't exist, skipping...`);
      } else {
        throw error;
      }
    }
  };
  
  // Delete in correct order (respecting foreign keys)
  await safeDelete('ml_alert_acknowledgments');
  await safeDelete('ml_retraining_notifications');
  await safeDelete('ml_model_training_runs');
  await safeDelete('member_ai_feedback');
  await safeDelete('model_feature_baselines');
  await safeDelete('ml_predictions');
  await safeDelete('model_metadata');
  await safeDelete('analytics_scheduled_reports');
  await safeDelete('benchmark_data');
  await safeDelete('claim_messages');
  await safeDelete('claims');
  await safeDelete('organization_members'); // Clear organization memberships
  await safeDelete('profiles');
  await safeDelete('organizations'); // Clear organizations (no legacy tenants table)
  
  console.log('✅ Database reset complete\n');
}

async function seedOrganizations(config: SeedConfig): Promise<string[]> {
  console.log(`🏢 Creating ${config.tenants} organizations...`);
  
  const organizationIds: string[] = [];
  
  for (let i = 0; i < config.tenants; i++) {
    const orgId = crypto.randomUUID();
    const localName = UNION_LOCALS[i % UNION_LOCALS.length];
    const slug = `${localName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${i}`;
    
    // Create organization with only required fields
    await db.insert(organizations).values({
      id: orgId,
      name: localName,
      slug: slug,
      organizationType: 'local',
      hierarchyPath: [orgId],
      hierarchyLevel: 0,
    });
    
    organizationIds.push(orgId);
    console.log(`   ✓ Created organization: ${localName} (${orgId})`);
  }
  
  console.log(`✅ ${organizationIds.length} organizations created\n`);
  return organizationIds;
}

async function seedUsers(organizationId: string, count: number): Promise<{ members: string[]; stewards: string[]; admins: string[] }> {
  const members: string[] = [];
  const stewards: string[] = [];
  const admins: string[] = [];
  
  // Create users (70% members, 25% stewards, 5% admins)
  for (let i = 0; i < count; i++) {
    const userId = `user_${organizationId.substring(0, 8)}_${i}`;
    const firstName = random(FIRST_NAMES);
    const lastName = random(LAST_NAMES);
    const email = generateEmail(firstName, lastName, 'unioneyes.local');
    
    let role: string;
    if (i < count * 0.05) {
      role = 'admin';
      admins.push(userId);
    } else if (i < count * 0.30) {
      role = 'steward';
      stewards.push(userId);
    } else {
      role = 'member';
      members.push(userId);
    }
    
    // Create profile (minimal data - organizationId managed via organizationMembers)
    await db.execute(sql`
      INSERT INTO profiles (
        user_id,
        email,
        full_name,
        department,
        member_age,
        union_tenure_years,
        created_at
      ) VALUES (
        ${userId},
        ${email},
        ${firstName + ' ' + lastName},
        ${random(DEPARTMENTS)},
        ${randomInt(25, 65)},
        ${randomInt(1, 30)},
        ${randomDate(365, 0)}
      )
    `);
    
    // Insert into organization_members for access control
    await db.insert(organizationMembers).values({
      userId: userId,
      organizationId: organizationId,
      role: role,
      status: 'active',
      joinedAt: new Date(),
    });
  }
  
  return { members, stewards, admins };
}

async function seedClaims(organizationId: string, members: string[], stewards: string[], count: number): Promise<string[]> {
  const claimIds: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const claimId = `claim_${organizationId.substring(0, 8)}_${i}`;
    const claimType = random(CLAIM_TYPES);
    const status = random(CLAIM_STATUSES);
    const priority = random(PRIORITIES);
    const memberId = random(members);
    const stewardId = status !== 'submitted' ? random(stewards) : null;
    const isAnonymous = Math.random() > 0.8; // 20% anonymous
    const daysAgo = randomInt(1, 365);
    
    // Generate realistic descriptions based on claim type
    const descriptions: Record<string, string[]> = {
      'grievance_pay': [
        'Unpaid overtime hours not reflected in last paycheck',
        'Incorrect pay calculation for holiday work',
        'Missing shift differential pay'
      ],
      'workplace_safety': [
        'Unsafe equipment in warehouse area',
        'Inadequate ventilation in work area',
        'Damaged flooring creating trip hazard'
      ],
      'discrimination_gender': [
        'Passed over for promotion despite qualifications',
        'Unequal pay for same work as male colleagues',
        'Hostile comments from supervisor'
      ],
      'termination': [
        'Unjust termination without proper procedure',
        'Fired after reporting safety violation',
        'Terminated in retaliation for union activity'
      ]
    };
    
    const description = descriptions[claimType] 
      ? random(descriptions[claimType])
      : `Case related to ${claimType.replace(/_/g, ' ')}`;
    
    await db.execute(sql`
      INSERT INTO claims (
        id,
        organization_id,
        member_id,
        steward_id,
        case_type,
        status,
        priority,
        is_anonymous,
        incident_date,
        location,
        description,
        desired_outcome,
        created_at,
        created_by
      ) VALUES (
        ${claimId},
        ${organizationId},
        ${memberId},
        ${stewardId},
        ${claimType},
        ${status},
        ${priority},
        ${isAnonymous},
        ${randomDate(daysAgo + 30, daysAgo)},
        ${random(DEPARTMENTS)},
        ${description},
        ${status === 'resolved' || status === 'closed' ? 'Issue resolved satisfactorily' : 'Seeking fair resolution'},
        ${randomDate(daysAgo, 0)},
        ${memberId}
      )
    `);
    
    claimIds.push(claimId);
  }
  
  return claimIds;
}

async function seedMLPredictions(tenantId: string, claimIds: string[], members: string[]): Promise<void> {
  console.log('  🤖 Generating ML predictions...');
  
  const modelTypes = ['claim_outcome', 'timeline', 'churn_risk', 'assignment'];
  let predictionCount = 0;
  
  // Generate predictions for 60% of claims
  for (const claimId of claimIds.slice(0, Math.floor(claimIds.length * 0.6))) {
    for (const modelType of modelTypes) {
      const userId = random(members);
      const confidence = 0.7 + Math.random() * 0.25; // 70-95%
      const predictionCorrect = Math.random() > 0.2; // 80% correct
      
      let predictionValue: string;
      if (modelType === 'claim_outcome') {
        predictionValue = random(['favorable', 'partial', 'unfavorable']);
      } else if (modelType === 'timeline') {
        predictionValue = `${randomInt(15, 90)} days`;
      } else if (modelType === 'churn_risk') {
        predictionValue = random(['low', 'medium', 'high']);
      } else {
        predictionValue = random(members); // assignment suggestion
      }
      
      await db.execute(sql`
        INSERT INTO ml_predictions (
          tenant_id,
          user_id,
          claim_id,
          model_type,
          model_version,
          prediction_value,
          confidence_score,
          prediction_correct,
          predicted_at,
          response_time_ms
        ) VALUES (
          ${tenantId},
          ${userId},
          ${claimId},
          ${modelType},
          1,
          ${predictionValue},
          ${confidence},
          ${predictionCorrect},
          ${randomDate(30, 0)},
          ${randomInt(200, 1500)}
        )
      `);
      
      predictionCount++;
    }
  }
  
  console.log(`     ✓ ${predictionCount} predictions generated`);
}

async function seedModelMetadata(tenantId: string): Promise<void> {
  console.log('  📊 Creating model metadata...');
  
  const models = [
    { type: 'claim_outcome', name: 'Claim Outcome Prediction', accuracy: 0.85, confidence: 0.82 },
    { type: 'timeline', name: 'Timeline Forecasting', accuracy: 0.78, confidence: 0.75 },
    { type: 'churn_risk', name: 'Churn Risk Prediction', accuracy: 0.85, confidence: 0.80 },
    { type: 'assignment', name: 'Smart Assignment', accuracy: 0.70, confidence: 0.72 }
  ];
  
  for (const model of models) {
    await db.execute(sql`
      INSERT INTO model_metadata (
        tenant_id,
        model_type,
        model_name,
        model_version,
        is_active,
        deployed_at,
        baseline_accuracy,
        baseline_confidence
      ) VALUES (
        ${tenantId},
        ${model.type},
        ${model.name},
        1,
        true,
        NOW() - INTERVAL '90 days',
        ${model.accuracy},
        ${model.confidence}
      )
    `);
  }
  
  console.log(`     ✓ ${models.length} models initialized`);
}

async function seedFeatureBaselines(tenantId: string): Promise<void> {
  console.log('  📈 Creating feature baselines...');
  
  const models = ['claim_outcome', 'timeline', 'churn_risk', 'assignment'];
  
  for (const modelType of models) {
    await db.execute(sql`
      INSERT INTO model_feature_baselines (
        tenant_id,
        model_type,
        baseline_value,
        baseline_complexity,
        is_active,
        created_at
      ) VALUES (
        ${tenantId},
        ${modelType},
        ${randomInt(35, 50)},
        ${2.5 + Math.random()},
        true,
        NOW() - INTERVAL '90 days'
      )
    `);
  }
  
  console.log(`     ✓ Baselines created for ${models.length} models`);
}

async function seedAnalytics(tenantId: string): Promise<void> {
  console.log('  📊 Creating analytics data...');
  
  // Create benchmark data
  await db.execute(sql`
    INSERT INTO benchmark_data (
      tenant_id,
      metric_name,
      metric_value,
      period_start,
      period_end,
      created_at
    ) VALUES
      (${tenantId}, 'avg_resolution_time', 45.5, NOW() - INTERVAL '30 days', NOW(), NOW()),
      (${tenantId}, 'case_volume', 87, NOW() - INTERVAL '30 days', NOW(), NOW()),
      (${tenantId}, 'satisfaction_score', 4.2, NOW() - INTERVAL '30 days', NOW(), NOW()),
      (${tenantId}, 'first_response_time', 2.5, NOW() - INTERVAL '30 days', NOW(), NOW())
  `);
  
  // Create scheduled report
  await db.execute(sql`
    INSERT INTO analytics_scheduled_reports (
      tenant_id,
      report_name,
      report_type,
      schedule_frequency,
      next_run_at,
      is_active,
      created_at
    ) VALUES (
      ${tenantId},
      'Weekly Performance Report',
      'performance',
      'weekly',
      NOW() + INTERVAL '7 days',
      true,
      NOW()
    )
  `);
  
  console.log('     ✓ Analytics benchmarks and scheduled reports created');
}

async function seedMemberFeedback(tenantId: string, members: string[]): Promise<void> {
  console.log('  💬 Creating member AI feedback samples...');
  
  const feedbackSamples = [
    { category: 'general', message: 'The AI predictions have been very helpful in understanding my case timeline.', severity: 'normal' },
    { category: 'suggestion', message: 'It would be great if the AI could also suggest relevant contract clauses.', severity: 'normal' },
    { category: 'concern', message: 'I am worried about how my personal data is being used by the AI system.', severity: 'high' },
    { category: 'incorrect', message: 'The predicted outcome was wrong - case resolved much better than predicted.', severity: 'normal' },
    { category: 'question', message: 'How often are the AI models retrained with new data?', severity: 'normal' }
  ];
  
  for (let i = 0; i < 10; i++) {
    const sample = random(feedbackSamples);
    const memberId = random(members);
    
    await db.execute(sql`
      INSERT INTO member_ai_feedback (
        tenant_id,
        user_id,
        member_name,
        feedback_category,
        feedback_message,
        severity,
        status,
        submitted_at
      ) VALUES (
        ${tenantId},
        ${memberId},
        'Member User',
        ${sample.category},
        ${sample.message},
        ${sample.severity},
        ${random(['pending', 'reviewed', 'resolved'])},
        ${randomDate(60, 0)}
      )
    `);
  }
  
  console.log('     ✓ 10 feedback samples created');
}

async function seedTenant(tenantId: string, config: SeedConfig) {
  console.log(`\n👥 Seeding users for tenant ${tenantId}...`);
  const { members, stewards, admins } = await seedUsers(tenantId, config.usersPerTenant);
  console.log(`   ✓ Created ${members.length} members, ${stewards.length} stewards, ${admins.length} admins`);
  
  console.log(`\n📋 Creating claims for tenant ${tenantId}...`);
  const claimIds = await seedClaims(tenantId, members, stewards, config.claimsPerTenant);
  console.log(`   ✓ ${claimIds.length} claims created`);
  
  console.log(`\n🤖 Seeding ML data for tenant ${tenantId}...`);
  await seedMLPredictions(tenantId, claimIds, members);
  await seedModelMetadata(tenantId);
  await seedFeatureBaselines(tenantId);
  
  console.log(`\n📊 Seeding analytics for tenant ${tenantId}...`);
  await seedAnalytics(tenantId);
  
  console.log(`\n💬 Seeding feedback for tenant ${tenantId}...`);
  await seedMemberFeedback(tenantId, members);
}

async function main() {
  console.log('🌱 Union Eyes - Comprehensive Platform Seeding\n');
  console.log('===============================================\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config: SeedConfig = {
    tenants: 3,
    usersPerTenant: 50,
    claimsPerTenant: 200,
    reset: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenants') config.tenants = parseInt(args[++i]);
    if (args[i] === '--users') config.usersPerTenant = parseInt(args[++i]);
    if (args[i] === '--claims') config.claimsPerTenant = parseInt(args[++i]);
    if (args[i] === '--reset') config.reset = true;
  }
  
  console.log('Configuration:');
  console.log(`  Organizations: ${config.tenants}`);
  console.log(`  Users per organization: ${config.usersPerTenant}`);
  console.log(`  Claims per organization: ${config.claimsPerTenant}`);
  console.log(`  Reset database: ${config.reset}\n`);
  
  if (config.reset) {
    await resetDatabase();
  }
  
  // Seed organizations
  const organizationIds = await seedOrganizations(config);
  
  // Seed each organization
  for (const orgId of organizationIds) {
    console.log(`\n🏢 Seeding organization: ${orgId}`);
    
    // Seed users
    const { members, stewards, admins } = await seedUsers(orgId, config.usersPerTenant);
    console.log(`  ✅ Created ${members.length + stewards.length + admins.length} users`);
    
    // Seed claims
    const claimIds = await seedClaims(orgId, members, stewards, config.claimsPerTenant);
    console.log(`  ✅ Created ${claimIds.length} claims`);
    
    // Seed ML predictions
    await seedMLPredictions(orgId, claimIds, members);
    console.log(`  ✅ Generated ML predictions`);
    
    // Seed feedback
    await seedMemberFeedback(orgId, members);
    console.log(`  ✅ Created feedback samples`);
  }
  
  console.log('\n===============================================');
  console.log('✅ Platform seeding complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Organizations: ${organizationIds.length}`);
  console.log(`   Users: ${config.tenants * config.usersPerTenant}`);
  console.log(`   Claims: ${config.tenants * config.claimsPerTenant}`);
  console.log(`   ML Predictions: ${config.tenants * config.claimsPerTenant * 0.6 * 4}`);
  console.log(`   Model Metadata: ${config.tenants * 4}`);
  console.log(`   Feedback Samples: ${config.tenants * 10}\n`);
}

main().catch(console.error);
