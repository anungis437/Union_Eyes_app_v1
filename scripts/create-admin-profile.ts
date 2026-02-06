/**
 * Create Admin Profile Script
 * Creates a profile for the admin user
 * Run with: pnpm exec tsx scripts/create-admin-profile.ts
 */

import { db } from "@/db/db";
import { profiles } from "@/db/schema";
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function createAdminProfile() {
  try {
    console.log('🌱 Creating admin profile...\n');

    const clerkUserId = 'user_37vyDm8LHilksYNuVBcenvdktBW';
    const email = 'a_nungisa@yahoo.ca';
    
    // Check if profile already exists
    const existing = await db.select().from(profiles).where(eq(profiles.clerkUserId, clerkUserId)).limit(1);
    
    if (existing.length > 0) {
      console.log('✅ Profile already exists!');
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Email: ${existing[0].email}`);
      return;
    }

    // Create profile
    const profileId = uuidv4();
    await db.insert(profiles).values({
      id: profileId,
      clerkUserId: clerkUserId,
      firstName: 'Aubert',
      lastName: 'Nungisa',
      email: email,
      phoneNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Admin profile created successfully!');
    console.log(`   Profile ID: ${profileId}`);
    console.log(`   Clerk User ID: ${clerkUserId}`);
    console.log(`   Email: ${email}`);
    console.log('\n🎉 You can now sign in at http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Error creating profile:', error);
    throw error;
  }
}

// Run the script
createAdminProfile()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
