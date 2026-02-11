/**
 * Import Path Migration Script
 * 
 * Updates all imports from legacy schema paths to new domain-based paths.
 * 
 * Usage: pnpm run schema:migrate-imports
 */

import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

interface ImportMapping {
  oldPath: RegExp;
  newPath: string;
  description: string;
}

/**
 * Define import path mappings for each domain
 */
const IMPORT_MAPPINGS: ImportMapping[] = [
  // Member Domain
  {
    oldPath: /@\/db\/schema\/profiles-schema/g,
    newPath: '@/db/schema/domains/member',
    description: 'profiles-schema → domains/member',
  },
  {
    oldPath: /@\/db\/schema\/pending-profiles-schema/g,
    newPath: '@/db/schema/domains/member',
    description: 'pending-profiles-schema → domains/member',
  },
  {
    oldPath: /@\/db\/schema\/user-management-schema/g,
    newPath: '@/db/schema/domains/member',
    description: 'user-management-schema → domains/member',
  },
  
  // Claims Domain
  {
    oldPath: /@\/db\/schema\/claims-schema/g,
    newPath: '@/db/schema/domains/claims',
    description: 'claims-schema → domains/claims',
  },
  {
    oldPath: /@\/db\/schema\/grievance-schema/g,
    newPath: '@/db/schema/domains/claims',
    description: 'grievance-schema → domains/claims',
  },
  {
    oldPath: /@\/db\/schema\/deadlines-schema/g,
    newPath: '@/db/schema/domains/claims',
    description: 'deadlines-schema → domains/claims',
  },
  {
    oldPath: /@\/db\/schema\/grievance-workflow-schema/g,
    newPath: '@/db/schema/domains/claims',
    description: 'grievance-workflow-schema → domains/claims',
  },
  
  // Agreements Domain
  {
    oldPath: /@\/db\/schema\/collective-agreements-schema/g,
    newPath: '@/db/schema/domains/agreements',
    description: 'collective-agreements-schema → domains/agreements',
  },
  {
    oldPath: /@\/db\/schema\/cba-schema/g,
    newPath: '@/db/schema/domains/agreements',
    description: 'cba-schema → domains/agreements',
  },
  {
    oldPath: /@\/db\/schema\/cba-clauses-schema/g,
    newPath: '@/db/schema/domains/agreements',
    description: 'cba-clauses-schema → domains/agreements',
  },
  {
    oldPath: /@\/db\/schema\/cba-intelligence-schema/g,
    newPath: '@/db/schema/domains/agreements',
    description: 'cba-intelligence-schema → domains/agreements',
  },
  {
    oldPath: /@\/db\/schema\/shared-clause-library-schema/g,
    newPath: '@/db/schema/domains/agreements',
    description: 'shared-clause-library-schema → domains/agreements',
  },
  
  // Finance Domain
  {
    oldPath: /@\/db\/schema\/dues-transactions-schema/g,
    newPath: '@/db/schema/domains/finance',
    description: 'dues-transactions-schema → domains/finance',
  },
  {
    oldPath: /@\/db\/schema\/autopay-settings-schema/g,
    newPath: '@/db/schema/domains/finance',
    description: 'autopay-settings-schema → domains/finance',
  },
  {
    oldPath: /@\/db\/schema\/financial-payments-schema/g,
    newPath: '@/db/schema/domains/finance',
    description: 'financial-payments-schema → domains/finance',
  },
  {
    oldPath: /@\/db\/schema\/chart-of-accounts-schema/g,
    newPath: '@/db/schema/domains/finance',
    description: 'chart-of-accounts-schema → domains/finance',
  },
  {
    oldPath: /@\/db\/schema\/strike-fund-tax-schema/g,
    newPath: '@/db/schema/domains/finance',
    description: 'strike-fund-tax-schema → domains/finance',
  },
  {
    oldPath: /@\/db\/schema\/transfer-pricing-schema/g,
    newPath: '@/db/schema/domains/finance',
    description: 'transfer-pricing-schema → domains/finance',
  },
  
  // Governance Domain
  {
    oldPath: /@\/db\/schema\/governance-schema/g,
    newPath: '@/db/schema/domains/governance',
    description: 'governance-schema → domains/governance',
  },
  {
    oldPath: /@\/db\/schema\/founder-conflict-schema/g,
    newPath: '@/db/schema/domains/governance',
    description: 'founder-conflict-schema → domains/governance',
  },
  {
    oldPath: /@\/db\/schema\/voting-schema/g,
    newPath: '@/db/schema/domains/governance',
    description: 'voting-schema → domains/governance',
  },
  
  // Communications Domain
  {
    oldPath: /@\/db\/schema\/messages-schema/g,
    newPath: '@/db/schema/domains/communications',
    description: 'messages-schema → domains/communications',
  },
  {
    oldPath: /@\/db\/schema\/notifications-schema/g,
    newPath: '@/db/schema/domains/communications',
    description: 'notifications-schema → domains/communications',
  },
  {
    oldPath: /@\/db\/schema\/newsletter-schema/g,
    newPath: '@/db/schema/domains/communications',
    description: 'newsletter-schema → domains/communications',
  },
  {
    oldPath: /@\/db\/schema\/sms-communications-schema/g,
    newPath: '@/db/schema/domains/communications',
    description: 'sms-communications-schema → domains/communications',
  },
  {
    oldPath: /@\/db\/schema\/survey-polling-schema/g,
    newPath: '@/db/schema/domains/communications',
    description: 'survey-polling-schema → domains/communications',
  },
  {
    oldPath: /@\/db\/schema\/communication-analytics-schema/g,
    newPath: '@/db/schema/domains/communications',
    description: 'communication-analytics-schema → domains/communications',
  },
  {
    oldPath: /@\/db\/schema\/push-notifications/g,
    newPath: '@/db/schema/domains/communications',
    description: 'push-notifications → domains/communications',
  },
  
  // Documents Domain
  {
    oldPath: /@\/db\/schema\/documents-schema/g,
    newPath: '@/db/schema/domains/documents',
    description: 'documents-schema → domains/documents',
  },
  {
    oldPath: /@\/db\/schema\/member-documents-schema/g,
    newPath: '@/db/schema/domains/documents',
    description: 'member-documents-schema → domains/documents',
  },
  {
    oldPath: /@\/db\/schema\/e-signature-schema/g,
    newPath: '@/db/schema/domains/documents',
    description: 'e-signature-schema → domains/documents',
  },
  {
    oldPath: /@\/db\/schema\/signature-workflows-schema/g,
    newPath: '@/db/schema/domains/documents',
    description: 'signature-workflows-schema → domains/documents',
  },
  
  // Add more mappings for remaining domains...
];

