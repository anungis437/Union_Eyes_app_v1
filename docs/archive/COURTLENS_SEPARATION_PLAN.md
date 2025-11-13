# CourtLens to UnionEyes Separation Plan

## 🎯 Executive Summary

**Issue**: The union-claims-standalone codebase contains `@courtlens` and `@court-lens` scoped packages that need to be separated and rebranded to `@unioneyes` as we migrate to the new UnionEyes platform.

**Good News**: All Azure resources are **already UnionEyes-branded** and can be used as-is! The only separation needed is at the package/code level.

**Impact**: Low - This is primarily a naming/branding change. No architectural changes required.

---

## 📦 Package Rebranding Inventory

### Current CourtLens Packages (7 total)

| Current Name | New Name | Purpose | Dependencies |
|--------------|----------|---------|--------------|
| `@courtlens/auth` | `@unioneyes/auth` | Authentication utilities, SSO, RBAC | `@court-lens/supabase` |
| `@courtlens/multi-tenant` | `@unioneyes/multi-tenant` | Multi-tenancy support | `@courtlens/types` |
| `@courtlens/types` | `@unioneyes/types` | Shared TypeScript types | None |
| `@court-lens/workflow` | `@unioneyes/workflow` | Workflow engine | `@court-lens/supabase` |
| `@court-lens/ui` | `@unioneyes/ui` | Shared UI components | React, Tailwind |
| `@court-lens/supabase` | `@unioneyes/supabase` | Database client wrapper | `@supabase/supabase-js` |
| `@court-lens/shared` | `@unioneyes/shared` | Utility functions | None |

### Package Usage Analysis

**Main App Dependencies:**
```json
// d:\APPS\union-claims-standalone\package.json
"dependencies": {
  "@court-lens/supabase": "workspace:*",
  "@court-lens/ui": "workspace:*",
  "@court-lens/workflow": "workspace:*",
  "@courtlens/auth": "workspace:*",
  "@courtlens/multi-tenant": "workspace:*"
}
```

**Legal Data Service:**
```json
// services/legal-data-service/package.json
"dependencies": {
  "@court-lens/legal-data": "workspace:*"
}
```

**Inter-package Dependencies:**
- `@courtlens/auth` depends on `@court-lens/supabase`
- `@courtlens/multi-tenant` depends on `@courtlens/types`
- `@court-lens/workflow` depends on `@court-lens/supabase`

---

## ☁️ Azure Resources Inventory (ALREADY UNIONEYES BRANDED! ✅)

### Existing Azure Resources

#### 1. **Azure Container Registry** ✅
- **Name**: `acrunionclaimsdev4x25.azurecr.io`
- **Status**: Active, contains 3 deployed microservices
- **Images**:
  - `claims-service:latest`
  - `notification-service:latest`
  - `document-service:latest`
  - `auth-service:latest`
  - `ai-service:latest`
  - `business-law-service:latest`
  - (and more)

#### 2. **Azure Kubernetes Service (AKS)** ✅
- **Cluster**: Union Claims Dev cluster
- **Status**: Active with 8+ pods running
- **Deployed Services**:
  - Claims Service (2 replicas)
  - Notification Service (2 replicas)
  - Document Service (2 replicas)
  - Auth Service (2 replicas)

#### 3. **Azure PostgreSQL** ✅
- **Server**: `psql-union-claims-dev-4x25.postgres.database.azure.com`
- **Status**: Active
- **Connection**: Already configured in codebase

#### 4. **Azure Blob Storage** (Inferred from code)
- Used for document storage
- Likely named: `unionclaimsXXXX` or similar

#### 5. **Azure Speech Services** (Inferred from code)
- Used for voice-to-text functionality
- SDK: `microsoft-cognitiveservices-speech-sdk@1.46.0`
- May need separate resource or can share subscription

#### 6. **Azure Cognitive Services** (Inferred from code)
- Used for AI features
- OpenAI integration via `@azure/openai@2.0.0`

---

## 🔄 Separation Strategy

### Option 1: Clean Rebrand (RECOMMENDED)
**Timeline**: 1-2 days  
**Risk**: Low  
**Approach**: Rename all packages during migration to UnionEyes

**Steps:**
1. In UnionEyes, create new package structure under `packages/`
2. Copy code from old packages
3. Update `package.json` with `@unioneyes` scope
4. Update all imports throughout codebase
5. Update `pnpm-workspace.yaml` to reference new packages

**Advantages:**
- Clean break from CourtLens
- All code under UnionEyes branding
- No dependency on old packages
- Clear ownership

**Impact on Azure:**
- ✅ **NONE** - Azure resources already UnionEyes branded!

### Option 2: Gradual Migration
**Timeline**: 2-4 weeks  
**Risk**: Medium  
**Approach**: Keep packages temporarily, rebrand incrementally

**NOT RECOMMENDED** because it prolongs dependency on old naming.

---

## 📋 Detailed Migration Steps

### Phase 1: Package Structure Setup (Day 1)

