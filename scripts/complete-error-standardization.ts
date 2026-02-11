/**
 * Complete Error Standardization Script
 * 
 * Processes the remaining 30 routes to achieve 100% error standardization
 * Converts NextResponse.json error patterns to standardErrorResponse()
 */

import * as fs from 'fs';
import * as path from 'path';

const ROUTES_TO_FIX = [
  'app/api/admin/database/optimize/route.ts',
  'app/api/admin/pki/workflows/route.ts',
  'app/api/analytics/operational/bottlenecks/route.ts',
  'app/api/analytics/operational/sla/route.ts',
  'app/api/auth/role/route.ts',
  'app/api/carbon/dashboard/route.ts',
  'app/api/carbon/infrastructure/route.ts',
  'app/api/communications/track/open/[campaignId]/[recipientId]/route.ts',
  'app/api/currency/convert/route.ts',
  'app/api/debug/user-role/route.ts',
  'app/api/docs/openapi.json/route.ts',
  'app/api/emergency/activate/route.ts',
  'app/api/emergency/dashboard/route.ts',
  'app/api/feature-flags/route.ts',
  'app/api/graphql/route.ts',
  'app/api/health/liveness/route.ts',
  'app/api/health/route.ts',
  'app/api/jurisdiction-rules/route.ts',
  'app/api/members/[id]/route.ts',
  'app/api/metrics/route.ts',
  'app/api/onboarding/smart-defaults/route.ts',
  'app/api/social-media/accounts/callback/route.ts',
  'app/api/status/route.ts',
  'app/api/stripe/webhooks/route.ts',
  'app/api/tax/t106/route.ts',
  'app/api/test-auth/route.ts',
  'app/api/voice/transcribe/route.ts',
  'app/api/whop/create-checkout/route.ts',
  'app/api/whop/unauthenticated-checkout/route.ts',
  'app/api/whop/webhooks/route.ts',
];

interface ProcessResult {
  file: string;
  success: boolean;
  changes: number;
  error?: string;
}

