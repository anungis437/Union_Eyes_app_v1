#!/usr/bin/env node
/**
 * Schema Comparison Utility
 * 
 * Compares two Drizzle schema directories to detect drift between environments.
 * Used by CI/CD to validate that production schema matches expected schema.
 * 
 * Usage:
 *   node scripts/compare-schemas.js <expected-dir> <actual-dir>
 *   node scripts/compare-schemas.js db/schema prod-schema --json
 * 
 * Exit Codes:
 *   0 - Schemas match
 *   1 - Critical differences found
 *   2 - Minor differences found (warnings)
 * 
 * @priority P0 - Required for CI/CD validation
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively get all .ts files from a directory
 */
function getSchemaFiles(dir) {
  const files = [];
  
  function traverse(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }
    
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Extract table definitions from TypeScript schema file
 * This is a simplified parser - for production, consider using TypeScript compiler API
 */
function extractTables(content) {
  const tables = new Set();
  
  // Match pgTable definitions
  const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\(/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    tables.add(match[1]);
  }
  
  return tables;
}

/**
 * Extract columns from a table definition
 */
function extractColumns(content, tableName) {
  const columns = new Map();
  
  // Very simplified - matches basic column definitions
  // For production, use proper TypeScript AST parsing
  const columnRegex = /(\w+):\s*(\w+)\(.*?\)/g;
  let match;
  
  while ((match = columnRegex.exec(content)) !== null) {
    columns.set(match[1], match[2]);
  }
  
  return columns;
}

/**
 * Compare two schema directories
 */
function compareSchemas(expectedDir, actualDir) {
  const issues = [];
  
  // Get all schema files
  const expectedFiles = getSchemaFiles(expectedDir);
  const actualFiles = getSchemaFiles(actualDir);
  
  const expectedFileNames = new Set(expectedFiles.map(f => path.basename(f)));
  const actualFileNames = new Set(actualFiles.map(f => path.basename(f)));
  
  // Check for missing files
  for (const fileName of expectedFileNames) {
    if (!actualFileNames.has(fileName)) {
      issues.push({
        severity: 'warning',
        type: 'missing_file',
        message: `Schema file missing in actual: ${fileName}`
      });
    }
  }
  
  // Check for extra files
  for (const fileName of actualFileNames) {
    if (!expectedFileNames.has(fileName) && fileName !== 'index.ts') {
      issues.push({
        severity: 'warning',
        type: 'extra_file',
        message: `Unexpected schema file in actual: ${fileName}`
      });
    }
  }
  
  // Compare common files
  const commonFiles = [...expectedFileNames].filter(f => actualFileNames.has(f));
  
  for (const fileName of commonFiles) {
    const expectedPath = expectedFiles.find(f => path.basename(f) === fileName);
    const actualPath = actualFiles.find(f => path.basename(f) === fileName);
    
    if (!expectedPath || !actualPath) continue;
    
    const expectedContent = fs.readFileSync(expectedPath, 'utf8');
    const actualContent = fs.readFileSync(actualPath, 'utf8');
    
    // Extract and compare tables
    const expectedTables = extractTables(expectedContent);
    const actualTables = extractTables(actualContent);
    
    // Check for missing tables
    for (const table of expectedTables) {
      if (!actualTables.has(table)) {
        issues.push({
          severity: 'critical',
          type: 'missing_table',
          message: `Table missing in actual schema: ${table} (file: ${fileName})`,
          file: fileName,
          table: table
        });
      }
    }
    
    // Check for extra tables
    for (const table of actualTables) {
      if (!expectedTables.has(table)) {
        issues.push({
          severity: 'warning',
          type: 'extra_table',
          message: `Unexpected table in actual schema: ${table} (file: ${fileName})`,
          file: fileName,
          table: table
        });
      }
    }
  }
  
  return issues;
}

/**
 * Compare Drizzle snapshot files (meta/_snapshot.json)
 */
function compareSnapshots(expectedDir, actualDir) {
  const issues = [];
  
  const expectedSnapshotPath = path.join(expectedDir, 'meta', '0000_snapshot.json');
  const actualSnapshotPath = path.join(actualDir, 'meta', '0000_snapshot.json');
  
  if (!fs.existsSync(expectedSnapshotPath)) {
    issues.push({
      severity: 'info',
      type: 'missing_snapshot',
      message: 'Expected snapshot file not found (this is normal for source schema)'
    });
    return issues;
  }
  
  if (!fs.existsSync(actualSnapshotPath)) {
    issues.push({
      severity: 'critical',
      type: 'missing_snapshot',
      message: 'Actual snapshot file not found - run drizzle-kit introspect'
    });
    return issues;
  }
  
  try {
    const expectedSnapshot = JSON.parse(fs.readFileSync(expectedSnapshotPath, 'utf8'));
    const actualSnapshot = JSON.parse(fs.readFileSync(actualSnapshotPath, 'utf8'));
    
    // Compare table counts
    const expectedTableCount = Object.keys(expectedSnapshot.tables || {}).length;
    const actualTableCount = Object.keys(actualSnapshot.tables || {}).length;
    
    if (expectedTableCount !== actualTableCount) {
      issues.push({
        severity: 'warning',
        type: 'table_count_mismatch',
        message: `Table count mismatch: expected ${expectedTableCount}, actual ${actualTableCount}`,
        expected: expectedTableCount,
        actual: actualTableCount
      });
    }
    
    // Compare table names
    const expectedTables = new Set(Object.keys(expectedSnapshot.tables || {}));
    const actualTables = new Set(Object.keys(actualSnapshot.tables || {}));
    
    for (const table of expectedTables) {
      if (!actualTables.has(table)) {
        issues.push({
          severity: 'critical',
          type: 'missing_table',
          message: `Table missing in actual database: ${table}`,
          table: table
        });
      }
    }
    
    for (const table of actualTables) {
      if (!expectedTables.has(table) && !table.startsWith('drizzle_') && !table.startsWith('_')) {
        issues.push({
          severity: 'warning',
          type: 'extra_table',
          message: `Unexpected table in actual database: ${table}`,
          table: table
        });
      }
    }
    
  } catch (error) {
    issues.push({
      severity: 'critical',
      type: 'snapshot_parse_error',
      message: `Error parsing snapshot files: ${error.message}`
    });
  }
  
  return issues;
}

/**
 * Format and display comparison results
 */
function displayResults(schemaIssues, snapshotIssues, jsonOutput = false) {
  const allIssues = [...schemaIssues, ...snapshotIssues];
  
  const criticalIssues = allIssues.filter(i => i.severity === 'critical');
  const warningIssues = allIssues.filter(i => i.severity === 'warning');
  const infoIssues = allIssues.filter(i => i.severity === 'info');
  
  const result = {
    timestamp: new Date().toISOString(),
    status: criticalIssues.length > 0 ? 'failed' : 
            warningIssues.length > 0 ? 'warnings' : 'passed',
    summary: {
      total: allIssues.length,
      critical: criticalIssues.length,
      warning: warningIssues.length,
      info: infoIssues.length
    },
    issues: allIssues
  };
  
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🔍 SCHEMA COMPARISON REPORT');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${result.timestamp}`);
  console.log(`Status: ${result.status.toUpperCase()}`);
  console.log('');
  
  console.log('📊 Summary:');
  console.log(`  Total Issues: ${result.summary.total}`);
  console.log(`  ├─ Critical: ${result.summary.critical}`);
  console.log(`  ├─ Warning:  ${result.summary.warning}`);
  console.log(`  └─ Info:     ${result.summary.info}`);
  console.log('');
  
  if (allIssues.length > 0) {
    if (criticalIssues.length > 0) {
      console.log('🚨 CRITICAL ISSUES:');
      criticalIssues.forEach(issue => {
        console.log(`  • ${issue.message}`);
      });
      console.log('');
    }
    
    if (warningIssues.length > 0) {
      console.log('⚠️  WARNINGS:');
      warningIssues.forEach(issue => {
        console.log(`  • ${issue.message}`);
      });
      console.log('');
    }
    
    if (infoIssues.length > 0) {
      console.log('ℹ️  INFO:');
      infoIssues.forEach(issue => {
        console.log(`  • ${issue.message}`);
      });
      console.log('');
    }
  } else {
    console.log('✅ Schemas match perfectly!');
    console.log('');
  }
  
  console.log('='.repeat(70));
  console.log('');
  
  return result;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node compare-schemas.js <expected-dir> <actual-dir> [--json]');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/compare-schemas.js db/schema prod-schema');
    console.error('  node scripts/compare-schemas.js db/schema prod-schema --json');
    process.exit(1);
  }
  
  const expectedDir = path.resolve(args[0]);
  const actualDir = path.resolve(args[1]);
  const jsonOutput = args.includes('--json');
  
  console.log(`Comparing schemas:`);
  console.log(`  Expected: ${expectedDir}`);
  console.log(`  Actual:   ${actualDir}`);
  console.log('');
  
  // Check directories exist
  if (!fs.existsSync(expectedDir)) {
    console.error(`❌ Expected directory not found: ${expectedDir}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(actualDir)) {
    console.error(`❌ Actual directory not found: ${actualDir}`);
    process.exit(1);
  }
  
  // Compare schemas
  const schemaIssues = compareSchemas(expectedDir, actualDir);
  const snapshotIssues = compareSnapshots(expectedDir, actualDir);
  
  // Display results
  const result = displayResults(schemaIssues, snapshotIssues, jsonOutput);
  
  // Exit with appropriate code
  if (result.summary.critical > 0) {
    process.exit(1); // Critical issues
  } else if (result.summary.warning > 0) {
    process.exit(2); // Warnings only
  } else {
    process.exit(0); // All good
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { compareSchemas, compareSnapshots };