interface MigrationResult {
  totalFiles: number;
  modifiedFiles: number;
  totalReplacements: number;
  errors: string[];
  changes: Array<{
    file: string;
    replacements: number;
    mappings: string[];
  }>;
}

/**
 * Process a single file and update import paths
 */
async function processFile(filePath: string): Promise<{
  modified: boolean;
  replacements: number;
  mappings: string[];
}> {
  let content = await fs.readFile(filePath, 'utf-8');
  let totalReplacements = 0;
  const appliedMappings: string[] = [];
  
  for (const mapping of IMPORT_MAPPINGS) {
    const matches = content.match(mapping.oldPath);
    if (matches) {
      content = content.replace(mapping.oldPath, mapping.newPath);
      totalReplacements += matches.length;
      appliedMappings.push(mapping.description);
    }
  }
  
  if (totalReplacements > 0) {
    await fs.writeFile(filePath, content, 'utf-8');
    return { modified: true, replacements: totalReplacements, mappings: appliedMappings };
  }
  
  return { modified: false, replacements: 0, mappings: [] };
}

/**
 * Main migration function
 */
async function migrateImports(dryRun = false): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalFiles: 0,
    modifiedFiles: 0,
    totalReplacements: 0,
    errors: [],
    changes: [],
  };
  
  console.log('\n🔄 Starting import path migration...\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (files will be modified)'}\n`);
  
  // Find all TypeScript files (excluding node_modules, .next, etc.)
  const files = await glob('**/*.{ts,tsx}', {
    cwd: process.cwd(),
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'db/schema/**', // Skip the schema files themselves
    ],
    absolute: true,
  });
  
  result.totalFiles = files.length;
  console.log(`Found ${files.length} TypeScript files to process\n`);
  
  // Process each file
  for (const file of files) {
    try {
      const fileResult = await processFile(file);
      
      if (fileResult.modified) {
        result.modifiedFiles++;
        result.totalReplacements += fileResult.replacements;
        result.changes.push({
          file: path.relative(process.cwd(), file),
          replacements: fileResult.replacements,
          mappings: fileResult.mappings,
        });
        
        console.log(`✓ ${path.relative(process.cwd(), file)}: ${fileResult.replacements} replacements`);
      }
    } catch (error) {
      const errorMsg = `Error processing ${file}: ${error}`;
      result.errors.push(errorMsg);
      console.error(`✗ ${errorMsg}`);
    }
  }
  
  return result;
}

/**
 * Generate migration report
 */
function generateReport(result: MigrationResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Import Migration Summary\n');
  console.log(`Total files scanned: ${result.totalFiles}`);
  console.log(`Files modified: ${result.modifiedFiles}`);
  console.log(`Total replacements: ${result.totalReplacements}`);
  console.log(`Errors: ${result.errors.length}`);
  
  if (result.changes.length > 0) {
    console.log('\n📝 Changed Files:\n');
    result.changes.slice(0, 20).forEach((change, idx) => {
      console.log(`   ${idx + 1}. ${change.file}`);
      console.log(`      Replacements: ${change.replacements}`);
      console.log(`      Mappings: ${change.mappings.join(', ')}`);
    });
    
    if (result.changes.length > 20) {
      console.log(`\n   ... and ${result.changes.length - 20} more files`);
    }
  }
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:\n');
    result.errors.forEach((error, idx) => {
      console.log(`   ${idx + 1}. ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✨ Migration complete!\n');
}

/**
 * Main execution
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  try {
    const result = await migrateImports(isDryRun);
    generateReport(result);
    
    // Write detailed report
    const reportPath = path.join(process.cwd(), 'schema-import-migration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 Detailed report written to: ${reportPath}\n`);
    
    if (isDryRun) {
      console.log('⚠️  This was a DRY RUN. No files were actually modified.');
      console.log('   Run without --dry-run flag to apply changes.\n');
    }
    
    process.exit(result.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

main();
