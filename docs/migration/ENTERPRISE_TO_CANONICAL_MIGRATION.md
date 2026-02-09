# Enterprise RBAC to Canonical Auth Migration Guide

**Date:** February 9, 2026  
**Status:** Ready for Migration  
**Affected Files:** 111 files using `enterprise-role-middleware`

---

## Executive Summary

All **enterprise-role-middleware** features have been **consolidated into the canonical `@/lib/api-auth-guard` module**. This is a **simple import path change** - all functionality remains identical.

### What's Changing
- ✅ **Import path only**: `@/lib/enterprise-role-middleware` → `@/lib/api-auth-guard`
- ✅ **No API changes**: All function signatures remain identical
- ✅ **Zero functionality changes**: Behavior is exactly the same
- ✅ **All features preserved**: Multi-role, permissions, scoping, audit logging

### Why Consolidate
- 🎯 **Single source of truth** for all authentication patterns
- 📚 **Simplified documentation** - one module to learn
- 🔧 **Easier maintenance** - changes in one place
- 🚀 **Better discoverability** - all auth functions in one import

---

## Quick Migration (TL;DR)

### Before (enterprise-role-middleware)
```typescript
import { withEnhancedRoleAuth } from '@/lib/enterprise-role-middleware';

export const GET = withEnhancedRoleAuth(50, async (request, context) => {
  // Handler logic
});
```

### After (canonical api-auth-guard)
```typescript
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const GET = withEnhancedRoleAuth(50, async (request, context) => {
  // Handler logic (NO CHANGES NEEDED)
});
```

**That's it!** Just change the import path. Everything else stays the same.

---

## Migration Functions Map

| **Old Module** | **New Module** | **Notes** |
|---|---|---|
| `withEnhancedRoleAuth()` | `withEnhancedRoleAuth()` | ✅ Identical API |
| `withPermission()` | `withPermission()` | ✅ Identical API |
| `withScopedRoleAuth()` | `withScopedRoleAuth()` | ✅ Identical API |
| `requirePermission()` | `requirePermission()` | ✅ Identical API |
| `requireRoleLevel()` | `requireRoleLevel()` | ✅ Identical API |
| `requireScope()` | `requireScope()` | ✅ Identical API |
| `canAccessMemberResource()` | `canAccessMemberResource()` | ✅ Identical API |
| `getPrimaryRole()` | `getPrimaryRole()` | ✅ Identical API |
| `getRolesForScope()` | `getRolesForScope()` | ✅ Identical API |
| `EnhancedRoleContext` type | `EnhancedRoleContext` type | ✅ Identical interface |

---

## Automated Migration

### Option 1: PowerShell Script (Recommended)

Run this script to automatically migrate all 111 files:

```powershell
# scripts/migrate-enterprise-to-canonical.ps1

$files = Get-ChildItem -Path "app\api" -Recurse -Filter "*.ts" -File

$migratedCount = 0
$errors = @()

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        
        # Check if file uses enterprise-role-middleware
        if ($content -match "@/lib/enterprise-role-middleware") {
            Write-Host "Migrating: $($file.FullName)"
            
            # Replace import path
            $newContent = $content -replace `
                "from ['`"]@/lib/enterprise-role-middleware['`"]", `
                "from '@/lib/api-auth-guard'"
            
            # Write back to file
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            
            $migratedCount++
            Write-Host "  ✅ Migrated successfully" -ForegroundColor Green
        }
    }
    catch {
        $errors += @{
            File = $file.FullName
            Error = $_.Exception.Message
        }
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n================================"
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "================================"
Write-Host "Files migrated: $migratedCount"
Write-Host "Errors: $($errors.Count)"

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:" -ForegroundColor Yellow
    foreach ($error in $errors) {
        Write-Host "  - $($error.File): $($error.Error)"
    }
}
```

**Run it:**
```powershell
cd C:\APPS\Union_Eyes_app_v1
.\scripts\migrate-enterprise-to-canonical.ps1
```

---

### Option 2: Node.js Script (Cross-platform)

```typescript
// scripts/migrate-enterprise-to-canonical.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

