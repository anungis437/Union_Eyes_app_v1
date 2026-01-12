/**
 * Script to check if a user profile exists in the database
 * Run with: tsx scripts/check-user-profile.ts
 */

import { createClerkClient } from '@clerk/backend';
import { db } from '../db/db';
import { profiles } from '../db/schema/profiles-schema';
import { eq } from 'drizzle-orm';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function checkUserProfile(email) {
  try {
    console.log(`\n🔍 Checking user: ${email}\n`);
    
    // 1. Check Clerk
    const users = await clerkClient.users.getUserList({
      emailAddress: [email]
    });

    if (users.data.length === 0) {
      console.log('❌ User not found in Clerk');
      await client.end();
      return;
    }

    const user = users.data[0];
    console.log('✅ Clerk User Found:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.emailAddresses[0].emailAddress}`);
    console.log(`   Email Verified: ${user.emailAddresses[0].verification?.status}`);
    
    // 2. Check Database Profile
    console.log('\n🗄️  Checking Database Profile...');
    const userProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.clerkUserId, user.id))
      .limit(1);

    if (userProfile.length === 0) {
      console.log('❌ No profile found in database');
      console.log('\n💡 To create a profile, run:');
      console.log(`   node scripts/create-user-profile.mjs ${user.id} "${user.emailAddresses[0].emailAddress}"`);
    } else {
      console.log('✅ Database Profile Found:');
      console.log(`   Profile ID: ${userProfile[0].id}`);
      console.log(`   Name: ${userProfile[0].firstName || 'N/A'} ${userProfile[0].lastName || 'N/A'}`);
      console.log(`   Email: ${userProfile[0].email}`);
      console.log(`   Created: ${new Date(userProfile[0].createdAt).toLocaleString()}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the check
const emailToCheck = process.argv[2] || 'a_nungisa@yahoo.ca';
checkUserProfile(emailToCheck);
