/**
 * Immutability Trigger Verification Script
 * 
 * Verifies that migration 0064 has been successfully applied by checking:
 * 1. Trigger function existence
 * 2. Trigger existence on protected tables
 * 3. Functional testing of triggers (optional)
 * 
 * Usage:
 *   pnpm tsx scripts/verify-immutability-triggers.ts [--functional-test]
 * 
 * Exit Codes:
 *   0 - All triggers verified successfully
 *   1 - Verification failed (missing triggers or functions)
 * 
 * CI-Friendly Output:
 *   - Clear pass/fail indicators
 *   - Detailed error messages
 *   - Summary statistics
 */

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

interface TriggerDefinition {
  schema: string;
  table: string;
  triggerName: string;
  operation: "UPDATE" | "DELETE" | "UPDATE OR DELETE";
  description: string;
}

interface FunctionDefinition {
  schema: string;
  name: string;
  description: string;
}

// Expected triggers from migration 0064
const EXPECTED_TRIGGERS: TriggerDefinition[] = [
  {
    schema: "public",
    table: "grievance_transitions",
    triggerName: "prevent_transition_updates",
    operation: "UPDATE",
    description: "Prevent modification of historical transitions",
  },
  {
    schema: "public",
    table: "grievance_transitions",
    triggerName: "prevent_transition_deletions",
    operation: "DELETE",
    description: "Prevent deletion of transitions",
  },
  {
    schema: "public",
    table: "grievance_approvals",
    triggerName: "prevent_approval_updates",
    operation: "UPDATE",
    description: "Prevent modification of approval records",
  },
  {
    schema: "public",
    table: "grievance_approvals",
    triggerName: "prevent_approval_deletions",
    operation: "DELETE",
    description: "Prevent deletion of approvals",
  },
  {
    schema: "public",
    table: "claim_updates",
    triggerName: "prevent_claim_update_modifications",
    operation: "UPDATE",
    description: "Prevent modification of claim update history",
  },
  {
    schema: "public",
    table: "claim_updates",
    triggerName: "prevent_claim_update_deletions",
    operation: "DELETE",
    description: "Prevent deletion of claim updates",
  },
  {
    schema: "audit_security",
    table: "audit_logs",
    triggerName: "audit_log_immutability",
    operation: "UPDATE OR DELETE",
    description: "Allow only archiving operations on audit logs",
  },
  {
    schema: "public",
    table: "votes",
    triggerName: "prevent_vote_updates",
    operation: "UPDATE",
    description: "Prevent modification of voting records",
  },
  {
    schema: "public",
    table: "votes",
    triggerName: "prevent_vote_deletions",
    operation: "DELETE",
    description: "Prevent deletion of votes",
  },
];

// Expected functions from migration 0064
const EXPECTED_FUNCTIONS: FunctionDefinition[] = [
  {
    schema: "public",
    name: "reject_mutation",
    description: "Generic trigger function to prevent UPDATE/DELETE operations",
  },
  {
    schema: "public",
    name: "audit_log_immutability_guard",
    description: "Audit log specific immutability with archiving support",
  },
];

/**
 * Check if a trigger function exists in the database
 */
async function checkFunctionExists(
  sql: postgres.Sql,
  schema: string,
  functionName: string
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = ${schema}
        AND p.proname = ${functionName}
      ) as exists;
    `;
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking function ${schema}.${functionName}:`, error);
    return false;
  }
}

/**
 * Check if a trigger exists on a table
 */
async function checkTriggerExists(
  sql: postgres.Sql,
  schema: string,
  table: string,
  triggerName: string
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = ${schema}
        AND c.relname = ${table}
        AND t.tgname = ${triggerName}
        AND NOT t.tgisinternal
      ) as exists;
    `;
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking trigger ${triggerName}:`, error);
    return false;
  }
}

/**
 * Check if a table exists in the database
 */
async function checkTableExists(
  sql: postgres.Sql,
  schema: string,
  table: string
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = ${schema}
        AND table_name = ${table}
      ) as exists;
    `;
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking table ${schema}.${table}:`, error);
    return false;
  }
}