async function migrateFiles() {
  const files = await glob('app/api/**/*.ts');
  let migratedCount = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf8');

      // Check if file uses enterprise-role-middleware
      if (content.includes('@/lib/enterprise-role-middleware')) {
        console.log(`Migrating: ${file}`);

        // Replace import path
        content = content.replace(
          /from ['"]@\/lib\/enterprise-role-middleware['"]/g,
          "from '@/lib/api-auth-guard'"
        );

        // Write back to file
        writeFileSync(file, content, 'utf8');

        migratedCount++;
        console.log(`  ✅ Migrated successfully`);
      }
    } catch (error) {
      errors.push({
        file,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`  ❌ Error: ${error}`);
    }
  }

  console.log('\n================================');
  console.log('Migration Complete!');
  console.log('================================');
  console.log(`Files migrated: ${migratedCount}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors encountered:');
    errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }
}

migrateFiles().catch(console.error);
```

**Run it:**
```bash
pnpm tsx scripts/migrate-enterprise-to-canonical.ts
```

---

## Manual Migration Steps

If you prefer to migrate files manually:

### Step 1: Find All Files
```powershell
# Find all files importing from enterprise-role-middleware
Get-ChildItem -Path "app\api" -Recurse -Filter "*.ts" | `
  Select-String -Pattern "@/lib/enterprise-role-middleware" | `
  Select-Object -ExpandProperty Path -Unique
```

### Step 2: Update Each File

**Find this:**
```typescript
import { withEnhancedRoleAuth, withPermission } from '@/lib/enterprise-role-middleware';
```

**Replace with:**
```typescript
import { withEnhancedRoleAuth, withPermission } from '@/lib/api-auth-guard';
```

### Step 3: Verify No Changes Needed

✅ All handler code remains identical  
✅ All context properties remain the same  
✅ All options remain the same  
✅ No type changes needed

---

## Example Migrations

### Example 1: withEnhancedRoleAuth

**Before:**
```typescript
// app/api/ai/summarize/route.ts
import { withEnhancedRoleAuth } from '@/lib/enterprise-role-middleware';

export const POST = withEnhancedRoleAuth(50, async (request, context) => {
  const { roles, permissions, hasPermission } = context;
  
  if (!hasPermission('ai_summarize')) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }
  
  // AI summarization logic...
});
```

**After:**
```typescript
// app/api/ai/summarize/route.ts
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const POST = withEnhancedRoleAuth(50, async (request, context) => {
  const { roles, permissions, hasPermission } = context;
  
  if (!hasPermission('ai_summarize')) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }
  
  // AI summarization logic (NO CHANGES)...
});
```

---

### Example 2: withPermission

**Before:**
```typescript
// app/api/documents/[id]/approve/route.ts
import { withPermission } from '@/lib/enterprise-role-middleware';

export const POST = withPermission('approve_document', async (request, context) => {
  const { memberId, organizationId } = context;
  // Approval logic...
});
```

**After:**
```typescript
// app/api/documents/[id]/approve/route.ts
import { withPermission } from '@/lib/api-auth-guard';

export const POST = withPermission('approve_document', async (request, context) => {
  const { memberId, organizationId } = context;
  // Approval logic (NO CHANGES)...
});
```

---

### Example 3: withScopedRoleAuth

**Before:**
```typescript
// app/api/departments/[id]/stewards/route.ts
import { withScopedRoleAuth } from '@/lib/enterprise-role-middleware';

export const GET = withScopedRoleAuth('dept_steward', 'department', async (request, context) => {
  const { checkScope } = context;
  // Department-specific logic...
});
```

**After:**
```typescript
// app/api/departments/[id]/stewards/route.ts
import { withScopedRoleAuth } from '@/lib/api-auth-guard';

export const GET = withScopedRoleAuth('dept_steward', 'department', async (request, context) => {
  const { checkScope } = context;
  // Department-specific logic (NO CHANGES)...
});
```

---

### Example 4: Multiple Imports

**Before:**
```typescript
import { 
  withEnhancedRoleAuth, 
  requirePermission, 
  getPrimaryRole,
  type EnhancedRoleContext 
} from '@/lib/enterprise-role-middleware';
```

**After:**
```typescript
import { 
  withEnhancedRoleAuth, 
  requirePermission, 
  getPrimaryRole,
  type EnhancedRoleContext 
} from '@/lib/api-auth-guard';
```

---

## Testing After Migration

### 1. Type Check
```powershell
pnpm tsc --noEmit
```
Should pass with no type errors.

### 2. Run Tests
```powershell
pnpm test:coverage
```
All existing tests should pass without modifications.

### 3. Spot Check API Routes
Test a few migrated routes manually:
- Routes using `withEnhancedRoleAuth`
- Routes using `withPermission`
- Routes using `withScopedRoleAuth`

All should behave identically to before.

---

## Rollback Plan

If issues are discovered, rollback is simple:

```powershell
# Revert all changes
git checkout -- app/api/

# Or revert specific file
git checkout -- app/api/path/to/file.ts
```

Original `enterprise-role-middleware.ts` remains in codebase with deprecation notice, so imports will still work (but show deprecation warnings).

---

## Files to Migrate (111 total)

Run this command to see the complete list:

```powershell
Get-ChildItem -Path "app\api" -Recurse -Filter "*.ts" | `
  Select-String -Pattern "@/lib/enterprise-role-middleware" | `
  Select-Object -ExpandProperty Path -Unique | `
  ForEach-Object { $_.Replace((Get-Location).Path + '\', '') }
```

**Key affected areas:**
- `app/api/ai/**` - AI/ML features (40+ files)
- `app/api/analytics/**` - Analytics endpoints (15+ files)
- `app/api/documents/**` - Document management (10+ files)
- `app/api/activities/**` - Activity tracking (8+ files)
- `app/api/ml/**` - Machine learning (12+ files)
- `app/api/tax/**` - Tax reporting (8+ files)
- `app/api/voice/**` - Voice features (6+ files)
- `app/api/voting/**` - Voting system (5+ files)
- Others scattered across the API

---

## Timeline

| **Phase** | **Duration** | **Description** |
|---|---|---|
| **Phase 1: Preparation** | 1 hour | Review guide, backup code, test scripts |
| **Phase 2: Migration** | 2 hours | Run automated scripts, fix any script errors |
| **Phase 3: Testing** | 2 hours | Type check, run tests, manual spot checks |
| **Phase 4: Deployment** | 1 hour | Deploy to staging, monitor, deploy to prod |
| **Total** | **~6 hours** | Complete migration end-to-end |

---

## Success Criteria

✅ All 111 files migrated to use `@/lib/api-auth-guard`  
✅ No TypeScript compilation errors  
✅ All tests passing  
✅ Manual testing confirms identical behavior  
✅ No runtime errors in staging environment  
✅ `enterprise-role-middleware.ts` marked as deprecated but retained for backwards compatibility

---

## Support & Questions

If you encounter issues during migration:

1. **Check the import path**: Must be exactly `@/lib/api-auth-guard`
2. **Verify no type errors**: Run `pnpm tsc --noEmit`
3. **Check for typos**: Function names are case-sensitive
4. **Review the examples**: See if your pattern matches one above

**Common Issues:**

| **Issue** | **Solution** |
|---|---|
| `Cannot find module '@/lib/api-auth-guard'` | Check TypeScript paths in `tsconfig.json` |
| Type errors on `EnhancedRoleContext` | Import the type: `import { type EnhancedRoleContext }` |
| Runtime errors | Check that all function names are spelled correctly |
| Tests failing | Ensure test mocks are updated to use new import path |

---

## Next Steps After Migration

1. **Remove enterprise-role-middleware** (after 1-2 sprint buffer):
   ```bash
   git rm lib/enterprise-role-middleware.ts
   ```

2. **Update ESLint rules** to prevent old imports:
   ```javascript
   // .eslintrc.js
   rules: {
     'no-restricted-imports': ['error', {
       patterns: [{
         group: ['@/lib/enterprise-role-middleware'],
         message: 'Import from @/lib/api-auth-guard instead'
       }]
     }]
   }
   ```

3. **Update documentation** to reference only canonical module

4. **Celebrate!** 🎉 You've consolidated to a single auth system

---

## Appendix: Full API Reference

For complete API documentation of all enterprise RBAC functions now available in `@/lib/api-auth-guard`, see:

- [api-auth-guard.ts](../../lib/api-auth-guard.ts) - Source code with JSDoc
- [AUTH_MIGRATION_REPORT.md](./AUTH_MIGRATION_REPORT.md) - Overall auth status

**Key exports from `@/lib/api-auth-guard`:**

### Wrappers
- `withEnhancedRoleAuth(minLevel, handler, options)` - Multi-role auth with level checking
- `withPermission(permission, handler, options)` - Permission-based auth
- `withScopedRoleAuth(roleCode, scopeType, handler, options)` - Scoped role auth

### Runtime Checks
- `requirePermission(context, permission, errorMessage?)` - Assert permission
- `requireRoleLevel(context, minLevel, errorMessage?)` - Assert role level
- `requireScope(context, scopeType, scopeValue, errorMessage?)` - Assert scope

### Helpers
- `canAccessMemberResource(context, ownerId, minLevel?)` - Check resource access
- `getPrimaryRole(context)` - Get highest role
- `getRolesForScope(context, scopeType, scopeValue?)` - Filter roles by scope

### Types
- `EnhancedRoleContext` - Context with multi-role support
- `MemberRoleWithDetails` - Role information with scope details
