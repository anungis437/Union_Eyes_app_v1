/**
 * Route Error Response Migration Script
 * 
 * Automatically migrates API routes to use standardized error responses
 * Part of A+ Roadmap implementation
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-route-errors.ts --dry-run
 *   pnpm tsx scripts/migrate-route-errors.ts --routes "app/api/clause-library/route.ts"
 *   pnpm tsx scripts/migrate-route-errors.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface MigrationResult {
  filePath: string;
  patterns: string[];
  changes: number;
  success: boolean;
  error?: string;
  preview?: string;
}

interface ErrorPattern {
  regex: RegExp;
  errorCode: string;
  description: string;
  statusCode: number;
}

// =============================================================================
// ERROR PATTERN MAPPINGS
// =============================================================================

const ERROR_PATTERNS: ErrorPattern[] = [
  // 400 - Validation Errors
  {
    regex: /NextResponse\.json\(\s*\{\s*error:\s*['"](?:Invalid|Missing|Required|Validation).*?['"]\s*\}\s*,\s*\{\s*status:\s*400\s*\}\s*\)/gs,
    errorCode: 'ErrorCode.VALIDATION_ERROR',
    description: 'Validation error (400)',
    statusCode: 400,
  },
  {
    regex: /NextResponse\.json\(\s*\{\s*error:\s*['"].*?(?:required|missing|invalid).*?['"]\s*\}\s*,\s*\{\s*status:\s*400\s*\}\s*\)/gi,
    errorCode: 'ErrorCode.MISSING_REQUIRED_FIELD',
    description: 'Missing required field (400)',
    statusCode: 400,
  },
  
  // 401 - Authentication Errors
  {
    regex: /NextResponse\.json\(\s*\{\s*error:\s*['"](?:Unauthorized|Invalid signature|Auth).*?['"]\s*\}\s*,\s*\{\s*status:\s*401\s*\}\s*\)/gs,
    errorCode: 'ErrorCode.AUTH_REQUIRED',
    description: 'Authentication required (401)',
    statusCode: 401,
  },
  
  // 403 - Forbidden Errors
  {
    regex: /NextResponse\.json\(\s*\{\s*error:\s*['"](?:Forbidden|Access denied|Only.*?can).*?['"]\s*\}\s*,\s*\{\s*status:\s*403\s*\}\s*\)/gs,
    errorCode: 'ErrorCode.FORBIDDEN',
    description: 'Forbidden (403)',
    statusCode: 403,
  },
  
  // 404 - Not Found Errors
  {
    regex: /NextResponse\.json\(\s*\{\s*error:\s*['"].*?not found.*?['"]\s*\}\s*,\s*\{\s*status:\s*404\s*\}\s*\)/gi,
    errorCode: 'ErrorCode.RESOURCE_NOT_FOUND',
    description: 'Resource not found (404)',
    statusCode: 404,
  },
  
  // 409 - Conflict Errors
  {
    regex: /NextResponse\.json\(\s*\{\s*error:\s*['"].*?(?:already exists|duplicate|conflict).*?['"]\s*\}\s*,\s*\{\s*status:\s*409\s*\}\s*\)/gi,
    errorCode: 'ErrorCode.ALREADY_EXISTS',
    description: 'Resource already exists (409)',
    statusCode: 409,
  },
  
  // 429 - Rate Limit Errors
  {
    regex: /NextResponse\.json\(\s*\{\s*error:\s*['"].*?rate limit.*?['"]\s*.*?\}\s*,\s*\{\s*status:\s*429\s*\}\s*\)/gi,
    errorCode: 'ErrorCode.RATE_LIMIT_EXCEEDED',
    description: 'Rate limit exceeded (429)',
    statusCode: 429,
  },
  
  // 500 - Internal Server Errors
  {
    regex: /NextResponse\.json\(\s*\{\s*error:\s*['"].*?(?:Internal|Failed|server error).*?['"]\s*\}\s*,\s*\{\s*status:\s*500\s*\}\s*\)/gi,
    errorCode: 'ErrorCode.INTERNAL_ERROR',
    description: 'Internal server error (500)',
    statusCode: 500,
  },
];

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

/**
 * Check if file already has standardized imports
 */
function hasStandardizedImports(content: string): boolean {
  return content.includes('standardErrorResponse') || 
         content.includes('standardSuccessResponse') ||
         content.includes('@/lib/api/standardized-responses');
}

/**
 * Add standardized response imports to file
 */
