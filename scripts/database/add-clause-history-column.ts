/**
 * Migration: Add organization_id column to clause_comparisons_history
 */

import { db } from "../../db";
import { sql } from "drizzle-orm";

async function addColumn() {
  try {
    console.log("Adding organization_id column to clause_comparisons_history...");
    
    // Add the column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE clause_comparisons_history 
      ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)
    `);
    
    console.log("Column added successfully!");
    
    // Add index
    console.log("Creating index on organization_id...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_clause_comparisons_org 
      ON clause_comparisons_history(organization_id)
    `);
    
    console.log("Index created successfully!");
    console.log("✅ Migration complete!");
    
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

addColumn()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
