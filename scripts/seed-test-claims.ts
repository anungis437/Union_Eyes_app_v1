/**
 * Seed Test Claims
 * 
 * Creates test claims in database for Phase 1 development testing.
 * Run with: npx tsx scripts/seed-test-claims.ts [memberId] [stewardId]
 * 
 * Note: Environment variables are loaded from .env file automatically by tsx
 */

import { createClaim } from "../db/queries/claims-queries";

async function seedTestClaims() {
  console.log("🌱 Seeding test claims for Phase 1 development...\n");

  const tenantId = "default-tenant-id";
  
  // Get memberId from command line argument or use default
  const memberId = process.argv[2] || "user_test_member_id";
  
  // Optional: Get steward user ID to assign some claims for workbench testing
  const stewardId = process.argv[3];
  
  if (memberId === "user_test_member_id") {
    console.warn("⚠️  WARNING: Using default test member ID.");
    console.warn("   To use your real Clerk user ID, run:");
    console.warn("   npx tsx scripts/seed-test-claims.ts YOUR_USER_ID\n");
    if (stewardId) {
      console.warn("   Note: Steward ID provided but member ID is default. Claims won't be properly created.\n");
    }
  } else {
    console.log(`✅ Using member ID: ${memberId}`);
    if (stewardId) {
      console.log(`✅ Using steward ID: ${stewardId}`);
      console.log(`   Some claims will be assigned to this steward for workbench testing.\n`);
    } else {
      console.log(`   Tip: Add a steward ID as second argument to test the workbench:`);
      console.log(`   npx tsx scripts/seed-test-claims.ts ${memberId} YOUR_STEWARD_ID\n`);
    }
  }
  
  const testClaims = [
    {
      tenantId,
      memberId,
      isAnonymous: false,
      claimType: "grievance_pay" as const,
      status: "submitted" as const,
      priority: "high" as const,
      incidentDate: new Date("2025-11-10"),
      location: "Plant A - Floor 2",
      description: "Unpaid overtime hours for October 2025. Worked 12 hours of overtime that were not reflected in paycheck.",
      desiredOutcome: "Payment for 12 hours of overtime at time-and-a-half rate ($450 total)",
      witnessesPresent: true,
      witnessDetails: "John Doe (supervisor), Jane Smith (coworker)",
      previouslyReported: false,
    },
    {
      tenantId,
      memberId,
      isAnonymous: false,
      claimType: "workplace_safety" as const,
      status: "under_review" as const,
      priority: "critical" as const,
      incidentDate: new Date("2025-11-12"),
      location: "Loading Dock - Bay 3",
      description: "Damaged flooring creating trip hazards. Multiple cracks and uneven surfaces pose risk of injury.",
      desiredOutcome: "Immediate repair of flooring and safety inspection",
      witnessesPresent: false,
      previouslyReported: true,
      previousReportDetails: "Reported to supervisor Mike Johnson 2 weeks ago, no action taken",
    },
    {
      tenantId,
      memberId,
      isAnonymous: false,
      claimType: "grievance_schedule" as const,
      status: "resolved" as const,
      priority: "medium" as const,
      incidentDate: new Date("2025-11-05"),
      location: "Office - Shift Planning",
      description: "Schedule changed without proper 48-hour notice as required by contract Article 12.3",
      desiredOutcome: "Compensation for affected days per contract terms ($200)",
      witnessesPresent: false,
      previouslyReported: false,
      resolutionNotes: "Management acknowledged contract violation. Compensation approved and paid.",
      resolutionDate: new Date("2025-11-11"),
    },
    {
      tenantId,
      memberId,
      isAnonymous: true,
      claimType: "discrimination_gender" as const,
      status: "investigation" as const,
      priority: "high" as const,
      incidentDate: new Date("2025-11-08"),
      location: "Department 5 - Management Office",
      description: "Promotion denied despite meeting all qualifications. Less qualified male colleague promoted instead.",
      desiredOutcome: "Review of promotion decision and consideration for next available position",
      witnessesPresent: true,
      witnessDetails: "Three coworkers observed discriminatory comments during meeting (names provided separately)",
      previouslyReported: false,
    },
    {
      tenantId,
      memberId,
      isAnonymous: false,
      claimType: "grievance_discipline" as const,
      status: "pending_documentation" as const,
      priority: "medium" as const,
      incidentDate: new Date("2025-11-09"),
      location: "Production Line B",
      description: "Written warning issued without proper progressive discipline procedure per contract Article 8.2",
      desiredOutcome: "Removal of warning from personnel file",
      witnessesPresent: true,
      witnessDetails: "Union steward present during disciplinary meeting",
      previouslyReported: false,
    },
  ];

  let successCount = 0;
  let failCount = 0;

  // Import assignClaim for steward assignment
  const { assignClaim } = await import("../db/queries/claims-queries");
  
  for (let i = 0; i < testClaims.length; i++) {
    const claim = testClaims[i];
    try {
      const created = await createClaim(claim);
      console.log(`✅ Created claim ${i + 1}/5: ${created.claimNumber}`);
      console.log(`   Type: ${claim.claimType}`);
      console.log(`   Status: ${claim.status}`);
      console.log(`   Priority: ${claim.priority}`);
      
      // Assign claims 2 and 4 to steward if stewardId provided (for workbench testing)
      if (stewardId && (i === 1 || i === 3)) {
        try {
          await assignClaim(created.claimId, stewardId, stewardId);
          console.log(`   🎯 Assigned to steward (for workbench testing)`);
        } catch (error) {
          console.log(`   ⚠️  Failed to assign to steward: ${error}`);
        }
      }
      
      console.log("");
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create claim ${i + 1}/5:`, error);
      failCount++;
    }
  }

  console.log("\n📊 Seed Summary:");
  console.log(`   ✅ Success: ${successCount}/5`);
  console.log(`   ❌ Failed: ${failCount}/5`);
  
  if (successCount === 5) {
    console.log("\n🎉 All test claims created successfully!");
    console.log("\n📈 Expected Dashboard Stats:");
    console.log("   • Active Claims: 4 (submitted + under_review + investigation + pending_documentation)");
    console.log("   • Pending Reviews: 2 (submitted + under_review)");
    console.log("   • Resolved Cases: 1");
    console.log("   • High Priority: 2 (high + critical)");
    console.log("   • Resolution Rate: 20% (1 resolved / 5 total)");
    console.log("\n🔗 Next Steps:");
    console.log("   1. Update memberId on line 15 with your actual Clerk user ID");
    console.log("   2. Restart dev server: npm run dev");
    console.log("   3. Visit /dashboard to see real statistics");
    console.log("   4. Check database with: npm run db:studio");
  } else {
    console.log("\n⚠️  Some claims failed to create. Check error messages above.");
    console.log("   Common issues:");
    console.log("   • DATABASE_URL not set in .env.local");
    console.log("   • Database connection failed");
    console.log("   • Claims table not created (run migrations)");
  }
}

// Run the seed script
seedTestClaims()
  .then(() => {
    console.log("\n✅ Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed script failed:", error);
    process.exit(1);
  });
