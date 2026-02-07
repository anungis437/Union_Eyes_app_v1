#!/usr/bin/env tsx
/**
 * Fixes invalid user.id keys in audit logs and duplicate auth destructuring.
 *
 * Usage:
 *   tsx scripts/fix-auth-userid.ts [path] [--dry-run] [--apply]
 */

import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

interface FixStats {
  filesScanned: number;
  filesChanged: number;
  replacements: number;
  errors: string[];
}

const stats: FixStats = {
  filesScanned: 0,
  filesChanged: 0,
  replacements: 0,
  errors: [],
};

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dryRun = args.includes('--dry-run') || !apply;
const targetPath = args.find((arg) => !arg.startsWith('--')) || 'app/api';

function isWithEnhancedRoleAuth(content: string): boolean {
  return content.includes('withEnhancedRoleAuth') && /async\s*\(\s*\w+\s*,\s*context\s*\)/.test(content);
}

function replaceAll(content: string, pattern: RegExp, replacer: (match: string, ...groups: string[]) => string): { content: string; count: number } {
  let count = 0;
  const newContent = content.replace(pattern, (...args: string[]) => {
    count += 1;
    return replacer(...args);
  });
  return { content: newContent, count };
}

function fixFile(filePath: string): boolean {
  const original = fs.readFileSync(filePath, 'utf-8');
  let updated = original;
  let changed = false;
  let fileReplacements = 0;

  // 1) Fix invalid object literal keys: user.id:
  const keyFix = replaceAll(updated, /\buser\.id\s*:/g, () => 'userId:');
  updated = keyFix.content;
  fileReplacements += keyFix.count;

  // 1b) Fix invalid object literal shorthand on its own line or after '{'
  const shorthandLineFix = replaceAll(updated, /(^\s*)user\.id\s*(?=[,}])/gm, (_match, prefix) => {
    return `${prefix}userId: user.id`;
  });
  updated = shorthandLineFix.content;
  fileReplacements += shorthandLineFix.count;

  const shorthandInlineFix = replaceAll(updated, /(\{\s*)user\.id\s*(?=[,}])/g, (_match, prefix) => {
    return `${prefix}userId: user.id`;
  });
  updated = shorthandInlineFix.content;
  fileReplacements += shorthandInlineFix.count;

  const timestampFix = replaceAll(updated, /(timestamp:[^\n]*?,\s*)user\.id\b/g, (_match, prefix) => {
    return `${prefix}userId: user.id`;
  });
  updated = timestampFix.content;
  fileReplacements += timestampFix.count;

  // 1c) Undo shorthand replacement in template literals
  const templateFix = replaceAll(updated, /\$\{\s*userId:\s*user\.id\s*\}/g, () => '${user.id}');
  updated = templateFix.content;
  fileReplacements += templateFix.count;

  // 1d) Fix invalid named-argument style usage in function calls
  const argFix = replaceAll(updated, /([,(])\s*userId:\s*user\.id\s*(?=[,)])/g, (_match, prefix) => {
    return `${prefix} user.id`;
  });
  updated = argFix.content;
  fileReplacements += argFix.count;

  const useContext = isWithEnhancedRoleAuth(updated);
  let shouldReplaceOrgId = false;
  let needsRequireUserImport = false;

  // 2) Fix invalid destructuring from auth()
  const destructureAuth = /const\s*\{\s*user\.id\s*,\s*orgId\s*\}\s*=\s*(await\s+)?auth\(\)\s*;?/g;
  const destructureAuthAliased = /const\s*\{\s*user\.id\s*:\s*([A-Za-z0-9_]+)\s*,\s*orgId\s*\}\s*=\s*(await\s+)?auth\(\)\s*;?/g;

  if (useContext) {
    const fix1 = replaceAll(updated, destructureAuth, () => {
      shouldReplaceOrgId = true;
      return 'const { userId, organizationId } = context;';
    });
    updated = fix1.content;
    fileReplacements += fix1.count;

    const fix2 = replaceAll(updated, destructureAuthAliased, (_match, alias) => {
      shouldReplaceOrgId = true;
      return `const { userId: ${alias}, organizationId } = context;`;
    });
    updated = fix2.content;
    fileReplacements += fix2.count;
  } else {
    const fix1 = replaceAll(updated, destructureAuth, (_match, awaitToken) => {
      const awaitPrefix = awaitToken ? awaitToken : '';
      return `const { userId, orgId } = ${awaitPrefix}auth();`;
    });
    updated = fix1.content;
    fileReplacements += fix1.count;

    const fix2 = replaceAll(updated, destructureAuthAliased, (_match, alias, awaitToken) => {
      const awaitPrefix = awaitToken ? awaitToken : '';
      return `const { userId: ${alias}, orgId } = ${awaitPrefix}auth();`;
    });
    updated = fix2.content;
    fileReplacements += fix2.count;
  }

  // 3) Normalize non-awaited auth() destructuring
  const noAwaitUserId = /const\s*\{\s*userId\s*\}\s*=\s*auth\(\)\s*;?/g;
  if (useContext) {
    const fix = replaceAll(updated, noAwaitUserId, () => 'const { userId } = context;');
    updated = fix.content;
    fileReplacements += fix.count;
  } else {
    const fix = replaceAll(updated, noAwaitUserId, () => 'const { userId } = await auth();');
    updated = fix.content;
    fileReplacements += fix.count;
  }

  const noAwaitUserOrg = /const\s*\{\s*userId\s*,\s*orgId\s*\}\s*=\s*auth\(\)\s*;?/g;
  if (useContext) {
    const fix = replaceAll(updated, noAwaitUserOrg, () => {
      shouldReplaceOrgId = true;
      return 'const { userId, organizationId } = context;';
    });
    updated = fix.content;
    fileReplacements += fix.count;
  } else {
    const fix = replaceAll(updated, noAwaitUserOrg, () => 'const { userId, orgId } = await auth();');
    updated = fix.content;
    fileReplacements += fix.count;
  }

  // 4) Normalize inline (await auth()).user.id usage when context is available
  if (useContext) {
    const inlineAuthUserId = /\(await\s+auth\(\)\)\.user\.id\b/g;
    const fix = replaceAll(updated, inlineAuthUserId, () => 'userId');
    updated = fix.content;
    fileReplacements += fix.count;
  }

  // 4b) Normalize direct auth() usage to unified auth when context is not available
  if (!useContext) {
    const awaitUserId = /const\s*\{\s*userId\s*\}\s*=\s*await\s+auth\(\)\s*;?/g;
    const fix1 = replaceAll(updated, awaitUserId, () => {
      needsRequireUserImport = true;
      return 'const { userId } = await requireUser();';
    });
    updated = fix1.content;
    fileReplacements += fix1.count;

    const awaitUserOrg = /const\s*\{\s*userId\s*,\s*orgId\s*\}\s*=\s*await\s+auth\(\)\s*;?/g;
    const fix2 = replaceAll(updated, awaitUserOrg, () => {
      needsRequireUserImport = true;
      shouldReplaceOrgId = true;
      return 'const { userId, organizationId } = await requireUser();';
    });
    updated = fix2.content;
    fileReplacements += fix2.count;

    const awaitUserOrgAliased = /const\s*\{\s*userId\s*:\s*([A-Za-z0-9_]+)\s*,\s*orgId\s*\}\s*=\s*await\s+auth\(\)\s*;?/g;
    const fix3 = replaceAll(updated, awaitUserOrgAliased, (_match, alias) => {
      needsRequireUserImport = true;
      shouldReplaceOrgId = true;
      return `const { userId: ${alias}, organizationId } = await requireUser();`;
    });
    updated = fix3.content;
    fileReplacements += fix3.count;

    const awaitUserIdAliased = /const\s*\{\s*userId\s*:\s*([A-Za-z0-9_]+)\s*\}\s*=\s*await\s+auth\(\)\s*;?/g;
    const fix4 = replaceAll(updated, awaitUserIdAliased, (_match, alias) => {
      needsRequireUserImport = true;
      return `const { userId: ${alias} } = await requireUser();`;
    });
    updated = fix4.content;
    fileReplacements += fix4.count;

    const authResultPattern = /const\s+authResult\s*=\s*await\s+auth\(\)\s*;?/g;
    const fix5 = replaceAll(updated, authResultPattern, () => {
      needsRequireUserImport = true;
      return 'const authResult = await requireUser();';
    });
    updated = fix5.content;
    fileReplacements += fix5.count;

    const authResultOrgId = /\bauthResult\.orgId\b/g;
    const fix6 = replaceAll(updated, authResultOrgId, () => {
      shouldReplaceOrgId = true;
      return 'authResult.organizationId';
    });
    updated = fix6.content;
    fileReplacements += fix6.count;
  }

  // 5) If we switched to context org, rename orgId identifiers to organizationId
  if (shouldReplaceOrgId) {
    const orgIdFix = replaceAll(updated, /\borgId\b/g, () => 'organizationId');
    updated = orgIdFix.content;
    fileReplacements += orgIdFix.count;
  }

  // 6) Fix duplicated wrapper closure before invocation
  const doubleClose = /(\n\s*)\}\)\s*\n\s*\}\)\((request[^;]*?)\);/g;
  const closeFix = replaceAll(updated, doubleClose, (_match, lineBreak, args) => {
    return `${lineBreak}})(${args});`;
  });
  updated = closeFix.content;
  fileReplacements += closeFix.count;

  const extraBraceClose = /(\n\s*)\}\s*\n\s*\}\)\((request[^;]*?)\);/g;
  const braceFix = replaceAll(updated, extraBraceClose, (_match, lineBreak, args) => {
    return `${lineBreak}})(${args});`;
  });
  updated = braceFix.content;
  fileReplacements += braceFix.count;

  // 6b) Ensure handler block is closed before invoking wrapper
  if (updated.includes('})(request')) {
    const lines = updated.split(/\r?\n/);
    const fixedLines: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/\}\)\(request/.test(line)) {
        let j = fixedLines.length - 1;
        while (j >= 0 && fixedLines[j].trim() === '') {
          j -= 1;
        }
        const prevLine = j >= 0 ? fixedLines[j].trim() : '';
        if (!prevLine.endsWith('}')) {
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          fixedLines.push(`${indent}}`);
          fileReplacements += 1;
        }
      }
      fixedLines.push(line);
    }
    updated = fixedLines.join('\n');
  }

  // 7) Ensure requireUser import and clean up auth import if needed
  if (needsRequireUserImport) {
    if (!updated.includes("from '@/lib/auth/unified-auth'")) {
      const importBlock = updated.match(/^(?:import[^\n]*\n)+/);
      const importLine = "import { requireUser } from '@/lib/auth/unified-auth';\n";
      if (importBlock) {
        const insertAt = importBlock[0].length;
        updated = `${importBlock[0]}${importLine}${updated.slice(insertAt)}`;
      } else {
        updated = `${importLine}${updated}`;
      }
      fileReplacements += 1;
    }

    const clerkImport = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@clerk\/nextjs\/server['"];?/;
    const clerkMatch = updated.match(clerkImport);
    if (clerkMatch) {
      const names = clerkMatch[1]
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const filtered = names.filter((name) => name !== 'auth');
      if (filtered.length === 0) {
        updated = updated.replace(clerkMatch[0], '');
        fileReplacements += 1;
      } else if (filtered.length !== names.length) {
        const newImport = `import { ${filtered.join(', ')} } from '@clerk/nextjs/server';`;
        updated = updated.replace(clerkMatch[0], newImport);
        fileReplacements += 1;
      }
    }
  }

  if (updated !== original) {
    changed = true;
  }

  stats.filesScanned += 1;
  if (changed) {
    stats.filesChanged += 1;
    stats.replacements += fileReplacements;
  }

  if (changed && apply) {
    fs.writeFileSync(filePath, updated, 'utf-8');
  }

  if (changed) {
    const rel = path.relative(process.cwd(), filePath);
    const label = apply ? 'updated' : 'would update';
    console.log(`  ${label}: ${rel} (${fileReplacements} replacements)`);
  }

  return changed;
}

function run(): void {
  const pattern = path.join(targetPath, '**/route.ts').replace(/\\/g, '/');
  const files = globSync(pattern, {
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    absolute: true,
  });

  console.log(`Scanning ${files.length} route files under ${targetPath}`);

  for (const file of files) {
    try {
      fixFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.errors.push(`${file}: ${message}`);
    }
  }

  console.log('\nSummary:');
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Files changed: ${stats.filesChanged}`);
  console.log(`  Replacements: ${stats.replacements}`);

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    for (const err of stats.errors) {
      console.log(`  - ${err}`);
    }
  }

  if (dryRun) {
    console.log('\nDry run only. Re-run with --apply to write changes.');
  }
}

run();
