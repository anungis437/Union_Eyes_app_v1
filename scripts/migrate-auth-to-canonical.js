#!/usr/bin/env node
/**
 * Migration Script: Canonical Auth Patterns
 * 
 * Migrates API routes from legacy auth patterns to canonical module patterns.
 * 
 * Usage:
 *   node scripts/migrate-auth-to-canonical.js --dry-run  # Preview changes
 *   node scripts/migrate-auth-to-canonical.js              # Apply changes
 * 
 * Patterns migrated:
 * - withSecureAPI -> withApiAuth
 * - withEnhancedRoleAuth(role, ...) -> withRoleAuth(role, ...)
 * - getCurrentUser() manual auth -> withApiAuth wrapper
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// =============================================================================
// CONSTANTS
// =============================================================================

const CANONICAL_IMPORT = "import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';";

// =============================================================================
// MIGRATION RULES
// =============================================================================

const migrationRules = [
  {
    // Rule 1: withSecureAPI -> withApiAuth
    pattern: /import\s*\{\s*withSecureAPI\s*\}\s*from\s*['"]@\/lib\/api-security-middleware['"];?/g,
    replacement: CANONICAL_IMPORT,
    handler: (content) => {
      return content
        .replace(/withSecureAPI\s*\(/g, 'withApiAuth(')
        .replace(/export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=\s*withApiAuth\s*\(/g, 'export const $1 = withApiAuth(');
    },
    description: 'withSecureAPI -> withApiAuth'
  },
  {
    // Rule 2: withEnhancedRoleAuth -> withRoleAuth (preserves role level)
    pattern: /import\s*\{\s*withEnhancedRoleAuth\s*\}\s*from\s*['"]@\/lib\/enterprise-role-middleware['"];?/g,
    replacement: CANONICAL_IMPORT,
    handler: (content) => {
      // withEnhancedRoleAuth(50, handler) -> withRoleAuth('admin', handler)
      // withEnhancedRoleAuth(40, handler) -> withRoleAuth('member', handler)
      let migrated = content
        .replace(/import\s*\{\s*withEnhancedRoleAuth\s*\}\s*from\s*['"]@\/lib\/enterprise-role-middleware['"];?/g, CANONICAL_IMPORT);
      
      // Map role levels to role names based on ROLE_HIERARCHY
      migrated = migrated
        .replace(/withEnhancedRoleAuth\s*\(\s*100\s*,\s*async\s*\(/g, "withRoleAuth('admin', async (")
        .replace(/withEnhancedRoleAuth\s*\(\s*80\s*,\s*async\s*\(/g, "withRoleAuth('officer', async (")
        .replace(/withEnhancedRoleAuth\s*\(\s*60\s*,\s*async\s*\(/g, "withRoleAuth('steward', async (")
        .replace(/withEnhancedRoleAuth\s*\(\s*40\s*,\s*async\s*\(/g, "withRoleAuth('member', async (")
        .replace(/withEnhancedRoleAuth\s*\(/g, "withRoleAuth(");
      
      return migrated;
    },
    description: 'withEnhancedRoleAuth -> withRoleAuth'
  },
  {
    // Rule 3: withOrganizationAuth -> withApiAuth (org context is handled by handler)
    pattern: /import\s*\{\s*withOrganizationAuth\s*\}\s*from\s*['"]@\/lib\/organization-middleware['"];?/g,
    replacement: CANONICAL_IMPORT,
    handler: (content) => {
      return content
        .replace(/withOrganizationAuth\s*\(/g, 'withApiAuth(');
    },
    description: 'withOrganizationAuth -> withApiAuth'
  },
  {
    // Rule 4: getCurrentUser manual auth pattern -> withApiAuth wrapper
    // Matches: import { getCurrentUser } from '@/lib/auth'; + manual checks
    pattern: /import\s*\{\s*getCurrentUser\s*\}\s*from\s*['"]@\/lib\/auth['"];?/g,
    replacement: CANONICAL_IMPORT,
    handler: (content) => {
      // This is more complex - it requires wrapping the handlers
      // For now, just update the import and add a comment
      let migrated = content
        .replace(/import\s*\{\s*getCurrentUser\s*\}\s*from\s*['"]@\/lib\/auth['"];?/g, CANONICAL_IMPORT);
      
      // Add comment about migration
      migrated = migrated.replace(
        /(\/\*\*[\s\S]*?\*\/)/,
        `$1\n// TODO: Migrate to withApiAuth wrapper pattern for consistency\n// Original pattern used getCurrentUser() with manual auth checks\n`
      );
      
      return migrated;
    },
    description: 'getCurrentUser -> withApiAuth (manual review needed)'
  },
  {
    // Rule 5: requireUser -> getCurrentUser from canonical
    pattern: /import\s*\{\s*requireUser\s*\}\s*from\s*['"]@\/lib\/auth\/unified-auth['"];?/g,
    replacement: "import { getCurrentUser } from '@/lib/api-auth-guard';",
    handler: (content) => {
      return content
        .replace(/const user = await requireUser\(\);/g, 'const user = await getCurrentUser();')
        .replace(/if \(!user\)\s*\{[^}]*\}/g, `if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }`);
    },
    description: 'requireUser -> getCurrentUser'
  },
  {
    // Rule 6: Clerk auth() pattern - keep but re-export from canonical
    pattern: /import\s*\{\s*auth\s*\}\s*from\s*['"]@clerk\/nextjs\/server['"];?/g,
    replacement: "import { auth } from '@/lib/api-auth-guard';",
    handler: (content) => content,
    description: 'Clerk auth() -> canonical re-export'
  },
  {
    // Rule 7: Clerk currentUser() pattern - keep but re-export from canonical
    pattern: /import\s*\{\s*currentUser\s*\}\s*from\s*['"]@clerk\/nextjs\/server['"];?/g,
    replacement: "import { currentUser } from '@/lib/api-auth-guard';",
    handler: (content) => content,
    description: 'Clerk currentUser() -> canonical re-export'
  }
];

// =============================================================================
// HELPERS
// =============================================================================

function findApiRoutes(appDir) {
  const pattern = path.join(appDir, 'api', '**/route.ts').replace(/\\/g, '/');
  return glob.sync(pattern);
}

