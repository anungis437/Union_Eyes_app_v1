#!/usr/bin/env tsx
/**
 * Route Migration Script
 * Automatically migrates API routes from Clerk auth to withAuth pattern
 * 
 * Usage:
 *   tsx scripts/migration/migrate-routes.ts [path]
 *   tsx scripts/migration/migrate-routes.ts --dry-run [path]
 *   tsx scripts/migration/migrate-routes.ts --scan  # Show files needing migration
 */

import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

interface MigrationStats {
  filesProcessed: number;
  filesModified: number;
  filesSkipped: number;
  errors: string[];
}

const stats: MigrationStats = {
  filesProcessed: 0,
  filesModified: 0,
  filesSkipped: 0,
  errors: [],
};

// Patterns to detect files needing migration
const needsMigrationPatterns = [
  /from ['"]@clerk\/nextjs\/server['"]/,
  /await auth\(\)/,
  /const \{ userId \} = await auth\(\)/,
];

// Check if file needs migration
function needsMigration(content: string): boolean {
  return needsMigrationPatterns.some(pattern => pattern.test(content));
}

// Transform route file
function transformRoute(content: string, filePath: string): string | null {
  let modified = content;
  let hasChanges = false;

  // Step 1: Replace Clerk imports with security middleware imports
  if (modified.includes("from '@clerk/nextjs/server'") || modified.includes('from "@clerk/nextjs/server"')) {
    const importMatch = modified.match(/import\s*{[^}]*}\s*from\s*['"]@clerk\/nextjs\/server['"];?\n?/);
    if (importMatch) {
      // Determine what to import based on file content
      const needsValidatedBody = /await request\.json\(\)/.test(modified) || /const body = await/.test(modified);
      const needsLogAudit = true; // Always add audit logging
      
      const imports = ['withAuth'];
      if (needsValidatedBody) imports.push('withValidatedBody');
      if (needsLogAudit) imports.push('logApiAuditEvent');
      
      const newImport = `import { ${imports.join(', ')} } from '@/lib/middleware/api-security';\n`;
      
      // Also keep other imports if they exist (currentUser, etc.)
      const hasOtherClerkImports = importMatch[0].includes('currentUser');
      if (hasOtherClerkImports) {
        modified = modified.replace(
          importMatch[0],
          `${newImport}import { currentUser } from '@clerk/nextjs/server';\n`
        );
      } else {
        modified = modified.replace(importMatch[0], newImport);
      }
      
      hasChanges = true;
    }
  }

  // Step 2: Add Zod import if needed and not present
  if (!modified.includes("from 'zod'") && !modified.includes('from "zod"')) {
    if (/await request\.json\(\)/.test(modified)) {
      const importSection = modified.match(/^(import[\s\S]*?)\n\n/);
      if (importSection) {
        modified = modified.replace(
          importSection[0],
          `${importSection[0]}import { z } from 'zod';\n\n`
        );
        hasChanges = true;
      }
    }
  }

  // Step 3: Transform GET method
  const getMatch = modified.match(
    /export async function GET\([^)]*\)([^{]*)\{/
  );
  if (getMatch && /const \{ userId \} = await auth\(\)/.test(modified)) {
    const isDynamicRoute = getMatch[0].includes('params:');
    const funcStart = modified.indexOf(getMatch[0]);
    const funcBody = extractFunctionBody(modified, funcStart + getMatch[0].length - 1);
    
    if (funcBody) {
      const fullFunction = getMatch[0] + funcBody;
      
      if (isDynamicRoute) {
        const transformed = transformDynamicMethod('GET', fullFunction, filePath);
        if (transformed) {
          modified = modified.replace(fullFunction, transformed);
          hasChanges = true;
        }
      } else {
        const transformed = transformRegularMethod('GET', fullFunction, filePath);
        if (transformed) {
          modified = modified.replace(fullFunction, transformed);
          hasChanges = true;
        }
      }
    }
  }

  // Step 4: Transform POST method
  const postMatch = modified.match(
    /export async function POST\(([\s\S]*?)\n\}\n/m
  );
  if (postMatch && modified.includes('await auth()')) {
    const hasBodyValidation = postMatch[0].includes('await request.json()');
    const isDynamicRoute = postMatch[0].includes('params:');
    
    if (hasBodyValidation) {
      // Use withValidatedBody pattern
      // This is complex - for now, mark for manual review
      console.log(`  ⚠️  POST with body validation needs manual schema: ${filePath}`);
    } else if (isDynamicRoute) {
      const transformed = transformDynamicMethod('POST', postMatch[0], filePath);
      if (transformed) {
        modified = modified.replace(postMatch[0], transformed);
        hasChanges = true;
      }
    } else {
      const transformed = transformRegularMethod('POST', postMatch[0], filePath);
      if (transformed) {
        modified = modified.replace(postMatch[0], transformed);
        hasChanges = true;
      }
    }
  }

  // Similar for PATCH, PUT, DELETE
  ['PATCH', 'PUT', 'DELETE'].forEach(method => {
    const regex = new RegExp(`export async function ${method}\\(([\\s\\S]*?)\\n\\}\\n`, 'm');
    const match = modified.match(regex);
    if (match && modified.includes('await auth()')) {
      const isDynamicRoute = match[0].includes('params:');
      const transformed = isDynamicRoute 
        ? transformDynamicMethod(method, match[0], filePath)
        : transformRegularMethod(method, match[0], filePath);
      
      if (transformed) {
        modified = modified.replace(match[0], transformed);
        hasChanges = true;
      }
    }
  });

  return hasChanges ? modified : null;
}

function transformRegularMethod(method: string, content: string, filePath: string): string {
  // Extract function body
  const bodyMatch = content.match(/\{([\s\S]*)\}/);
  if (!bodyMatch) return content;

  const body = bodyMatch[1];
  
  // Remove auth check
  let cleanedBody = body
    .replace(/const \{ userId \} = await auth\(\);?\n?\s*/g, '')
    .replace(/if \(!userId\) \{[\s\S]*?\}\n?\s*/g, '');

  // Replace userId with user.id
  cleanedBody = cleanedBody.replace(/\buserId\b/g, 'user.id');

  return `export const ${method} = async (request: NextRequest) => {
  return withAuth(async (req, user) => {${cleanedBody}
  })(request);
};
`;
}

function transformDynamicMethod(method: string, content: string, filePath: string): string {
  // Extract params type and body
  const paramsMatch = content.match(/\{ params \}: \{ params: ([^}]+) \}/);
  const paramsType = paramsMatch ? paramsMatch[1] : '{ id: string }';
  
  const bodyMatch = content.match(/\{([\s\S]*)\}/);
  if (!bodyMatch) return content;

  const body = bodyMatch[1];
  
  // Remove auth check
  let cleanedBody = body
    .replace(/const \{ userId \} = await auth\(\);?\n?\s*/g, '')
    .replace(/const authResult = await auth\(\);?\n?\s*userId = authResult\.userId;?\n?\s*/g, '')
    .replace(/if \(!userId\) \{[\s\S]*?\}\n?\s*/g, '');

  // Replace userId with user.id
  cleanedBody = cleanedBody.replace(/\buserId\b/g, 'user.id');
  
  // Handle Promise<{ params }> pattern
  const hasAsyncParams = content.includes('params: Promise<');
  const paramsDecl = hasAsyncParams ? `params: Promise<${paramsType}>` : `params: ${paramsType}`;

  return `export const ${method} = async (
  request: NextRequest,
  { params }: { ${paramsDecl} }
) => {
  return withAuth(async (req, user) => {${cleanedBody}
  })(request, { params });
};
`;
}

// Scan directory for files needing migration
function scanDirectory(dir: string): string[] {
  const pattern = path.join(dir, '**/route.ts').replace(/\\/g, '/');
  const files = globSync(pattern, { 
    ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    absolute: true 
  });
  
  return files.filter(file => {
    const content = fs.readFileSync(file, 'utf-8');
    return needsMigration(content);
  });
}

// Main migration function
function migrateFile(filePath: string, dryRun: boolean = false): boolean {
  try {
    stats.filesProcessed++;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (!needsMigration(content)) {
      console.log(`  ⏭️  Skipped (already migrated): ${path.relative(process.cwd(), filePath)}`);
      stats.filesSkipped++;
      return false;
    }

    const transformed = transformRoute(content, filePath);
    
    if (!transformed) {
      console.log(`  ⏭️  Skipped (no changes): ${path.relative(process.cwd(), filePath)}`);
      stats.filesSkipped++;
      return false;
    }

    if (dryRun) {
      console.log(`  ✓  Would migrate: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    // Backup original
    const backupPath = `${filePath}.backup`;
    fs.writeFileSync(backupPath, content);

    // Write transformed content
    fs.writeFileSync(filePath, transformed);
    
    console.log(`  ✅ Migrated: ${path.relative(process.cwd(), filePath)}`);
    stats.filesModified++;
    
    return true;
  } catch (error) {
    const errorMsg = `Error migrating ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`  ❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
    return false;
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const scan = args.includes('--scan');
const targetPath = args.find(arg => !arg.startsWith('--')) || 'app/api';

console.log('🚀 Route Migration Tool\n');

if (scan) {
  console.log(`📁 Scanning ${targetPath} for files needing migration...\n`);
  const files = scanDirectory(targetPath);
  
  console.log(`\nFound ${files.length} files needing migration:\n`);
  files.forEach((file, i) => {
    console.log(`  ${i + 1}. ${path.relative(process.cwd(), file)}`);
  });
  
  process.exit(0);
}

console.log(`📁 Target: ${targetPath}`);
console.log(`🔍 Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

const filesToMigrate = scanDirectory(targetPath);

if (filesToMigrate.length === 0) {
  console.log('✨ No files need migration!');
  process.exit(0);
}

console.log(`Found ${filesToMigrate.length} files to migrate\n`);

filesToMigrate.forEach((file, i) => {
  console.log(`[${i + 1}/${filesToMigrate.length}] ${path.relative(process.cwd(), file)}`);
  migrateFile(file, dryRun);
});

console.log('\n📊 Migration Summary:');
console.log(`  Total processed: ${stats.filesProcessed}`);
console.log(`  Modified: ${stats.filesModified}`);
console.log(`  Skipped: ${stats.filesSkipped}`);
console.log(`  Errors: ${stats.errors.length}`);

if (stats.errors.length > 0) {
  console.log('\n❌ Errors:');
  stats.errors.forEach(err => console.log(`  - ${err}`));
}

if (dryRun) {
  console.log('\n💡 Run without --dry-run to apply changes');
}

console.log('\n✅ Done!');
process.exit(stats.errors.length > 0 ? 1 : 0);
