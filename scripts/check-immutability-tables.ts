/**
 * Check Database Tables for Migration 0064
 * 
 * This script checks which tables exist before applying immutability triggers
 */

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function checkTables() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    console.log("🔍 Checking tables for immutability migration...\n");

    const tables = [
      "grievance_transitions",
      "grievance_approvals",
      "claim_updates",
      "payment_transactions",
      "votes",
      "audit_security.audit_logs"
    ];

    for (const table of tables) {
      try {
        const [schema, tableName] = table.includes(".") 
          ? table.split(".")
          : ["public", table];

        const result = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = ${schema}
            AND table_name = ${tableName}
          ) as exists;
        `;

        if (result[0].exists) {
          // Check record count
          const countQuery = schema === "public"
            ? `SELECT COUNT(*) as count FROM "${tableName}"`
            : `SELECT COUNT(*) as count FROM ${schema}.${tableName}`;
          
          const count = await sql.unsafe(countQuery);
          console.log(`✅ ${table} (${count[0].count} records)`);
        } else {
          console.log(`❌ ${table} - DOES NOT EXIST`);
        }
      } catch (error: any) {
        console.log(`❌ ${table} - ERROR: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    await sql.end();
  }
}

checkTables().catch(console.error);
