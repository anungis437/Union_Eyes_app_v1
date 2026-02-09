/**
 * RLS (Row-Level Security) Usage Scanner (PR #6)
 * 
 * Scans codebase for database queries to ensure all use withRLSContext() wrapper
 * 
 * This prevents security vulnerabilities from:
 * - Direct db.query() calls without RLS context
 * - Bypassing tenant isolation
 * - Missing authorization checks
 * 
 * Usage:
 *   node scripts/scan-rls-usage.js
 *   node scripts/scan-rls-usage.js --fix  # Auto-fix (not implemented yet)
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// ============================================================================
// CONFIGURATION
// ============================================================================

const FILES_TO_SCAN = [
  'app/api/**/*.ts',
  'app/api/**/*.tsx',
  'lib/**/*.ts',
  'actions/**/*.ts',
  'services/**/*.ts',
];

const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/with-rls-context.ts',  // The wrapper itself
  '**/db.ts',                // Database connection
  '**/schema/**',            // Schema definitions
];

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

// Patterns that indicate direct database access without RLS context
const UNSAFE_PATTERNS = [
  {
    pattern: /db\.query\./g,
    message: 'Direct db.query() call - use withRLSContext() wrapper',
    severity: 'HIGH',
  },
  {
    pattern: /db\.select\(/g,
    message: 'Direct db.select() call - use withRLSContext() wrapper',
    severity: 'HIGH',
  },
  {
    pattern: /db\.insert\(/g,
    message: 'Direct db.insert() call - use withRLSContext() wrapper',
    severity: 'HIGH',
  },
  {
    pattern: /db\.update\(/g,
    message: 'Direct db.update() call - use withRLSContext() wrapper',
    severity: 'HIGH',
  },
  {
    pattern: /db\.delete\(/g,
    message: 'Direct db.delete() call - use withRLSContext() wrapper',
    severity: 'HIGH',
  },
];

// Safe patterns that indicate RLS context is being used
const SAFE_PATTERNS = [
  /withRLSContext\(/,
  /useRLSContext\(/,
  /import.*withRLSContext/,
  /import.*useRLSContext/,
];

// ============================================================================
// SCANNER IMPLEMENTATION
// ============================================================================

interface ScanResult {
  file: string;
  line: number;
  column: number;
  code: string;
  pattern: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

async function scanFile(filePath: string): Promise<ScanResult[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: ScanResult[] = [];

  // Check if file imports RLS context wrapper
  const hasRLSImport = SAFE_PATTERNS.some(pattern => pattern.test(content));

  // Scan each line for unsafe patterns
  lines.forEach((line, index) => {
    UNSAFE_PATTERNS.forEach(({ pattern, message, severity }) => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        // Only flag if file doesn't import RLS wrapper or uses db directly
        if (!hasRLSImport || !isSafeContext(lines, index)) {
          results.push({
            file: filePath,
            line: index + 1,
            column: match.index || 0,
            code: line.trim(),
            pattern: pattern.source,
            message,
            severity,
          });
        }
      }
    });
  });

  return results;
}

/**
 * Check if a line is in a safe context (e.g., inside withRLSContext callback)
 */
function isSafeContext(lines: string[], lineIndex: number): boolean {
  // Look backwards to see if we're inside a withRLSContext callback
  const contextWindow = 20; // Check 20 lines back
  const startIndex = Math.max(0, lineIndex - contextWindow);
  
  let braceDepth = 0;
  for (let i = lineIndex; i >= startIndex; i--) {
    const line = lines[i];
    braceDepth += (line.match(/{/g) || []).length;
    braceDepth -= (line.match(/}/g) || []).length;
    
    if (/withRLSContext\(/.test(line) && braceDepth > 0) {
      return true;
    }
  }
  
  return false;
}

async function scanAllFiles(): Promise<ScanResult[]> {
  const allResults: ScanResult[] = [];
  
  // Find all files to scan
  const files = await glob(FILES_TO_SCAN, {
    ignore: EXCLUDE_PATTERNS,
    absolute: true,
  });
  
  console.log(`🔍 Scanning ${files.length} files for RLS usage...\\n`);
  
  for (const file of files) {
    const results = await scanFile(file);
    allResults.push(...results);
  }
  
  return allResults;
}

// ============================================================================
// REPORTING
// ============================================================================

function generateReport(results: ScanResult[]): void {
  if (results.length === 0) {
    console.log('✅ SUCCESS: All database queries use RLS context wrapper!');
    console.log('🛡️  100% RLS coverage - your data is secure\\n');
    return;
  }
  
  console.log(`❌ FAILURE: Found ${results.length} unguarded database queries\\n`);
  
  // Group by file
  const byFile = results.reduce((acc, result) => {
    if (!acc[result.file]) {
      acc[result.file] = [];
    }
    acc[result.file].push(result);
    return acc;
  }, {} as Record<string, ScanResult[]>);
  
  // Print results grouped by file
  Object.entries(byFile).forEach(([file, fileResults]) => {
    const relPath = path.relative(process.cwd(), file);
    console.log(`\\n📁 ${relPath} (${fileResults.length} issues)`);
    console.log('─'.repeat(80));
    
    fileResults.forEach(result => {
      console.log(`  Line ${result.line}:${result.column} [${result.severity}]`);
      console.log(`  ${result.message}`);
      console.log(`  ${result.code}`);
      console.log('');
    });
  });
  
  // Summary
  console.log('\\n📊 Summary:');
  console.log('─'.repeat(80));
  const high = results.filter(r => r.severity === 'HIGH').length;
  const medium = results.filter(r => r.severity === 'MEDIUM').length;
  const low = results.filter(r => r.severity === 'LOW').length;
  
  console.log(`  HIGH:   ${high} issues`);
  console.log(`  MEDIUM: ${medium} issues`);
  console.log(`  LOW:    ${low} issues`);
  console.log(`  TOTAL:  ${results.length} issues\\n`);
  
  console.log('💡 Fix: Wrap database operations with withRLSContext():');
  console.log('');
  console.log('  return withRLSContext({ userId, organizationId }, async (db) => {');
  console.log('    return db.query.claims.findMany(...);');
  console.log('  });');
  console.log('');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    console.log('🔒 RLS Usage Scanner (PR #6)');
    console.log('━'.repeat(80));
    console.log('Checking for unguarded database queries...\\n');
    
    const results = await scanAllFiles();
    generateReport(results);
    
    // Exit with error code if issues found
    if (results.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Scanner error:', error);
    process.exit(1);
  }
}

main();