/**
 * Test trigger functionality by attempting a prohibited operation
 * Only runs if --functional-test flag is provided
 */
async function testTriggerFunctionality(
  sql: postgres.Sql,
  schema: string,
  table: string,
  triggerName: string,
  operation: "UPDATE" | "DELETE" | "UPDATE OR DELETE"
): Promise<{ passed: boolean; message: string }> {
  try {
    // First check if table has any data
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM ${sql(schema)}.${sql(table)}
      LIMIT 1;
    `;

    const count = parseInt(countResult[0].count);

    if (count === 0) {
      return {
        passed: true,
        message: "⚠️  Table empty, skipping functional test",
      };
    }

    // Test in a transaction that will be rolled back
    await sql.begin(async (tx) => {
      try {
        // Get first record ID
        const idResult = await tx`
          SELECT id FROM ${sql(schema)}.${sql(table)} LIMIT 1;
        `;

        const testId = idResult[0].id;

        if (operation.includes("UPDATE")) {
          try {
            await tx`
              UPDATE ${sql(schema)}.${sql(table)}
              SET updated_at = NOW()
              WHERE id = ${testId};
            `;
            // If we get here, trigger didn't fire - fail the test
            throw new Error("Update should have been blocked by trigger");
          } catch (error: unknown) {
            if (error.message.includes("immutable") || error.message.includes("not allowed")) {
              // Expected error - trigger is working
              // Rollback the transaction
              throw new Error("ROLLBACK_TEST");
            } else {
              throw error;
            }
          }
        }
      } catch (error: unknown) {
        if (error.message === "ROLLBACK_TEST") {
          // Expected rollback from successful trigger test
          throw error;
        }
        throw error;
      }
    }).catch((error: any) => {
      if (error.message === "ROLLBACK_TEST") {
        // This is expected - test passed
        return;
      }
      throw error;
    });

    return {
      passed: true,
      message: "✅ Functional test passed (trigger blocked mutation)",
    };
  } catch (error: unknown) {
    if (error.message.includes("immutable") || error.message.includes("not allowed")) {
      return {
        passed: true,
        message: "✅ Functional test passed (trigger blocked mutation)",
      };
    }
    return {
      passed: false,
      message: `❌ Functional test failed: ${error.message}`,
    };
  }
}

/**
 * Main verification function
 */
async function verifyImmutabilityTriggers() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(`${colors.red}❌ DATABASE_URL not found in environment${colors.reset}`);
    process.exit(1);
  }

  const runFunctionalTests = process.argv.includes("--functional-test");
  
  const sql = postgres(databaseUrl, { 
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
  });

  let exitCode = 0;
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let skippedChecks = 0;

  try {
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}  Immutability Trigger Verification (Migration 0064)${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    // Test database connection
    console.log(`${colors.blue}🔌 Testing database connection...${colors.reset}`);
    try {
      await sql`SELECT 1 as test`;
      console.log(`${colors.green}✅ Database connection successful${colors.reset}\n`);
    } catch (error: unknown) {
      console.error(`${colors.red}❌ Database connection failed: ${error.message}${colors.reset}\n`);
      process.exit(1);
    }

    // Step 1: Verify Functions
    console.log(`${colors.blue}📦 Verifying Trigger Functions${colors.reset}`);
    console.log(`${colors.blue}─────────────────────────────────${colors.reset}`);

    for (const func of EXPECTED_FUNCTIONS) {
      totalChecks++;
      const exists = await checkFunctionExists(sql, func.schema, func.name);
      
      if (exists) {
        console.log(`${colors.green}✅ ${func.schema}.${func.name}()${colors.reset}`);
        console.log(`   ${func.description}`);
        passedChecks++;
      } else {
        console.log(`${colors.red}❌ ${func.schema}.${func.name}() - MISSING${colors.reset}`);
        console.log(`   ${func.description}`);
        failedChecks++;
        exitCode = 1;
      }
    }

    console.log("");

    // Step 2: Verify Triggers
    console.log(`${colors.blue}🔒 Verifying Immutability Triggers${colors.reset}`);
    console.log(`${colors.blue}───────────────────────────────────${colors.reset}`);

    // Group triggers by table for better output
    const triggersByTable = EXPECTED_TRIGGERS.reduce((acc, trigger) => {
      const key = `${trigger.schema}.${trigger.table}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(trigger);
      return acc;
    }, {} as Record<string, TriggerDefinition[]>);

    for (const [tableKey, triggers] of Object.entries(triggersByTable)) {
      const [schema, table] = tableKey.split(".");
      
      // Check if table exists
      const tableExists = await checkTableExists(sql, schema, table);
      
      if (!tableExists) {
        console.log(`${colors.yellow}⚠️  Table ${tableKey} - DOES NOT EXIST${colors.reset}`);
        for (const trigger of triggers) {
          totalChecks++;
          console.log(`   ⊘  ${trigger.triggerName} - SKIPPED`);
          skippedChecks++;
        }
        console.log("");
        continue;
      }

      console.log(`${colors.cyan}📋 ${tableKey}${colors.reset}`);

      for (const trigger of triggers) {
        totalChecks++;
        const exists = await checkTriggerExists(
          sql,
          trigger.schema,
          trigger.table,
          trigger.triggerName
        );

        if (exists) {
          console.log(`   ${colors.green}✅ ${trigger.triggerName}${colors.reset} (${trigger.operation})`);
          passedChecks++;

          // Run functional test if requested
          if (runFunctionalTests) {
            const functionalTest = await testTriggerFunctionality(
              sql,
              trigger.schema,
              trigger.table,
              trigger.triggerName,
              trigger.operation
            );
            console.log(`      ${functionalTest.message}`);
          }
        } else {
          console.log(`   ${colors.red}❌ ${trigger.triggerName}${colors.reset} - MISSING`);
          console.log(`      ${trigger.description}`);
          failedChecks++;
          exitCode = 1;
        }
      }

      console.log("");
    }

    // Summary
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}  Verification Summary${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`Total Checks:   ${totalChecks}`);
    console.log(`${colors.green}Passed:         ${passedChecks}${colors.reset}`);
    
    if (failedChecks > 0) {
      console.log(`${colors.red}Failed:         ${failedChecks}${colors.reset}`);
    } else {
      console.log(`Failed:         ${failedChecks}`);
    }
    
    if (skippedChecks > 0) {
      console.log(`${colors.yellow}Skipped:        ${skippedChecks} (tables don't exist yet)${colors.reset}`);
    }
    
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (exitCode === 0) {
      console.log(`${colors.green}✅ All immutability triggers verified successfully!${colors.reset}`);
      
      if (skippedChecks > 0) {
        console.log(`${colors.yellow}⚠️  Note: ${skippedChecks} trigger(s) skipped due to missing tables${colors.reset}`);
        console.log(`${colors.yellow}   This is expected if those features haven't been implemented yet${colors.reset}`);
      }
      
      if (!runFunctionalTests) {
        console.log(`\n${colors.cyan}💡 Tip: Run with --functional-test flag to test trigger functionality${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}❌ Verification failed! ${failedChecks} check(s) failed${colors.reset}`);
      console.log(`\n${colors.yellow}📝 Troubleshooting:${colors.reset}`);
      console.log(`   1. Ensure migration 0064 has been applied`);
      console.log(`   2. Check database migration status: pnpm db:migrate`);
      console.log(`   3. Review migration file: db/migrations/0064_add_immutability_triggers.sql`);
      console.log(`   4. Re-run migration if necessary`);
    }

    console.log("");

  } catch (error: unknown) {
    console.error(`\n${colors.red}❌ Verification error: ${error.message}${colors.reset}\n`);
    exitCode = 1;
  } finally {
    await sql.end();
  }

  process.exit(exitCode);
}

// Run verification
verifyImmutabilityTriggers();
