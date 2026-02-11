#!/usr/bin/env node

/**
 * Automated RLS Context Addition Script
 * 
 * Intelligently wraps database queries with withRLSContext() for tenant isolation
 * 
 * Strategy:
 * 1. Scan routes for database query operations
 * 2. Identify queries that need RLS protection
 * 3. Wrap query blocks with withRLSContext()
 * 4. Ensure proper imports and error handling
 * 5. Report on changes made
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RLSCandidate {
  filePath: string;
  queryCount: number;
  hasRLS: boolean;
  hasSensitiveData: boolean;
  priority: number;
  queries: string[];
}

interface RLSResult {
  filePath: string;
  success: boolean;
  error?: string;
  queriesWrapped?: number;
}

/**
 * Find all route files
 */
function findRouteFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findRouteFiles(fullPath, files);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Analyze route file to determine if it needs RLS
 */
function analyzeRoute(filePath: string): RLSCandidate | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already has RLS
  const hasRLS = /withRLSContext|setRLSContext/.test(content);
  
  // Find database queries
  const queries = extractDatabaseQueries(content);
  if (queries.length === 0) return null;
  
  // Check for sensitive data access
  const hasSensitiveData = checkSensitiveData(content);
  
  // Calculate priority
  const priority = calculateRLSPriority(filePath, queries, hasSensitiveData, content);
  
  return {
    filePath,
    queryCount: queries.length,
    hasRLS,
    hasSensitiveData,
    priority,
    queries,
  };
}

/**
 * Extract database query operations from content
 */
function extractDatabaseQueries(content: string): string[] {
  const queries: string[] = [];
  
  // Pattern 1: db.select/insert/update/delete
  const dbOperations = /db\.(select|insert|update|delete|execute|query\.\w+\.find)/g;
  let match;
  while ((match = dbOperations.exec(content)) !== null) {
    queries.push(match[0]);
  }
  
  // Pattern 2: Direct table operations
  const tableOps = /from\([a-zA-Z_]+\)|\.from\([a-zA-Z_]+\)/g;
  while ((match = tableOps.exec(content)) !== null) {
    queries.push(match[0]);
  }
  
  return [...new Set(queries)];
}

/**
 * Check if route accesses sensitive data
 */
function checkSensitiveData(content: string): boolean {
  const sensitiveTables = [
    'members',
    'organizationMembers',
    'claims',
    'documents',
    'billing',
    'duesTransactions',
    'financialRecords',
    'personalData',
    'gdprRequests',
  ];
  
  return sensitiveTables.some(table => 
    new RegExp(`from\\(${table}\\)|${table}\\)|organizationId|tenantId`, 'i').test(content)
  );
}

/**
 * Calculate priority for RLS implementation
 */
function calculateRLSPriority(
  filePath: string,
  queries: string[],
  hasSensitiveData: boolean,
  content: string
): number {
  let priority = 40;
  
  // High priority domains
  if (filePath.includes('/members/')) priority += 25;
  if (filePath.includes('/claims/')) priority += 25;
  if (filePath.includes('/documents/')) priority += 20;
  if (filePath.includes('/billing/') || filePath.includes('/financial/')) priority += 25;
  if (filePath.includes('/gdpr/') || filePath.includes('/privacy/')) priority += 30;
  
  // Sensitive data bonus
  if (hasSensitiveData) priority += 20;
  
  // Multiple queries
  if (queries.length > 3) priority += 10;
  
  // Has tenant/org filtering
  if (/tenantId|organizationId/.test(content)) priority += 15;
  
  // Write operations
  if (/db\.(insert|update|delete)/.test(content)) priority += 10;
  
  return Math.min(priority, 100);
}

/**
 * Add RLS context to a route file
 */
