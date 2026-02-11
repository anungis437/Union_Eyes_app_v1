/**
 * Seed Dashboard Data Script
 * 
 * This script populates the database with sample data for testing dashboard functionality
 * Run with: tsx scripts/seed-dashboard-data.ts
 */

import { db } from "@/db/db";
import { claims, organizations, organizationMembers, profiles, users } from "@/db/schema";
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';

async function seedData() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Step 1: Get or create a test organization
    const [existingOrg] = await db.select().from(organizations).limit(1);
    
    let orgId: string;
    
    if (existingOrg) {
      orgId = existingOrg.id;
      console.log(`✅ Using existing organization: ${existingOrg.name} (${orgId})`);
    } else {
      // Create a new organization
      const newOrgId = uuidv4();
      await db.insert(organizations).values({
        id: newOrgId,
        name: "Sample Union Local 101",
        slug: "sample-union-101",
        adminEmail: "admin@sampleunion.com",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      orgId = newOrgId;
      console.log(`✅ Created new organization: Sample Union Local 101 (${orgId})`);
    }

    // Step 2: Create sample members
    console.log('\n📊 Creating sample members...');
    const memberIds: string[] = []; // Store user IDs from user_management.users
    const orgMemberIds: string[] = []; // Store organization_members IDs
    
    for (let i = 1; i <= 5; i++) {
      const clerkUserId = `user_sample_${i}_${Date.now()}`;
      const userId = uuidv4(); // User ID for user_management.users table
      const orgMemberId = uuidv4(); // Organization member ID
      
      // Create user in user_management.users schema
      await db.execute(sql`
        INSERT INTO user_management.users (user_id, email, email_verified, is_active, created_at, updated_at)
        VALUES (${userId}, ${`member${i}@sampleunion.com`}, true, true, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `);
      
      // Create profile
      await db.insert(profiles).values({
        userId: clerkUserId,
        email: `member${i}@sampleunion.com`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      // Add to organization
      await db.insert(organizationMembers).values({
        id: orgMemberId,
        tenantId: '458a56cb-251a-4c91-a0b5-81bb8ac39087', // Default Organization
        organizationId: orgId,
        userId: clerkUserId,
        name: `Member ${i}`,
        email: `member${i}@sampleunion.com`,
        role: i === 1 ? 'admin' : (i === 2 ? 'steward' : 'member'),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      memberIds.push(userId); // For claims FK reference
      orgMemberIds.push(orgMemberId);
    }
    
    console.log(`✅ Created 5 sample members`);

    // Step 3: Create sample claims
    console.log('\n📝 Creating sample claims...');
    
    const claimStatuses = ['submitted', 'under_review', 'under_review', 'resolved', 'resolved'];
    const claimPriorities = ['high', 'medium', 'critical', 'low', 'medium'];
    const claimTypes = ['grievance_discipline', 'grievance_pay', 'workplace_safety', 'contract_dispute', 'grievance_schedule'];
    
    // Generate unique claim numbers using timestamp
    const timestamp = Date.now();
    
    for (let i = 0; i < 5; i++) {
      const claimId = uuidv4();
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - (10 - i * 2)); // Stagger dates
      const status = claimStatuses[i];
      
      await db.insert(claims).values({
        claimId: claimId,
        claimNumber: `CLM-${timestamp}-${String(i + 1).padStart(4, '0')}`,
        organizationId: orgId,
        memberId: memberIds[i % memberIds.length],
        claimType: claimTypes[i],
        status: status,
        priority: claimPriorities[i],
        location: 'Warehouse Floor 2',
        description: `This is a sample ${claimTypes[i]} claim for testing dashboard functionality.`,
        desiredOutcome: 'Fair resolution and compensation',
        incidentDate: new Date(createdDate.getTime() - 86400000 * 3), // 3 days before creation
        resolvedAt: status === 'resolved' ? new Date() : null, // Set resolvedAt for resolved claims
        createdAt: createdDate,
        updatedAt: createdDate,
      });
    }
    
    console.log(`✅ Created 5 sample claims`);

    // Summary
    console.log('\n✨ Seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Organization: ${orgId}`);
    console.log(`   - Members: 5`);
    console.log(`   - Claims: 5`);
    console.log(`     • Active: 3`);
    console.log(`     • Pending Review: 2`);
    console.log(`     • Resolved: 2`);
    console.log(`     • High Priority: 2`);
    console.log('\n🎉 Your dashboard should now display data!');
    console.log(`\n💡 Tip: Use organization ID ${orgId} to view this data\n`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Run the seeding
seedData()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);relative flex h-screen overflow-hidden bg-gray-50
  });
relative flex h-screrelative flex h-screen overflow-hidden bg-gray-50