1. **Create UnionEyes package structure:**
```
UnionEyes/
├── packages/
│   ├── auth/              # @unioneyes/auth
│   ├── multi-tenant/      # @unioneyes/multi-tenant
│   ├── types/             # @unioneyes/types
│   ├── workflow/          # @unioneyes/workflow
│   ├── ui/                # @unioneyes/ui
│   ├── supabase/          # @unioneyes/supabase
│   └── shared/            # @unioneyes/shared
└── pnpm-workspace.yaml
```

2. **Create `pnpm-workspace.yaml`:**
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

3. **Create base `tsconfig.json` with path mappings:**
```json
{
  "compilerOptions": {
    "paths": {
      "@unioneyes/auth": ["./packages/auth/src"],
      "@unioneyes/multi-tenant": ["./packages/multi-tenant/src"],
      "@unioneyes/types": ["./packages/types/src"],
      "@unioneyes/workflow": ["./packages/workflow/src"],
      "@unioneyes/ui": ["./packages/ui/src"],
      "@unioneyes/supabase": ["./packages/supabase/src"],
      "@unioneyes/shared": ["./packages/shared/src"]
    }
  }
}
```

### Phase 2: Package Migration (Day 1-2)

For each package:

1. **Copy source code:**
```powershell
# Example for auth package
Copy-Item -Path "D:\APPS\union-claims-standalone\packages\auth\*" `
          -Destination "D:\APPS\union-claims-standalone\UnionEyes\packages\auth\" `
          -Recurse
```

2. **Update `package.json`:**
```json
// Before (old)
{
  "name": "@courtlens/auth",
  "dependencies": {
    "@court-lens/supabase": "workspace:*"
  }
}

// After (new)
{
  "name": "@unioneyes/auth",
  "dependencies": {
    "@unioneyes/supabase": "workspace:*"
  }
}
```

3. **Update imports in source files:**
```typescript
// Before
import { createClient } from '@court-lens/supabase';
import type { User } from '@courtlens/types';

// After
import { createClient } from '@unioneyes/supabase';
import type { User } from '@unioneyes/types';
```

4. **Run find/replace across package:**
```powershell
# PowerShell script to update imports
Get-ChildItem -Path ".\packages\auth\" -Recurse -Include *.ts,*.tsx | 
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '@courtlens/', '@unioneyes/'
    $content = $content -replace '@court-lens/', '@unioneyes/'
    Set-Content $_.FullName -Value $content
  }
```

### Phase 3: Application Migration (Day 2)

1. **Update main app `package.json`:**
```json
// UnionEyes/package.json
{
  "name": "unioneyes",
  "dependencies": {
    "@unioneyes/auth": "workspace:*",
    "@unioneyes/multi-tenant": "workspace:*",
    "@unioneyes/supabase": "workspace:*",
    "@unioneyes/ui": "workspace:*",
    "@unioneyes/workflow": "workspace:*"
  }
}
```

2. **Update all imports in Next.js app:**
```typescript
// Before
import { useAuth } from '@courtlens/auth';
import { Button } from '@court-lens/ui';

// After
import { useAuth } from '@unioneyes/auth';
import { Button } from '@unioneyes/ui';
```

3. **Run automated import replacement:**
```powershell
# Update all app files
Get-ChildItem -Path ".\app\" -Recurse -Include *.ts,*.tsx | 
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '@courtlens/', '@unioneyes/'
    $content = $content -replace '@court-lens/', '@unioneyes/'
    Set-Content $_.FullName -Value $content
  }
