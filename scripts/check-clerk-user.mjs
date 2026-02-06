/**
 * Script to check if a Clerk user exists
 * Run with: node --env-file=.env.staging scripts/check-clerk-user.mjs
 */

import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function checkUser(email) {
  try {
    console.log(`Checking for user: ${email}`);
    
    const users = await clerkClient.users.getUserList({
      emailAddress: [email]
    });

    if (users.data.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = users.data[0];
    console.log('✅ User found!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.emailAddresses[0].emailAddress}`);
    console.log(`   Email Verified: ${user.emailAddresses[0].verification?.status}`);
    console.log(`   Has Password: ${user.passwordEnabled ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
    console.log(`   Last Sign In: ${user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'Never'}`);
    console.log(`   Banned: ${user.banned ? '🚫 YES' : '✅ No'}`);
    console.log(`   Locked: ${user.locked ? '🔒 YES' : '✅ No'}`);
    console.log(`   Two Factor: ${user.twoFactorEnabled ? '🔐 Enabled' : '✅ Disabled'}`);
    
  } catch (error) {
    console.error('Error checking user:', error);
  }
}

// Run the check
const emailToCheck = process.argv[2] || 'a_nungisa@yahoo.ca';
checkUser(emailToCheck);
