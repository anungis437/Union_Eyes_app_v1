/**
 * Script to check and fix PostgreSQL enum conflicts
 * Lists existing enums and identifies duplicates with migration
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

// Read the migration file
const migrationFile = './db/migrations/0004_phase2_complete.sql';
const migration = fs.readFileSync(migrationFile, 'utf-8');

// Extract all CREATE TYPE statements from migration
const enumPattern = /CREATE TYPE "public"\."([^"]+)" AS ENUM\(([^)]+)\)/g;
const migrationEnums: Record<string, string[]> = {};

let match;
while ((match = enumPattern.exec(migration)) !== null) {
  const enumName = match[1];
  const enumValues = match[2]
    .split(',')
    .map(v => v.trim().replace(/'/g, ''))
    .filter(v => v);
  
  migrationEnums[enumName] = enumValues;
}

console.log('📋 Enums in migration file:');
console.log('='.repeat(60));
Object.entries(migrationEnums).forEach(([name, values]) => {
  console.log(`\n${name}:`);
  console.log(`  Values: ${values.join(', ')}`);
});

console.log('\n\n🔍 Key findings:');
console.log('='.repeat(60));

// Find enums with "pending" value
const pendingEnums = Object.entries(migrationEnums)
  .filter(([_, values]) => values.includes('pending'))
  .map(([name, _]) => name);

console.log(`\n⚠️  Enums containing "pending" value (${pendingEnums.length} total):`);
pendingEnums.forEach(name => {
  console.log(`  - ${name}`);
});

// Check for potential duplicates
const enumNames = Object.keys(migrationEnums);
const duplicates = enumNames.filter((name, index) => enumNames.indexOf(name) !== index);

if (duplicates.length > 0) {
  console.log(`\n🚨 Duplicate enum definitions (${duplicates.length} total):`);
  duplicates.forEach(name => {
    console.log(`  - ${name}`);
  });
} else {
  console.log(`\n✅ No duplicate enum definitions found`);
}

// Recommendations
console.log('\n\n💡 Recommendations to fix enum conflicts:');
console.log('='.repeat(60));
console.log(`
1. The migration tries to CREATE enums with EXCEPTION for duplicates
   - This should handle existing enums gracefully
   - The "pending" conflict suggests the enum already exists in DB

2. Possible causes:
   - Migration already partially applied
   - Enum created by earlier migration but not tracked
   - Enum manually created in database

3. Solutions:
   Option A: Drop and recreate (data loss risk)
     - DROP TYPE IF EXISTS newsletter_recipient_status CASCADE;
     - Re-run migration
   
   Option B: Skip migration and inspect database (safe)
     - Check what enums actually exist in DB
     - Align migration with current state
   
   Option C: Modify migration to use ALTER TYPE ADD VALUE
     - For new enum values, use ALTER not CREATE
     - Requires enum already exists

4. Recommended approach:
   - Connect to database
   - Run: SELECT typname FROM pg_type WHERE typtype = 'e';
   - Compare with migration enums
   - Update migration or database to match
`);

console.log('\n📊 Next steps:');
console.log(`
1. npx tsx scripts/check-enums.ts  (this script)
2. Review enum conflicts in detail
3. Create targeted fix migration
4. Apply fixed migration with testing
`);
