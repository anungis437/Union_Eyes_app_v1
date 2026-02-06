# Database Structure Consolidation Guide

## Current Issue

The project has two overlapping database directories that cause confusion:

```
Union_Eyes_app_v1/
├── database/           # Contains migrations and seeds
│   ├── migrations/     # 70+ SQL migration files
│   ├── schema/         # Analytics schema
│   └── seeds/          # Seed data
│
└── db/                 # Contains Drizzle schema and client
    ├── schema/         # 50+ TypeScript schema files
    ├── migrations/     # Drizzle-generated migrations (if any)
    ├── db.ts           # Database client
    └── index.ts        # Schema exports
```

## Problems

1. **Confusion**: Developers don't know which directory to use
2. **Duplication**: Two `migrations/` directories
3. **Import complexity**: Multiple import paths (`@/db`, `@/database`)
4. **Maintenance**: Schema changes must be tracked in both places

## Recommended Solution

### Option A: Consolidate into `db/` (Recommended)

Keep Drizzle-first approach:

```
db/
├── schema/              # All TypeScript Drizzle schemas
│   ├── index.ts
│   ├── users-schema.ts
│   ├── claims-schema.ts
│   └── ...
├── migrations/          # Drizzle-generated SQL migrations
│   ├── 0001_initial.sql
│   └── ...
├── seeds/              # Seed scripts
├── db.ts               # Database client
└── README.md           # Database documentation
```

**Migration steps:**
1. Move `database/seeds/` → `db/seeds/`
2. Keep `database/migrations/` as archive unless using raw SQL approach
3. Regenerate migrations with: `pnpm db:generate`
4. Update imports to use `@/db` exclusively

### Option B: Consolidate into `database/`

Traditional SQL-first approach:

```
database/
├── schema/              # Drizzle TypeScript schemas
├── migrations/          # SQL migrations (numbered)
├── seeds/              # Seed data
└── client.ts           # Database client
```

**Migration steps:**
1. Move `db/schema/*` → `database/schema/`
2. Move `db/db.ts` → `database/client.ts`
3. Update `tsconfig.json` paths
4. Update all imports

## Decision Factors

| Factor | Option A (db/) | Option B (database/) |
|--------|----------------|---------------------|
| Drizzle conventions | ✅ Matches Drizzle defaults | ⚠️ Non-standard |
| Migration workflow | ✅ Drizzle Kit auto-generate | ⚠️ Manual SQL files |
| Type safety | ✅ Schema-first | ⚠️ SQL-first |
| Team preference | TypeScript developers | SQL-first developers |
| Current state | Mostly aligned | Requires refactor |

## Recommended Action (Option A)

### Step 1: Move Seeds (5 minutes)

```powershell
# Create seeds directory
New-Item -ItemType Directory -Path "db\seeds" -Force

# Move seed files
Move-Item -Path "database\seeds\*" -Destination "db\seeds\" -Force
```

### Step 2: Archive Old Migrations (2 minutes)

```powershell
# Rename for clarity
Rename-Item -Path "database\migrations" -NewName "migrations-archive-raw-sql"
```

### Step 3: Update Documentation (10 minutes)

Update README to clarify:
- `db/` is the source of truth
- `database/migrations-archive-raw-sql/` kept for reference
- All new schemas go in `db/schema/`

### Step 4: Standardize Imports (20 minutes)

Audit codebase for imports from `@/database` and change to `@/db`:

```typescript
// ❌ Old
import { schema } from '@/database/schema';

// ✅ New
import * as schema from '@/db/schema';
```

### Step 5: Clean Up (5 minutes)

- Delete empty `database/schema/` if unused
- Keep `database/migrations-archive-raw-sql/` as historical reference
- Add `.gitignore` entry if needed

## Current Import Patterns to Fix

```typescript
// Multiple patterns found (need standardization):
import { db } from '@/db';                    // ✅ Good
import { db } from '@/db/db';                 // ⚠️ Redundant
import { db } from '@/lib/db';                // ⚠️ Re-export
import * from '@/database/schema';            // ❌ Wrong directory
```

## Testing After Consolidation

1. ✅ Run type check: `pnpm type-check`
2. ✅ Test migrations: `pnpm db:generate`
3. ✅ Build project: `pnpm build`
4. ✅ Run tests: `pnpm test`

## Timeline

- **Immediate**: Document decision (this file)
- **Week 1**: Implement Step 1-3 (low risk)
- **Week 2**: Audit and fix imports (Step 4)
- **Week 3**: Clean up and validate (Step 5)

## Roll-back Plan

If consolidation causes issues:
1. Revert import changes via git
2. Restore original directory structure
3. Keep both directories temporarily with clear docs

## Related Issues

- Multiple database clients (`db.ts` locations)
- Migration tracking confusion
- Schema export duplication (see `db/schema/index.ts`)

## Next Steps

1. Team decision: Option A or B?
2. Schedule consolidation sprint
3. Create tracking issue
4. Update developer onboarding docs