```

### Phase 4: Verification & Testing (Day 2)

1. **Install dependencies:**
```powershell
cd UnionEyes
pnpm install
```

2. **Type check:**
```powershell
pnpm type-check
```

3. **Build packages:**
```powershell
pnpm --filter "@unioneyes/*" build
```

4. **Build app:**
```powershell
pnpm build
```

5. **Run dev server:**
```powershell
pnpm dev
```

---

## 🔍 Search & Replace Reference

### File Extensions to Update
```
*.ts
*.tsx
*.js
*.jsx
*.json
*.md
*.yaml
*.yml
```

### Search Patterns
```regex
@courtlens/
@court-lens/
courtlens
court-lens
CourtLens
Court Lens
```

### Replace With
```
@unioneyes/
@unioneyes/
unioneyes
unioneyes
UnionEyes
UnionEyes
```

### Exceptions (DO NOT CHANGE)
- Azure resource names (already UnionEyes!)
- Git history/commit messages
- Archive folders
- node_modules (will be regenerated)

---

## 🚨 Critical Considerations

### 1. **No Azure Changes Required** ✅
All Azure resources are already branded as UnionEyes:
- Container Registry: `acrunionclaimsdev4x25.azurecr.io`
- PostgreSQL: `psql-union-claims-dev-4x25.postgres.database.azure.com`
- AKS cluster: Union Claims Dev

**Action Required**: NONE - Use existing resources as-is!

### 2. **Package Publishing**
If you plan to publish packages to npm:
- Reserve `@unioneyes` npm organization
- Update registry URLs in package.json
- Configure authentication

For now, using `workspace:*` protocol keeps everything local.

### 3. **Import Compatibility**
Since Next.js 14 uses Turbopack (or Webpack), ensure:
- Path mappings in `tsconfig.json` are correct
- `pnpm-workspace.yaml` includes all package paths
- Packages export proper entry points

### 4. **Microservices Updates**
If microservices reference these packages:
```powershell
# Update each microservice
cd services/claims-service
# Update package.json and imports
pnpm install
pnpm build
# Rebuild Docker image with new code
docker build -t acrunionclaimsdev4x25.azurecr.io/claims-service:latest .
docker push acrunionclaimsdev4x25.azurecr.io/claims-service:latest
```

### 5. **Database Schema**
No changes required - database schema is independent of package names.

---

## ✅ Verification Checklist

### Pre-Migration
- [ ] Backup union-claims-standalone repository
- [ ] Document current package versions
- [ ] List all files importing CourtLens packages
- [ ] Verify Azure resource access

### During Migration
- [ ] Create UnionEyes package structure
- [ ] Copy package source code
- [ ] Update all package.json files
- [ ] Update all imports in packages
- [ ] Update all imports in app code
- [ ] Update imports in microservices (if any)
- [ ] Update TypeScript path mappings
- [ ] Update pnpm workspace config

### Post-Migration
- [ ] `pnpm install` succeeds
- [ ] No `@courtlens` or `@court-lens` references remain
- [ ] TypeScript compilation succeeds
- [ ] All packages build successfully
- [ ] Application runs without errors
- [ ] Microservices can import updated packages
- [ ] Tests pass (if any)
- [ ] Documentation updated

---

## 📊 Impact Assessment

### Low Impact ✅
- Package naming (purely cosmetic)
- Import statements (find/replace operation)
- TypeScript paths (configuration update)

### No Impact ✅
- Azure resources (already correct branding!)
- Database schema
- API endpoints
- Supabase configuration
- Clerk authentication

### Medium Impact ⚠️
- Microservices (need rebuild if using packages)
- Docker images (need rebuild with updated code)
- Documentation (references to old names)

### Zero Impact ✅
- User data
- Production deployments (if any)
- Third-party integrations

---

## 🎯 Recommended Action Plan

### Immediate (This Week)

1. **Day 1 Morning: Setup**
   - Create package structure in UnionEyes
   - Set up pnpm workspace
   - Configure TypeScript paths

2. **Day 1 Afternoon: Migration**
   - Copy and rebrand all 7 packages
   - Update package.json files
   - Run find/replace on imports

3. **Day 2 Morning: Integration**
   - Update main app imports
   - Install dependencies
   - Fix any type errors

4. **Day 2 Afternoon: Verification**
   - Build all packages
   - Run development server
   - Test basic functionality

### This Month
- Migrate microservices to use new packages
- Rebuild Docker images
- Update deployment manifests
- Deploy to AKS (using existing Azure resources!)

---

## 💡 Key Insights

### What Makes This Easy
1. ✅ **Azure resources already UnionEyes branded** - No cloud migration needed!
2. ✅ **Workspace protocol** - Packages are local, not published to npm
3. ✅ **TypeScript** - Type safety catches import issues immediately
4. ✅ **Clear separation** - Packages are well-organized in `packages/` folder
5. ✅ **Modern tooling** - pnpm makes monorepo management easy

### What to Watch For
1. ⚠️ **Circular dependencies** - Ensure packages don't depend on each other cyclically
2. ⚠️ **Path mappings** - Must match both `tsconfig.json` and `pnpm-workspace.yaml`
3. ⚠️ **Build order** - Some packages may need to build before others
4. ⚠️ **Microservice images** - Need rebuild/redeploy after package updates

---

## 📚 Resources

### Configuration Files to Update
```
UnionEyes/
├── package.json              # Add workspace packages
├── pnpm-workspace.yaml       # Define package paths
├── tsconfig.json             # Configure path mappings
├── packages/*/package.json   # Update package names
└── services/*/package.json   # Update dependencies (if needed)
```

### Commands Reference
```powershell
# Install all workspace dependencies
pnpm install

# Build all packages
pnpm --filter "@unioneyes/*" build

# Build specific package
pnpm --filter "@unioneyes/auth" build

# Run app in development
pnpm dev

# Type check
pnpm type-check

# Clean and reinstall
Remove-Item -Recurse -Force node_modules, packages\*\node_modules
pnpm install
```

---

## 🎉 Conclusion

**The CourtLens to UnionEyes separation is straightforward:**

1. ✅ Azure resources are already UnionEyes branded - use as-is
2. ✅ Only package names need updating (find/replace)
3. ✅ Modern tooling (pnpm, TypeScript) makes this safe
4. ✅ Can be completed in 1-2 days

**No architectural changes required. No Azure migration needed. Just a clean rebrand!**

---

**Ready to proceed?** Let me know and I'll start the automated migration process! 🚀