function addStandardizedImports(content: string): string {
  // Check if already imported
  if (hasStandardizedImports(content)) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import\s+.*?from\s+['"].*?['"];?\s*$/gm;
  const imports = content.match(importRegex);
  
  if (!imports || imports.length === 0) {
    // Add at the beginning if no imports found
    return `import { \n  standardErrorResponse, \n  standardSuccessResponse, \n  ErrorCode \n} from '@/lib/api/standardized-responses';\n\n${content}`;
  }

  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;

  const newImport = `\nimport { \n  standardErrorResponse, \n  standardSuccessResponse, \n  ErrorCode \n} from '@/lib/api/standardized-responses';`;

  return content.slice(0, insertPosition) + newImport + content.slice(insertPosition);
}

/**
 * Extract error message from NextResponse.json call
 */
function extractErrorMessage(errorCall: string): string {
  const messageMatch = errorCall.match(/error:\s*['"]([^'"]+)['"]/);
  return messageMatch ? messageMatch[1] : 'An error occurred';
}

/**
 * Extract additional error details if present
 */
function extractErrorDetails(errorCall: string): string | null {
  // Check if there are additional fields beyond 'error'
  const detailsMatch = errorCall.match(/\{[^}]*error:[^,}]+,([^}]+)\}/);
  if (detailsMatch) {
    return detailsMatch[1].trim();
  }
  return null;
}

/**
 * Check if error call is in a catch block
 */
function isInCatchBlock(content: string, errorIndex: number): boolean {
  const beforeError = content.substring(0, errorIndex);
  const lastCatch = beforeError.lastIndexOf('catch');
  const lastTry = beforeError.lastIndexOf('try');
  
  // If we find catch after try, and there's no closing brace between catch and error
  if (lastCatch > lastTry && lastCatch !== -1) {
    const betweenCatchAndError = content.substring(lastCatch, errorIndex);
    const openBraces = (betweenCatchAndError.match(/\{/g) || []).length;
    const closeBraces = (betweenCatchAndError.match(/\}/g) || []).length;
    return openBraces > closeBraces;
  }
  return false;
}

/**
 * Migrate error responses in content
 */
function migrateErrorResponses(content: string): { content: string; changes: number; patterns: string[] } {
  let modifiedContent = content;
  let changeCount = 0;
  const patternsFound: string[] = [];

  // Migrate each error pattern
  for (const pattern of ERROR_PATTERNS) {
    const matches = content.match(pattern.regex);
    
    if (matches) {
      patternsFound.push(pattern.description);
      
      for (const match of matches) {
        const errorMessage = extractErrorMessage(match);
        const errorDetails = extractErrorDetails(match);
        const errorIndex = modifiedContent.indexOf(match);
        const inCatchBlock = isInCatchBlock(modifiedContent, errorIndex);
        
        // Build the standardized error response
        let replacement: string;
        
        if (inCatchBlock) {
          replacement = `standardErrorResponse(\n      ${pattern.errorCode},\n      '${errorMessage}',\n      error\n    )`;
        } else if (errorDetails) {
          // Preserve additional error details
          replacement = `standardErrorResponse(\n      ${pattern.errorCode},\n      '${errorMessage}'\n      // TODO: Migrate additional details: ${errorDetails}\n    )`;
        } else {
          replacement = `standardErrorResponse(\n      ${pattern.errorCode},\n      '${errorMessage}'\n    )`;
        }
        
        modifiedContent = modifiedContent.replace(match, replacement);
        changeCount++;
      }
    }
  }

  return { content: modifiedContent, changes: changeCount, patterns: patternsFound };
}

/**
 * Migrate Zod .parse() to .safeParse()
 */
function migrateZodValidation(content: string): { content: string; changes: number } {
  let modifiedContent = content;
  let changeCount = 0;

  // Pattern: const data = schema.parse(body);
  // Replace with: const validation = schema.safeParse(body); if (!validation.success) { return standardErrorResponse(...) }
  const parsePattern = /const\s+(\w+)\s*=\s*(\w+)\.parse\((.*?)\);/g;
  const matches = [...content.matchAll(parsePattern)];

  for (const match of matches) {
    const [fullMatch, varName, schemaName, parseArg] = match;
    
    const replacement = `const validation = ${schemaName}.safeParse(${parseArg});
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    const ${varName} = validation.data;`;
    
    modifiedContent = modifiedContent.replace(fullMatch, replacement);
    changeCount++;
  }

  return { content: modifiedContent, changes: changeCount };
}

/**
 * Migrate success responses
 */
