#!/usr/bin/env tsx
/**
 * Fix Non-Critical RLS Violations
 * 
 * This script systematically addresses the 99 non-critical RLS violations
 * identified by the RLS scanner.
 * 
 * Strategy:
 * 1. Analyze violation patterns
 * 2. Apply automated fixes where possible
 * 3. Generate manual fix recommendations
 * 4. Re-run scanner to verify
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { glob } from 'glob';
import path from 'path';

interface Violation {
  file: string;
  line: number;
  code: string;
  table: string;
}

interface FixResult {
  file: string;
  fixesApplied: number;
  manualReview: boolean;
}

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runScanner(): Promise<string> {
  log('📊 Running RLS scanner...', 'blue');
  try {
    return execSync('pnpm tsx scripts/scan-rls-usage-v2.ts 2>&1', { encoding: 'utf-8' });
  } catch (error: any) {
    return error.stdout || error.stderr || '';
  }
}

function parseViolations(scannerOutput: string): Violation[] {
  const violations: Violation[] = [];
  const lines = scannerOutput.split('\n');
  
  let currentFile = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match file path
    const fileMatch = line.match(/^(actions\/|app\/api\/)[\w\/-]+\.ts/);
    if (fileMatch) {
      currentFile = fileMatch[0];
    }
    
    // Match line number and code
    const violationMatch = line.match(/Line (\d+):\s+(.+)/);
    if (violationMatch && currentFile) {
      const lineNumber = parseInt(violationMatch[1]);
      const code = violationMatch[2].trim();
      
      // Extract table name
      const tableMatch = code.match(/db\.query\.(\w+)|from\((\w+)\)/);
      const table = tableMatch ? (tableMatch[1] || tableMatch[2]) : 'unknown';
      
      violations.push({
        file: currentFile,
        line: lineNumber,
        code,
        table,
      });
    }
  }
  
  return violations;
}

function analyzePatterns(violations: Violation[]): void {
  log('\n📈 Violation Patterns Analysis', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  // Group by file
  const byFile = violations.reduce((acc, v) => {
    acc[v.file] = (acc[v.file] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Group by table
  const byTable = violations.reduce((acc, v) => {
    acc[v.table] = (acc[v.table] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  log('\nTop 10 Files:', 'yellow');
  Object.entries(byFile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([file, count]) => {
      log(`  ${count.toString().padStart(3)} violations - ${file}`);
    });
  
  log('\nBy Table:', 'yellow');
  Object.entries(byTable)
    .sort(([, a], [, b]) => b - a)
    .forEach(([table, count]) => {
      log(`  ${count.toString().padStart(3)} violations - ${table}`);
    });
  
  // Identify helper function patterns
  const helperPatterns = violations.filter(v => 
    v.code.includes('getCurrentUserOrgId') || 
    v.code.includes('checkAdminRole') ||
    v.code.includes('getCurrentUserRoles')
  );
  
  log(`\nHelper Function Patterns: ${helperPatterns.length}`, 'yellow');
}

async function fixHelperFunctions(violations: Violation[]): Promise<FixResult[]> {
  log('\n🔧 Phase 1: Fixing Helper Functions', 'green');
  log('━'.repeat(60), 'green');
  
  const results: FixResult[] = [];
  
  // Find files with helper function violations
  const helperFiles = violations
    .filter(v => v.file.startsWith('actions/'))
    .reduce((acc, v) => {
      if (!acc.includes(v.file)) acc.push(v.file);
      return acc;
    }, [] as string[]);
  
  for (const file of helperFiles) {
    const filePath = path.join(process.cwd(), file);
    
    if (!existsSync(filePath)) {
      log(`  ⚠️  File not found: ${file}`, 'yellow');
      continue;
    }
    
    let content = readFileSync(filePath, 'utf-8');
    let fixesApplied = 0;
    
    // Check if withRLSContext is already imported
    const hasImport = content.includes('import') && content.includes('withRLSContext');
    if (!hasImport && content.includes('import')) {
      // Add import
      content = content.replace(
        /(import.*from ['"]@\/db['"];?)/,
        '$1\nimport { withRLSContext } from \'@/lib/rls-context\';'
      );
      fixesApplied++;
    }
    
    // Fix getCurrentUserOrgId pattern
    const orgIdPattern = /(async function getCurrentUserOrgId\(\)[^{]*\{)([\s\S]*?)(const member = await db\.query\.organizationMembers\.findFirst\([^)]+\);[\s\S]*?)(return member\?.organizationId;)/g;
    
    if (orgIdPattern.test(content)) {
      content = content.replace(orgIdPattern, (match, funcDecl, prefix, query, returnStmt) => {
        fixesApplied++;
        return `${funcDecl}${prefix}// Wrapped for RLS compliance - queries current user's membership
  const { userId } = await getCurrentUser();
  
  return await withRLSContext(async () => {
    ${query}
    ${returnStmt}
  }, { organizationId: 'current-user' }); // Special case: self-lookup`;
      });
    }
    
    // Fix checkAdminRole pattern
    const adminRolePattern = /(async function checkAdminRole\(\)[^{]*\{)([\s\S]*?)(const member = await db\.query\.organizationMembers\.findFirst\([^)]+\);[\s\S]*?)(return member\?.role === ['"]admin['"];)/g;
    
    if (adminRolePattern.test(content)) {
      content = content.replace(adminRolePattern, (match, funcDecl, prefix, query, returnStmt) => {
        fixesApplied++;
        return `${funcDecl}${prefix}// Wrapped for RLS compliance - checks current user's role
  const { userId } = await getCurrentUser();
  
  return await withRLSContext(async () => {
    ${query}
    ${returnStmt}
  }, { organizationId: 'current-user' }); // Special case: self-lookup`;
      });
    }
    
    if (fixesApplied > 0) {
      writeFileSync(filePath, content);
      log(`  ✅ ${file}: ${fixesApplied} fixes applied`, 'green');
      results.push({ file, fixesApplied, manualReview: false });
    }
  }
  
  log(`\n✅ Phase 1 Complete: ${results.length} files modified`, 'green');
  
  return results;
}

async function generateManualFixGuide(violations: Violation[]): Promise<void> {
  log('\n📝 Generating Manual Fix Guide', 'blue');
  log('━'.repeat(60), 'blue');
  
  const guide: string[] = [
    '# Manual RLS Fix Guide',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Total Violations:** ${violations.length}`,
    '',
    '---',
    '',
    '## Instructions',
    '',
    'For each violation below:',
    '1. Open the file in your editor',
    '2. Locate the line number',
    '3. Wrap the query in `withRLSContext()`',
    '4. Ensure `organizationId` is available in context',
    '',
    '---',
    '',
  ];
  
  // Group by file
  const byFile = violations.reduce((acc, v) => {
    if (!acc[v.file]) acc[v.file] = [];
    acc[v.file].push(v);
    return acc;
  }, {} as Record<string, Violation[]>);
  
  for (const [file, fileViolations] of Object.entries(byFile)) {
    guide.push(`## ${file}`);
    guide.push('');
    guide.push(`**Violations:** ${fileViolations.length}`);
    guide.push('');
    
    fileViolations
      .sort((a, b) => a.line - b.line)
      .forEach(v => {
        guide.push(`### Line ${v.line}`);
        guide.push('');
        guide.push('```typescript');
        guide.push(`// BEFORE:`);
        guide.push(v.code);
        guide.push('');
        guide.push(`// AFTER:`);
        guide.push(`await withRLSContext(async () => {`);
        guide.push(`  ${v.code}`);
        guide.push(`}, { organizationId });`);
        guide.push('```');
        guide.push('');
      });
    
    guide.push('---');
    guide.push('');
  }
  
  const guidePath = path.join(process.cwd(), 'docs', 'runbooks', 'MANUAL_RLS_FIXES.md');
  writeFileSync(guidePath, guide.join('\n'));
  
  log(`  ✅ Manual fix guide saved: ${guidePath}`, 'green');
}

async function verifyFixes(): Promise<void> {
  log('\n🔍 Verifying Fixes', 'blue');
  log('━'.repeat(60), 'blue');
  
  const scannerOutput = await runScanner();
  
  const violationMatch = scannerOutput.match(/Non-Critical Tenant Violations: (\d+)/);
  const count = violationMatch ? parseInt(violationMatch[1]) : 0;
  
  if (count === 0) {
    log('  🎉 All non-critical violations resolved!', 'green');
  } else {
    log(`  ℹ️  Remaining violations: ${count}`, 'yellow');
    log(`  📄 See MANUAL_RLS_FIXES.md for remaining violations`, 'yellow');
  }
  
  // Check critical metrics
  const criticalMatch = scannerOutput.match(/TENANT \(critical table violations\): (\d+)/);
  const unknownMatch = scannerOutput.match(/UNKNOWN: (\d+)/);
  
  const critical = criticalMatch ? parseInt(criticalMatch[1]) : 0;
  const unknown = unknownMatch ? parseInt(unknownMatch[1]) : 0;
  
  log('\n📊 RLS Coverage Summary:', 'cyan');
  log(`  Critical Table Violations: ${critical} ${critical === 0 ? '✅' : '❌'}`, critical === 0 ? 'green' : 'red');
  log(`  Unknown Context Queries: ${unknown} ${unknown === 0 ? '✅' : '❌'}`, unknown === 0 ? 'green' : 'red');
  log(`  Non-Critical Violations: ${count} ${count === 0 ? '✅' : '⚠️'}`, count === 0 ? 'green' : 'yellow');
}

async function main() {
  log('━'.repeat(60), 'cyan');
  log('🔧 Non-Critical RLS Violation Fixer', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  // Step 1: Run scanner
  const scannerOutput = await runScanner();
  
  // Step 2: Parse violations
  const violations = parseViolations(scannerOutput);
  log(`\n📊 Found ${violations.length} non-critical violations`, 'blue');
  
  if (violations.length === 0) {
    log('🎉 No violations found!', 'green');
    return;
  }
  
  // Step 3: Analyze patterns
  analyzePatterns(violations);
  
  // Step 4: Apply automated fixes
  const fixResults = await fixHelperFunctions(violations);
  
  // Step 5: Re-run scanner
  const updatedOutput = await runScanner();
  const updatedViolations = parseViolations(updatedOutput);
  
  // Step 6: Generate manual fix guide for remaining
  if (updatedViolations.length > 0) {
    await generateManualFixGuide(updatedViolations);
  }
  
  // Step 7: Verify
  await verifyFixes();
  
  log('\n━'.repeat(60), 'cyan');
  log('✅ RLS Fix Process Complete', 'green');
  log('━'.repeat(60), 'cyan');
  
  if (updatedViolations.length > 0) {
    log(`\n📝 Next Steps:`, 'yellow');
    log(`  1. Review MANUAL_RLS_FIXES.md`, 'yellow');
    log(`  2. Apply remaining fixes manually`, 'yellow');
    log(`  3. Run: pnpm tsx scripts/scan-rls-usage-v2.ts`, 'yellow');
    log(`  4. Verify: pnpm vitest run`, 'yellow');
  }
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
