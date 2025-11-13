/**
 * Create Test Claims via API
 * 
 * Alternative to seed script that creates test claims via HTTP API requests
 * Run with dev server active: npx tsx scripts/create-test-claims-api.ts
 */

const API_BASE = "http://localhost:3001";

// You'll need to get a valid session token from your browser
// 1. Log in at http://localhost:3001
// 2. Open DevTools → Application → Cookies
// 3. Copy the __session cookie value
const SESSION_TOKEN = process.argv[2];

if (!SESSION_TOKEN) {
  console.error("❌ ERROR: Session token required");
  console.error("Usage: npx tsx scripts/create-test-claims-api.ts YOUR_SESSION_TOKEN");
  console.error("\nTo get your session token:");
  console.error("1. Log in at http://localhost:3001");
  console.error("2. Open DevTools → Application → Cookies");
  console.error("3. Copy the __session cookie value");
  console.error("4. Run: npx tsx scripts/create-test-claims-api.ts <token>");
  process.exit(1);
}

const testClaims = [
  {
    claimType: "grievance_pay",
    priority: "high",
    incidentDate: "2025-11-10",
    location: "Plant A - Floor 2",
    description: "Unpaid overtime hours for October 2025. Worked 12 hours of overtime that were not reflected in paycheck.",
    desiredOutcome: "Payment for 12 hours of overtime at time-and-a-half rate ($450 total)",
    witnessesPresent: true,
    witnessDetails: "John Doe (supervisor), Jane Smith (coworker)",
    previouslyReported: false,
    isAnonymous: false,
  },
  {
    claimType: "workplace_safety",
    priority: "critical",
    incidentDate: "2025-11-12",
    location: "Loading Dock - Bay 3",
    description: "Damaged flooring creating trip hazards. Multiple cracks and uneven surfaces pose risk of injury.",
    desiredOutcome: "Immediate repair of flooring and safety inspection",
    witnessesPresent: false,
    previouslyReported: true,
    previousReportDetails: "Reported to supervisor Mike Johnson 2 weeks ago, no action taken",
    isAnonymous: false,
  },
  {
    claimType: "grievance_schedule",
    priority: "medium",
    incidentDate: "2025-11-05",
    location: "Office - Shift Planning",
    description: "Schedule changed without proper 48-hour notice as required by contract Article 12.3",
    desiredOutcome: "Compensation for affected days per contract terms ($200)",
    witnessesPresent: false,
    previouslyReported: false,
    isAnonymous: false,
  },
  {
    claimType: "discrimination_gender",
    priority: "high",
    incidentDate: "2025-11-08",
    location: "Department 5 - Management Office",
    description: "Promotion denied despite meeting all qualifications. Less qualified male colleague promoted instead.",
    desiredOutcome: "Review of promotion decision and consideration for next available position",
    witnessesPresent: true,
    witnessDetails: "Three coworkers observed discriminatory comments during meeting (names provided separately)",
    previouslyReported: false,
    isAnonymous: true,
  },
  {
    claimType: "grievance_discipline",
    priority: "medium",
    incidentDate: "2025-11-09",
    location: "Production Line B",
    description: "Written warning issued without proper progressive discipline procedure per contract Article 8.2",
    desiredOutcome: "Removal of warning from personnel file",
    witnessesPresent: true,
    witnessDetails: "Union steward present during disciplinary meeting",
    previouslyReported: false,
    isAnonymous: false,
  },
];

async function createTestClaims() {
  console.log("🌱 Creating test claims via API...\n");
  console.log(`API Base: ${API_BASE}`);
  console.log(`Session Token: ${SESSION_TOKEN.substring(0, 20)}...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < testClaims.length; i++) {
    const claim = testClaims[i];
    try {
      console.log(`Creating claim ${i + 1}/5...`);
      
      const response = await fetch(`${API_BASE}/api/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `__session=${SESSION_TOKEN}`,
        },
        body: JSON.stringify(claim),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const created = await response.json();
      console.log(`✅ Created claim ${i + 1}/5: ${created.claimNumber || 'NO-NUMBER'}`);
      console.log(`   Type: ${claim.claimType}`);
      console.log(`   Priority: ${claim.priority}`);
      console.log("");
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create claim ${i + 1}/5:`, error);
      console.error("");
      failCount++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   ✅ Success: ${successCount}/5`);
  console.log(`   ❌ Failed: ${failCount}/5`);

  if (successCount === 5) {
    console.log("\n🎉 All test claims created successfully!");
    console.log("\n📈 Expected Dashboard Stats:");
    console.log("   • Active Claims: 5");
    console.log("   • Pending Reviews: 2");
    console.log("   • High Priority: 2");
    console.log("\n🔗 Next Steps:");
    console.log("   1. Refresh /dashboard to see updated statistics");
    console.log("   2. Visit /dashboard/claims to see all claims");
    console.log("   3. Test filtering by status, priority, and type");
  } else {
    console.log("\n⚠️  Some claims failed to create. Check error messages above.");
    console.log("   Common issues:");
    console.log("   • Invalid session token (log in again and get new token)");
    console.log("   • Dev server not running on port 3001");
    console.log("   • Database connection issue");
  }
}

// Run the script
createTestClaims()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