function migrateSuccessResponses(content: string): { content: string; changes: number } {
  let modifiedContent = content;
  let changeCount = 0;

  // Pattern: return NextResponse.json({ ...data }, { status: 201 });
  // Don't migrate if it's already an error response or already standardized
  const successPattern = /return\s+NextResponse\.json\(\s*\{([^}]*)\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\);/g;
  
  const matches = [...content.matchAll(successPattern)];
  
  for (const match of matches) {
    const [fullMatch, dataContent, statusCode] = match;
    
    // Skip if it's an error response or already has error keyword
    if (dataContent.includes('error') || dataContent.includes('standardError')) {
      continue;
    }

    const status = parseInt(statusCode, 10);
    
    // Only migrate 200-level responses
    if (status >= 200 && status < 300) {
      let replacement: string;
      
      if (dataContent.trim().startsWith('success:')) {
        // Has success: true already
        const dataOnly = dataContent.replace(/success:\s*true,?\s*/, '').trim();
        replacement = `return standardSuccessResponse(\n      { ${dataOnly} },\n      undefined,\n      ${status}\n    );`;
      } else {
        replacement = `return standardSuccessResponse(\n      { ${dataContent} },\n      undefined,\n      ${status}\n    );`;
      }
      
      modifiedContent = modifiedContent.replace(fullMatch, replacement);
      changeCount++;
    }
  }

  return { content: modifiedContent, changes: changeCount };
}

/**
 * Migrate a single route file
 */
async function migrateRoute(filePath: string, dryRun: boolean = false): Promise<MigrationResult> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Step 1: Add imports
    let migratedContent = addStandardizedImports(content);
    
    // Step 2: Migrate error responses
    const errorResult = migrateErrorResponses(migratedContent);
    migratedContent = errorResult.content;
    
    // Step 3: Migrate Zod validation
    const zodResult = migrateZodValidation(migratedContent);
    migratedContent = zodResult.content;
    
    // Step 4: Migrate success responses
    const successResult = migrateSuccessResponses(migratedContent);
    migratedContent = successResult.content;
    
    const totalChanges = errorResult.changes + zodResult.changes + successResult.changes;
    
    // Write back if not dry run
    if (!dryRun && totalChanges > 0) {
      fs.writeFileSync(filePath, migratedContent, 'utf-8');
    }

    return {
      filePath,
      patterns: errorResult.patterns,
      changes: totalChanges,
      success: true,
      preview: dryRun ? migratedContent : undefined,
    };
  } catch (error) {
    return {
      filePath,
      patterns: [],
      changes: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find all routes that need migration
 */
async function findRoutesToMigrate(): Promise<string[]> {
  const allRoutes = await glob('app/api/**/route.ts', { 
    cwd: process.cwd(),
    absolute: true,
  });

  const routesToMigrate: string[] = [];

  for (const route of allRoutes) {
    const content = fs.readFileSync(route, 'utf-8');
    
    // Check if route has non-standardized errors
    const hasOldErrors = /NextResponse\.json\(\s*\{\s*error:/.test(content);
    const hasStandardized = hasStandardizedImports(content);
    
    if (hasOldErrors && !hasStandardized) {
      routesToMigrate.push(route);
    }
  }

  return routesToMigrate;
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const routeArg = args.find(arg => arg.startsWith('--routes='));

  console.log('🔧 Route Error Migration Script');
  console.log('================================\n');

  let routesToProcess: string[] = [];

  if (routeArg) {
    // Migrate specific routes
    const routes = routeArg.replace('--routes=', '').split(',');
    routesToProcess = routes.map(r => path.resolve(process.cwd(), r.trim()));
  } else if (all) {
    // Find all routes needing migration
    console.log('🔍 Finding routes that need migration...\n');
    routesToProcess = await findRoutesToMigrate();
    console.log(`Found ${routesToProcess.length} routes needing migration\n`);
  } else {
    console.log('Usage:');
    console.log('  pnpm tsx scripts/migrate-route-errors.ts --dry-run');
    console.log('  pnpm tsx scripts/migrate-route-errors.ts --routes="path/to/route.ts"');
    console.log('  pnpm tsx scripts/migrate-route-errors.ts --all');
    console.log('  pnpm tsx scripts/migrate-route-errors.ts --all --dry-run\n');
    return;
  }

  if (dryRun) {
    console.log('🔬 DRY RUN MODE - No files will be modified\n');
  }

  const results: MigrationResult[] = [];

  for (const route of routesToProcess) {
    console.log(`\n📝 Processing: ${path.relative(process.cwd(), route)}`);
    const result = await migrateRoute(route, dryRun);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ ${result.changes} changes made`);
      if (result.patterns.length > 0) {
        console.log(`   📌 Patterns: ${result.patterns.join(', ')}`);
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
  }

  // Summary
  console.log('\n\n📊 MIGRATION SUMMARY');
  console.log('====================');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalChanges = successful.reduce((sum, r) => sum + r.changes, 0);

  console.log(`Total routes processed: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📝 Total changes: ${totalChanges}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No files were modified');
    console.log('   Run without --dry-run to apply changes');
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed routes:');
    failed.forEach(r => {
      console.log(`   - ${path.relative(process.cwd(), r.filePath)}: ${r.error}`);
    });
  }
}

main().catch(console.error);
