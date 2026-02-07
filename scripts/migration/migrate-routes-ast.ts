#!/usr/bin/env tsx
/**
 * Route Migration Script v2 - AST-based
 * Uses ts-morph for reliable TypeScript AST transformations
 * 
 * Usage:
 *   tsx scripts/migration/migrate-routes-ast.ts [path] [--dry-run] [--scan]
 */

import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { Project, SyntaxKind, Node, SourceFile } from 'ts-morph';

interface MigrationStats {
  filesProcessed: number;
  filesModified: number;
  filesSkipped: number;
  errors: string[];
  warnings: string[];
}

const stats: MigrationStats = {
  filesProcessed: 0,
  filesModified: 0,
  filesSkipped: 0,
  errors: [],
  warnings: [],
};

// Initialize ts-morph project
const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
});

function needsMigration(sourceFile: SourceFile): boolean {
  const content = sourceFile.getFullText();
  
  // Check for Clerk auth imports
  if (!content.includes('@clerk/nextjs/server')) {
    return false;
  }
  
  // Check for await auth() calls
  if (!content.includes('await auth()')) {
    return false;
  }
  
  return true;
}

function migrateSourceFile(sourceFile: SourceFile, filePath: string): boolean {
  let hasChanges = false;

  try {
    // Step 1: Update imports
    const clerkImport = sourceFile.getImportDeclaration('@clerk/nextjs/server');
    
    if (clerkImport) {
      const namedImports = clerkImport.getNamedImports();
      const authImport = namedImports.find(ni => ni.getName() === 'auth');
      const hasCurrentUser = namedImports.some(ni => ni.getName() === 'currentUser');
      
      if (authImport) {
        // Remove auth import
        if (namedImports.length === 1 && !hasCurrentUser) {
          // Remove entire import if only auth
          clerkImport.remove();
        } else if (namedImports.length > 1) {
          // Remove just auth, keep others
          authImport.remove();
        }
        
        // Add security middleware imports
        const existingSecurityImport = sourceFile.getImportDeclaration('@/lib/middleware/api-security');
        
        if (!existingSecurityImport) {
          // Determine what to import
          const imports = ['withAuth'];
          const hasBodyValidation = sourceFile.getFullText().includes('await request.json()');
          if (hasBodyValidation) imports.push('withValidatedBody');
          imports.push('logApiAuditEvent');
          
          // Add new import at top
          sourceFile.insertImportDeclaration(0, {
            moduleSpecifier: '@/lib/middleware/api-security',
            namedImports: imports,
          });
        }
        
        hasChanges = true;
      }
    }

    // Step 2: Add Zod import if needed
    const hasBodyValidation = sourceFile.getFullText().includes('await request.json()');
    const hasZodImport = sourceFile.getImportDeclaration('zod');
    
    if (hasBodyValidation && !hasZodImport) {
      sourceFile.addImportDeclaration({
        moduleSpecifier: 'zod',
        namedImports: ['z'],
      });
      hasChanges = true;
    }

    // Step 3: Transform route handler functions
    const functions = sourceFile.getFunctions();
    
    functions.forEach(func => {
      const funcName = func.getName();
      if (!funcName || !['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(funcName)) {
        return;
      }
      
      const isExported = func.isExported();
      if (!isExported) return;
      
      const body = func.getBody();
      if (!body || !Node.isBlock(body)) return;
      
      // Check if function uses await auth()
      const bodyText = body.getText();
      if (!bodyText.includes('await auth()')) return;
      
      try {
        const transformed = transformRouteHandler(func, funcName, filePath);
        if (transformed) {
          hasChanges = true;
        }
      } catch (err) {
        stats.warnings.push(`⚠️  ${funcName} in ${path.relative(process.cwd(), filePath)}: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    return hasChanges;
  } catch (error) {
    stats.errors.push(`Error processing ${path.relative(process.cwd(), filePath)}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function transformRouteHandler(func: any, method: string, filePath: string): boolean {
  const params = func.getParameters();
  const body = func.getBody();
  
  if (!body || !Node.isBlock(body)) return false;
  
  const isDynamicRoute = params.length > 1; // has params argument
  const bodyText = body.getText();
  
  // Extract auth check and remove it
  let cleanedBody = bodyText;
  
  // Remove various auth patterns
  cleanedBody = cleanedBody
    .replace(/const\s*\{\s*userId\s*\}\s*=\s*await\s+auth\(\);?\n?\s*/g, '')
    .replace(/const\s+authResult\s*=\s*await\s+auth\(\);?\n?\s*userId\s*=\s*authResult\.userId;?\n?\s*/g, '')
    .replace(/if\s*\(\s*!userId\s*\)\s*\{[^}]*return\s+NextResponse\.json\([^)]*\);?\s*\}\n?\s*/g, '');
  
  // Replace userId with user.id
  cleanedBody = cleanedBody.replace(/\buserId\b/g, 'user.id');
  
  // Build new function
  const paramsText = params.map(p => p.getText()).join(', ');
  
  let newFunctionText: string;
  
  if (isDynamicRoute) {
    newFunctionText = `export const ${method} = async (${paramsText}) => {
  return withAuth(async (req, user) => ${cleanedBody}
  })(request, { params });
};`;
  } else {
    newFunctionText = `export const ${method} = async (${paramsText}) => {
  return withAuth(async (req, user) => ${cleanedBody}
  })(request);
};`;
  }
  
  // Replace the entire function
  func.replaceWithText(newFunctionText);
  
  return true;
}

function scanDirectory(dir: string): string[] {
  const pattern = path.join(dir, '**/route.ts').replace(/\\/g, '/');
  const files = globSync(pattern, { 
    ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    absolute: true 
  });
  
  return files.filter(file => {
    try {
      const sourceFile = project.addSourceFileAtPath(file);
      const needs = needsMigration(sourceFile);
      project.removeSourceFile(sourceFile);
      return needs;
    } catch {
      return false;
    }
  });
}

function migrateFile(filePath: string, dryRun: boolean = false): boolean {
  try {
    stats.filesProcessed++;
    
    const sourceFile = project.addSourceFileAtPath(filePath);
    
    if (!needsMigration(sourceFile)) {
      console.log(`  ⏭️  Skipped (already migrated): ${path.relative(process.cwd(), filePath)}`);
      project.removeSourceFile(sourceFile);
      stats.filesSkipped++;
      return false;
    }

    const modified = migrateSourceFile(sourceFile, filePath);
    
    if (!modified) {
      console.log(`  ⏭️  Skipped (no changes): ${path.relative(process.cwd(), filePath)}`);
      project.removeSourceFile(sourceFile);
      stats.filesSkipped++;
      return false;
    }

    if (dryRun) {
      console.log(`  ✓  Would migrate: ${path.relative(process.cwd(), filePath)}`);
      project.removeSourceFile(sourceFile);
      return true;
    }

    // Backup original
    const backupPath = `${filePath}.backup`;
    fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf-8'));

    // Save transformed file
    sourceFile.saveSync();
    
    console.log(`  ✅ Migrated: ${path.relative(process.cwd(), filePath)}`);
    stats.filesModified++;
    
    project.removeSourceFile(sourceFile);
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

console.log('🚀 Route Migration Tool v2 (AST-based)\n');

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
console.log(`  Warnings: ${stats.warnings.length}`);

if (stats.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  stats.warnings.forEach(warn => console.log(`  ${warn}`));
}

if (stats.errors.length > 0) {
  console.log('\n❌ Errors:');
  stats.errors.forEach(err => console.log(`  - ${err}`));
}

if (dryRun) {
  console.log('\n💡 Run without --dry-run to apply changes');
}

console.log('\n✅ Done!');
process.exit(stats.errors.length > 0 ? 1 : 0);