function addStandardErrorImport(content: string): string {
  // Check if already imported
  if (content.includes('from \'@/lib/api/standardized-responses\'')) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import\s+.*?;$/gm;
  const imports = content.match(importRegex);
  
  if (!imports || imports.length === 0) {
    // No imports found, add at the top after comments
    const firstLine = content.search(/^[^/*\s]/m);
    if (firstLine === -1) {
      return `import { standardErrorResponse, ErrorCode } from '@/lib/api/standardized-responses';\n\n${content}`;
    }
    return content.slice(0, firstLine) + 
           `import { standardErrorResponse, ErrorCode } from '@/lib/api/standardized-responses';\n\n` +
           content.slice(firstLine);
  }

  // Add after the last import
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;

  return content.slice(0, insertPosition) +
         '\nimport { standardErrorResponse, ErrorCode } from \'@/lib/api/standardized-responses\';' +
         content.slice(insertPosition);
}

function convertErrorResponses(content: string): { content: string; changes: number } {
  let modified = content;
  let changes = 0;

  // Pattern 1: Simple error objects - most common
  // NextResponse.json({ error: '...' }, { status: XXX })
  const simpleErrorPattern = /NextResponse\.json\(\s*\{\s*error:\s*(['"](.*?)['"]|.*?)\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/gs;
  
  modified = modified.replace(simpleErrorPattern, (match, errorMsg, errorText, statusCode) => {
    const status = parseInt(statusCode);
    let errorCode = 'ErrorCode.INTERNAL_ERROR';
    
    if (status === 400) errorCode = 'ErrorCode.VALIDATION_ERROR';
    else if (status === 401) errorCode = 'ErrorCode.UNAUTHORIZED';
    else if (status === 403) errorCode = 'ErrorCode.FORBIDDEN';
    else if (status === 404) errorCode = 'ErrorCode.NOT_FOUND';
    else if (status === 409) errorCode = 'ErrorCode.CONFLICT';
    else if (status === 422) errorCode = 'ErrorCode.UNPROCESSABLE_ENTITY';
    else if (status === 429) errorCode = 'ErrorCode.RATE_LIMIT_EXCEEDED';
    else if (status === 503) errorCode = 'ErrorCode.SERVICE_UNAVAILABLE';
    
    changes++;
    return `standardErrorResponse(${errorCode})`;
  });

  // Pattern 2: Error objects with multiple fields
  // NextResponse.json({ error: '...', details: ..., etc }, { status: XXX })
  const complexErrorPattern = /NextResponse\.json\(\s*\{\s*error:\s*(['"](.*?)['"]|[^,}]+),\s*([^}]*)\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/gs;
  
  modified = modified.replace(complexErrorPattern, (match, errorMsg, errorText, additionalFields, statusCode) => {
    // Skip if already converted
    if (match.includes('standardErrorResponse')) return match;
    
    const status = parseInt(statusCode);
    let errorCode = 'ErrorCode.INTERNAL_ERROR';
    
    if (status === 400) errorCode = 'ErrorCode.VALIDATION_ERROR';
    else if (status === 401) errorCode = 'ErrorCode.UNAUTHORIZED';
    else if (status === 403) errorCode = 'ErrorCode.FORBIDDEN';
    else if (status === 404) errorCode = 'ErrorCode.NOT_FOUND';
    else if (status === 503) errorCode = 'ErrorCode.SERVICE_UNAVAILABLE';
    
    changes++;
    return `standardErrorResponse(${errorCode})`;
  });

  // Pattern 3: Catch error with instanceof Error
  // { error: error instanceof Error ? error.message : 'Unknown error' }
  const errorInstancePattern = /NextResponse\.json\(\s*\{\s*[^}]*error:\s*error\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*[^,}]+[^}]*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/gs;
  
  modified = modified.replace(errorInstancePattern, (match, statusCode) => {
    const status = parseInt(statusCode);
    let errorCode = 'ErrorCode.INTERNAL_ERROR';
    
    if (status === 500) errorCode = 'ErrorCode.INTERNAL_ERROR';
    else if (status === 503) errorCode = 'ErrorCode.SERVICE_UNAVAILABLE';
    
    changes++;
    return `standardErrorResponse(${errorCode})`;
  });

  return { content: modified, changes };
}

async function processRoute(filePath: string): Promise<ProcessResult> {
  const fullPath = path.join(process.cwd(), filePath);
  
  try {
    if (!fs.existsSync(fullPath)) {
      return {
        file: filePath,
        success: false,
        changes: 0,
        error: 'File not found'
      };
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;

    // Step 1: Add import if needed
    content = addStandardErrorImport(content);

    // Step 2: Convert error responses
    const result = convertErrorResponses(content);
    content = result.content;

    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      return {
        file: filePath,
        success: true,
        changes: result.changes
      };
    }

    return {
      file: filePath,
      success: true,
      changes: 0
    };

  } catch (error) {
    return {
      file: filePath,
      success: false,
      changes: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function main() {
  console.log('🔧 Complete Error Standardization Script');
  console.log('=========================================\n');
  console.log(`📝 Processing ${ROUTES_TO_FIX.length} routes...\n`);

  const results: ProcessResult[] = [];
  let totalChanges = 0;
  let successCount = 0;

  for (const route of ROUTES_TO_FIX) {
    const result = await processRoute(route);
    results.push(result);
    
    if (result.success) {
      successCount++;
      totalChanges += result.changes;
      if (result.changes > 0) {
        console.log(`✅ ${route} - ${result.changes} changes`);
      } else {
        console.log(`⚪ ${route} - no changes needed`);
      }
    } else {
      console.log(`❌ ${route} - ${result.error}`);
    }
  }

  console.log('\n📊 SUMMARY');
  console.log('===========');
  console.log(`Total routes: ${ROUTES_TO_FIX.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${ROUTES_TO_FIX.length - successCount}`);
  console.log(`📝 Total changes: ${totalChanges}`);

  if (successCount === ROUTES_TO_FIX.length) {
    console.log('\n🎉 All routes processed successfully!');
  }
}

main().catch(console.error);
