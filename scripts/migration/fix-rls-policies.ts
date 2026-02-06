import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const MIGRATION_DIR = 'database/migrations';
const MIGRATIONS = [
  '044_clc_hierarchy_system.sql',
  '045_pki_digital_signatures.sql',
  '047_pension_hw_trust_system.sql',
  '048_cra_tax_compliance.sql',
  '049_equity_demographics.sql'
];

async function fixRlsPolicies() {
  for (const migration of MIGRATIONS) {
    const filePath = join(MIGRATION_DIR, migration);
    console.log(`\n📄 Processing ${migration}...`);
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      // Find all CREATE POLICY statements and add DROP IF EXISTS before them
      const policyRegex = /^(CREATE POLICY (\w+) ON (\w+))/gm;
      const matches = Array.from(content.matchAll(policyRegex));
      
      console.log(`   Found ${matches.length} CREATE POLICY statements`);
      
      // Process in reverse order to maintain line positions
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const fullMatch = match[0];
        const policyName = match[2];
        const tableName = match[3];
        const index = match.index!;
        
        // Check if DROP already exists before this CREATE
        const beforeText = content.substring(Math.max(0, index - 200), index);
        if (beforeText.includes(`DROP POLICY IF EXISTS ${policyName}`)) {
          console.log(`   ⏭️  Policy ${policyName} already has DROP statement`);
          continue;
        }
        
        // Insert DROP statement before CREATE
        const dropStatement = `DROP POLICY IF EXISTS ${policyName} ON ${tableName};\n`;
        content = content.substring(0, index) + dropStatement + content.substring(index);
        modified = true;
        console.log(`   ✅ Added DROP for policy ${policyName} on ${tableName}`);
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        console.log(`   💾 Saved ${migration}`);
      } else {
        console.log(`   ℹ️  No changes needed for ${migration}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${migration}:`, error);
    }
  }
  
  console.log('\n✅ RLS policy fix complete!');
}

fixRlsPolicies();
