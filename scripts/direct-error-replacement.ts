import fs from 'fs';
import path from 'path';

// Exact error patterns to replace
const replacements: Array<{pattern: RegExp, replacement: string, description: string}> = [
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*"No active organization"\s*\},\s*\{\s*status:\s*400\s*\}\s*\);/g,
    replacement: 'return standardErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD, "No active organization");',
    description: 'No active organization (400)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*"No organization context"\s*\},\s*\{\s*status:\s*400\s*\}\s*\);/g,
    replacement: 'return standardErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD, "No organization context");',
    description: 'No organization context (400)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'Organization context required'\s*\},\s*\{\s*status:\s*403\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.FORBIDDEN, 'Organization context required');`,
    description: 'Organization context required (403)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'Tenant context required'\s*\},\s*\{\s*status:\s*403\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.FORBIDDEN, 'Tenant context required');`,
    description: 'Tenant context required (403)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'User organization not found'\s*\},\s*\{\s*status:\s*403\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.FORBIDDEN, 'User organization not found');`,
    description: 'User organization not found (403)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'Invalid JSON in request body'\s*\},\s*\{\s*status:\s*400\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid JSON in request body');`,
    description: 'Invalid JSON (400)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'No file provided'\s*\},\s*\{\s*status:\s*400\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'No file provided');`,
    description: 'No file provided (400)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*"Recipient has no email address"\s*\},\s*\{\s*status:\s*400\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.VALIDATION_ERROR, "Recipient has no email address");`,
    description: 'Recipient has no email (400)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'No valid profiles found'\s*\},\s*\{\s*status:\s*400\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'No valid profiles found');`,
    description: 'No valid profiles (400)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'File too large \(max 10MB\)'\s*\},\s*\{\s*status:\s*400\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'File too large (max 10MB)');`,
    description: 'File too large (400)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'No valid transactions found'\s*\},\s*\{\s*status:\s*404\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'No valid transactions found');`,
    description: 'No valid transactions (404)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*'Failed to download file'\s*\},\s*\{\s*status:\s*400\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'Failed to download file');`,
    description: 'Failed to download (400)'
  },
  {
    pattern: /return NextResponse\.json\(\s*\{\s*error:\s*"Invalid webhook"\s*\},\s*\{\s*status:\s*401\s*\}\s*\);/g,
    replacement: `return standardErrorResponse(ErrorCode.AUTH_ERROR, "Invalid webhook");`,
    description: 'Invalid webhook (401)'
  }
];

// Files with remaining errors (from grep)
const targetFiles = [
  'app/api/webhooks/signatures/route.ts',
  'app/api/reconciliation/process/route.ts',
  'app/api/portal/dues/pay/route.ts',
  'app/api/messages/threads/[threadId]/messages/route.ts',
  'app/api/members/merge/route.ts',
  'app/api/clause-library/[id]/route.ts',
  'app/api/clause-library/[id]/tags/route.ts',
  'app/api/clause-library/[id]/share/route.ts',
  'app/api/communications/campaigns/[id]/route.ts',
  'app/api/communications/campaigns/[id]/analytics/route.ts',
  'app/api/communications/campaigns/[id]/send-test/route.ts',
  'app/api/communications/campaigns/[id]/schedule/route.ts',
  'app/api/communications/campaigns/[id]/analytics/export/route.ts',
  'app/api/communications/templates/[id]/duplicate/route.ts',
  'app/api/communications/distribution-lists/[id]/subscribers/route.ts',
  'app/api/communications/distribution-lists/[id]/export/route.ts',
  'app/api/claims/[id]/route.ts',
  'app/api/billing/send-invoice/route.ts',
  'app/api/arbitration/precedents/[id]/route.ts',
  'app/api/arbitration/precedents/[id]/documents/route.ts',
  'app/api/arbitration/precedents/[id]/citations/route.ts'
];

let totalChanges = 0;
let filesModified = 0;

for (const file of targetFiles) {
  try {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    const original = content;
    let fileChanges = 0;

    for (const { pattern, replacement, description } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fileChanges += matches.length;
        console.log(`  ✓ ${description}: ${matches.length}x`);
      }
    }

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ ${file} - ${fileChanges} changes`);
      filesModified++;
      totalChanges += fileChanges;
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error instanceof Error ? error.message : String(error));
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total changes: ${totalChanges}`);