function addRLSContext(candidate: RLSCandidate): RLSResult {
  try {
    let content = fs.readFileSync(candidate.filePath, 'utf-8');
    
    // Skip if already has RLS
    if (candidate.hasRLS) {
      return {
        filePath: candidate.filePath,
        success: false,
        error: 'Already has RLS context',
      };
    }
    
    let modified = false;
    
    // Step 1: Add withRLSContext import if not exists
    if (!/withRLSContext/.test(content)) {
      const importMatch = content.match(/from ['"]@\/lib\/db\/with-rls-context['"]/);
      if (!importMatch) {
        // Find first import line
        const firstImportMatch = content.match(/^import\s+/m);
        if (firstImportMatch) {
          const insertPos = firstImportMatch.index!;
          content = content.slice(0, insertPos) +
            `import { withRLSContext } from '@/lib/db/with-rls-context';\n` +
            content.slice(insertPos);
          modified = true;
        }
      }
    }
    
    // Step 2: Find handler functions and wrap DB operations
    // Look for patterns like: const result = await db.select()
    const queryPattern = /(const\s+\w+\s*=\s*await\s+db\.(select|insert|update|delete|execute|query)[\s\S]*?;)/g;
    
    let wrappedQueries = 0;
    content = content.replace(queryPattern, (match) => {
      // Don't wrap if already inside withRLSContext
      const beforeMatch = content.substring(0, content.indexOf(match));
      const recentContext = beforeMatch.slice(-500);
      
      if (/withRLSContext\(async\s+\(\w*\)\s+=>\s+\{/.test(recentContext)) {
        return match; // Already wrapped
      }
      
      wrappedQueries++;
      modified = true;
      
      // Extract the query variable and operation
      const varMatch = match.match(/const\s+(\w+)/);
      const varName = varMatch ? varMatch[1] : 'result';
      
      return `const ${varName} = await withRLSContext(async (tx) => {
      return await tx.${match.match(/db\.(\w+)/)?.[1]}${match.substring(match.indexOf('('))}
    });`;
    });
    
    // Step 3: Handle db.query patterns
    const queryMethodPattern = /(await\s+db\.query\.\w+\.find[^;]+;)/g;
    content = content.replace(queryMethodPattern, (match) => {
      const beforeMatch = content.substring(0, content.indexOf(match));
      const recentContext = beforeMatch.slice(-500);
      
      if (/withRLSContext/.test(recentContext)) {
        return match;
      }
      
      wrappedQueries++;
      modified = true;
      
      return `await withRLSContext(async (tx) => {
      return ${match}
    })`;
    });
    
    if (modified && wrappedQueries > 0) {
      fs.writeFileSync(candidate.filePath, content, 'utf-8');
      return {
        filePath: candidate.filePath,
        success: true,
        queriesWrapped: wrappedQueries,
      };
    }
    
    return {
      filePath: candidate.filePath,
      success: false,
      error: 'No queries could be wrapped',
    };
    
  } catch (error) {
    return {
      filePath: candidate.filePath,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Scanning API routes for RLS opportunities...\n');
  
  const apiDir = path.join(__dirname, '..', 'app', 'api');
  const routeFiles = findRouteFiles(apiDir);
  
  console.log(`Found ${routeFiles.length} route files\n`);
  
  // Analyze all routes
  const candidates: RLSCandidate[] = [];
  for (const file of routeFiles) {
    const candidate = analyzeRoute(file);
    if (candidate && !candidate.hasRLS) {
      candidates.push(candidate);
    }
  }
  
  // Sort by priority
  candidates.sort((a, b) => b.priority - a.priority);
  
  console.log(`\n📊 Found ${candidates.length} routes needing RLS context\n`);
  
  if (candidates.length === 0) {
    console.log('✅ All routes with DB queries already have RLS context!\n');
    return;
  }
  
  // Show top candidates
  console.log('🎯 Top 20 Priority Routes:\n');
  candidates.slice(0, 20).forEach((c, i) => {
    const relativePath = c.filePath.replace(/.*[\\/]app[\\/]api[\\/]/, '/api/');
    console.log(`${i + 1}. [Priority ${c.priority}] ${relativePath}`);
    console.log(`   Queries: ${c.queryCount}, Sensitive: ${c.hasSensitiveData ? 'Yes' : 'No'}`);
    console.log(`   Operations: ${c.queries.slice(0, 3).join(', ')}\n`);
  });
  
  // Process top 75 candidates
  const toProcess = candidates.slice(0, 75);
  const results: RLSResult[] = [];
  
  console.log(`\n🚀 Processing ${toProcess.length} routes...\n`);
  
  for (let i = 0; i < toProcess.length; i++) {
    const candidate = toProcess[i];
    process.stdout.write(`\r[${i + 1}/${toProcess.length}] Adding RLS context...`);
    
    const result = addRLSContext(candidate);
    results.push(result);
  }
  
  console.log('\n\n✅ Processing complete!\n');
  
  // Report results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`📊 Results:`);
  console.log(`  ✅ Successfully wrapped: ${successful.length}`);
  console.log(`  ❌ Failed/Skipped: ${failed.length}`);
  console.log(`  📝 Total queries protected: ${successful.reduce((sum, r) => sum + (r.queriesWrapped || 0), 0)}\n`);
  
  if (failed.length > 0 && failed.length <= 10) {
    console.log('ℹ️  Skipped routes:');
    failed.forEach(f => {
      const relativePath = f.filePath.replace(/.*[\\/]app[\\/]api[\\/]/, '/api/');
      console.log(`  - ${relativePath}: ${f.error}`);
    });
    console.log();
  }
  
  console.log('🎯 Next: Run security audit to see updated RLS coverage');
  console.log('   pnpm tsx scripts/route-security-audit.ts\n');
}

main().catch(console.error);