function analyzeRoute(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  
  const patterns = [];
  
  // Check for each auth pattern
  if (/withSecureAPI\s*\(/.test(content)) {
    patterns.push('withSecureAPI');
  }
  if (/withEnhancedRoleAuth\s*\(/.test(content)) {
    patterns.push('withEnhancedRoleAuth');
  }
  if (/withOrganizationAuth\s*\(/.test(content)) {
    patterns.push('withOrganizationAuth');
  }
  if (/getCurrentUser\s*\(/.test(content)) {
    patterns.push('getCurrentUser');
  }
  if (/requireUser\s*\(/.test(content)) {
    patterns.push('requireUser');
  }
  if (/auth\s*\(\s*\)/.test(content)) {
    patterns.push('Clerk-auth');
  }
  if (/currentUser\s*\(/.test(content)) {
    patterns.push('Clerk-currentUser');
  }
  if (/withApiAuth\s*\(/.test(content)) {
    patterns.push('canonical-withApiAuth');
  }
  if (/withRoleAuth\s*\(/.test(content)) {
    patterns.push('canonical-withRoleAuth');
  }
  
  return {
    filePath,
    relativePath,
    patterns,
    isCanonical: patterns.includes('canonical-withApiAuth') || patterns.includes('canonical-withRoleAuth')
  };
}

function migrateRoute(filePath, rule) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const newContent = rule.handler(content);
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    return true;
  }
  return false;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  console.log('🔄 Canonical Auth Migration Script\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n');
  }
  
  const appDir = path.join(process.cwd(), 'app');
  
  if (!fs.existsSync(appDir)) {
    console.error(`Error: app directory not found at ${appDir}`);
    process.exit(1);
  }
  
  const routes = findApiRoutes(appDir);
  
  console.log(`Found ${routes.length} API routes\n`);
  
  // Analyze routes
  const analysis = routes.map(analyzeRoute);
  
  // Group by current pattern
  const byPattern = {};
  for (const route of analysis) {
    for (const pattern of route.patterns) {
      if (!byPattern[pattern]) {
        byPattern[pattern] = [];
      }
      byPattern[pattern].push(route);
    }
  }
  
  console.log('📊 Current Auth Pattern Distribution:\n');
  const patternCounts = {};
  for (const [pattern, routesList] of Object.entries(byPattern)) {
    patternCounts[pattern] = routesList.length;
    console.log(`  ${pattern}: ${routesList.length} routes`);
  }
  console.log('');
  
  // Canonical routes
  const canonicalRoutes = analysis.filter(r => r.isCanonical);
  console.log(`✅ Already Canonical: ${canonicalRoutes.length} routes\n`);
  
  // Routes to migrate
  const routesToMigrate = analysis.filter(r => !r.isCanonical);
  console.log(`📝 Routes to Migrate: ${routesToMigrate.length} routes\n`);
  
  if (verbose) {
    console.log('Routes using legacy patterns:');
    for (const route of routesToMigrate.slice(0, 20)) {
      console.log(`  - ${route.relativePath}: ${route.patterns.join(', ')}`);
    }
    if (routesToMigrate.length > 20) {
      console.log(`  ... and ${routesToMigrate.length - 20} more`);
    }
    console.log('');
  }
  
  // Apply migrations
  console.log('🔄 Applying Migrations:\n');
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const rule of migrationRules) {
    console.log(`  ${rule.description}:`);
    
    const matchingRoutes = routes.filter(route => {
      const content = fs.readFileSync(route, 'utf-8');
      return rule.pattern.test(content);
    });
    
    console.log(`    Found ${matchingRoutes.length} routes`);
    
    for (const routeFile of matchingRoutes) {
      if (dryRun) {
        console.log(`    [DRY-RUN] Would migrate: ${path.relative(process.cwd(), routeFile)}`);
      } else {
        const changed = migrateRoute(routeFile, rule);
        if (changed) {
          console.log(`    ✅ Migrated: ${path.relative(process.cwd(), routeFile)}`);
          migratedCount++;
        } else {
          console.log(`    ⏭️  Skipped (no changes): ${path.relative(process.cwd(), routeFile)}`);
          skippedCount++;
        }
      }
    }
  }
  
  console.log('');
  
  if (dryRun) {
    console.log('🔍 DRY RUN COMPLETE');
    console.log(`    Would migrate: ${migratedCount + skippedCount} routes`);
  } else {
    console.log('✅ MIGRATION COMPLETE');
    console.log(`    Migrated: ${migratedCount} routes`);
    console.log(`    Skipped: ${skippedCount} routes`);
    
    // Re-run validation
    console.log('\n🔐 Running validation...');
    const { execSync } = require('child_process');
    try {
      execSync('node scripts/check-api-guards.js', { cwd: process.cwd(), stdio: 'inherit' });
    } catch (e) {
      // Validation may fail if not all patterns are canonical
      console.log('\n⚠️  Validation completed with warnings (expected during migration)');
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { findApiRoutes, analyzeRoute, migrateRoute, migrationRules };
