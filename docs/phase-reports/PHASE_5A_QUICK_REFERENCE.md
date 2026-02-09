# Phase 5A Quick Reference

**Status:** Foundation Complete, Integration In Progress  
**Last Updated:** November 18, 2025

---

## 🗂️ File Structure

```
union-claims-standalone/
├── database/migrations/
│   ├── 030_hierarchical_organizations.sql    ← Main schema (450 lines)
│   ├── 031_migrate_tenant_data.sql           ← Data migration (350 lines)
│   └── 032_update_rls_policies.sql           ← RLS updates (380 lines)
│
├── types/
│   └── organization.ts                       ← TypeScript types (450 lines)
│
├── db/
│   └── schema-organizations.ts               ← Drizzle schema (300 lines)
│
├── docs/
│   └── PHASE_5A_DAY1_SUMMARY.md             ← Detailed summary
│
├── run-phase5a-migrations.js                 ← Migration runner
└── PHASE_5A_PROGRESS.md                      ← Full roadmap
```

---

## 🚀 To Execute Migrations

```bash
# 1. Backup database first!
# In Azure Portal: Database → Backups → Create backup

# 2. Set environment
# Ensure .env.local has DATABASE_URL

# 3. Run migration
node run-phase5a-migrations.js

# 4. Verify results
# Script will show hierarchy table automatically
```

---

## 📊 Key Database Changes

### New Tables

- `organizations` - Hierarchical org structure (replaces flat tenants)
- `organization_relationships` - Explicit relationship tracking

### Updated Tables (Added `organization_id` column)

- claims
- members
- strike_funds
- dues_payments
- deadlines
- documents
- analytics_events
- organization_members

### New Functions

- `get_ancestor_org_ids(uuid)` - Get all parents
- `get_descendant_org_ids(uuid)` - Get all children
- `get_user_visible_orgs(text)` - RLS visibility
- `user_can_access_org(text, uuid)` - Permission check
- `update_organization_hierarchy()` - Trigger for path updates

---

## 🔑 Key Types to Import

```typescript
// Main organization type
import { Organization, OrganizationType, CAJurisdiction, LabourSector } from '@/types/organization';

// For creating orgs
import { CreateOrganizationRequest, UpdateOrganizationRequest } from '@/types/organization';

// For tree views
import { OrganizationTreeNode, OrganizationWithRelations } from '@/types/organization';

// Helper functions
import { 
  isCLCAffiliate, 
  getOrganizationDisplayName, 
  formatHierarchyPath,
  getJurisdictionName,
  getSectorLabel
} from '@/types/organization';
```

---

## 🏗️ Organization Hierarchy Model

```
organizations {
  id: UUID
  name: string
  slug: string
  organization_type: enum (congress | federation | union | local | region | district)
  parent_id: UUID?
  hierarchy_path: string[]      ← ['clc', 'cupe', 'cupe-123']
  hierarchy_level: integer       ← 0 = CLC, 1 = Union, 2 = Local
  jurisdiction: enum             ← federal | AB | BC | ON | QC ...
  sectors: enum[]                ← healthcare, trades, education...
  clc_affiliated: boolean
  member_count: integer          ← Cached for performance
}
```

---

## 🎯 CLC Hierarchy Example

```
CLC (congress, level=0)
│
├─ CUPE National (union, level=1)
│  ├─ CUPE Local 123 (local, level=2)
│  ├─ CUPE Local 456 (local, level=2)
│  └─ CUPE Local 789 (local, level=2)
│
├─ Unifor National (union, level=1)
│  ├─ Unifor Local 444 (local, level=2) [Windsor Automotive]
│  └─ Unifor Local 200 (local, level=2)
│
└─ UFCW Canada (union, level=1)
   ├─ UFCW Local 1006A (local, level=2) [50K members, retail]
   └─ UFCW Local 175 (local, level=2)
```

---

## 🔐 RLS Visibility Rules

**Rule:** Users can VIEW down the hierarchy, but MODIFY only their own org

```
User in CUPE National:
  ✅ Can view CUPE National data
  ✅ Can view CUPE Local 123 data
  ✅ Can view CUPE Local 456 data
  ❌ Cannot view CLC data (parent)
  ❌ Cannot view Unifor data (sibling)
  ❌ Cannot modify Local 123 data (child)

User in CUPE Local 123:
  ✅ Can view CUPE Local 123 data
  ✅ Can modify CUPE Local 123 data
  ❌ Cannot view CUPE National data (parent)
  ❌ Cannot view CUPE Local 456 data (sibling)

CLC Admin (special case):
  ✅ Can view ALL affiliated union data
  ✅ Can generate cross-union analytics
```

---

## 📋 Migration Checklist

### Before Running Migrations

- [ ] Backup production database
- [ ] Test on staging first
- [ ] Review all 3 SQL files
- [ ] Verify .env.local has correct DATABASE_URL
- [ ] Notify team of maintenance window

### During Migration

- [ ] Run `node run-phase5a-migrations.js`
- [ ] Watch for errors
- [ ] Verify organization hierarchy displays
- [ ] Check all organization_id columns populated

### After Migration

- [ ] Run verification queries (in migration output)
- [ ] Test user login/context
- [ ] Verify claims still load
- [ ] Check performance (query times)
- [ ] Update Drizzle schema: `pnpm drizzle-kit push`

---

## 🛠️ Common Queries

### Get Organization Tree

```sql
SELECT * FROM organization_tree
ORDER BY hierarchy_path;
```

### Get All Descendants

```sql
SELECT * FROM get_descendant_org_ids('uuid-of-org');
```

### Get All Ancestors

```sql
SELECT * FROM get_ancestor_org_ids('uuid-of-org');
```

### Get User's Visible Orgs

```sql
SELECT * FROM get_user_visible_orgs('user-id');
```

### Check Organization Hierarchy

```sql
SELECT 
  hierarchy_level,
  REPEAT('  ', hierarchy_level) || name as name,
  organization_type,
  member_count,
  ARRAY_TO_STRING(sectors, ', ') as sectors
FROM organizations
ORDER BY hierarchy_path;
```

---

## 🐛 Troubleshooting

### Migration Fails

1. Check error message in console
2. Verify database connection
3. Look for conflicting constraints
4. Check if tables already exist
5. Restore from backup, fix issue, retry

### organization_id is NULL

```sql
-- Find missing mappings
SELECT table_name, COUNT(*) 
FROM (
  SELECT 'claims' as table_name FROM claims WHERE organization_id IS NULL
  UNION ALL
  SELECT 'members' FROM members WHERE organization_id IS NULL
) sub
GROUP BY table_name;

-- Backfill if needed
UPDATE claims c
SET organization_id = o.id
FROM organizations o
WHERE o.legacy_tenant_id = c.tenant_id
  AND c.organization_id IS NULL;
```

### RLS Blocking Queries

```sql
-- Check which orgs user has access to
SELECT * FROM get_user_visible_orgs('user-clerk-id-here');

-- Disable RLS temporarily (testing only!)
ALTER TABLE claims DISABLE ROW LEVEL SECURITY;
-- ... test query ...
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
```

### Hierarchy Path Wrong

```sql
-- Trigger should auto-fix, but can manually update:
UPDATE organizations
SET parent_id = parent_id -- Dummy update to trigger
WHERE hierarchy_path IS NULL;
```

---

## 📞 Need Help?

**Documentation:**

- Full roadmap: `PHASE_5A_PROGRESS.md`
- Day 1 summary: `docs/PHASE_5A_DAY1_SUMMARY.md`
- This guide: `docs/PHASE_5A_QUICK_REFERENCE.md`

**SQL Files:**

- Schema: `database/migrations/030_hierarchical_organizations.sql`
- Data: `database/migrations/031_migrate_tenant_data.sql`
- RLS: `database/migrations/032_update_rls_policies.sql`

**Type Definitions:**

- TypeScript: `types/organization.ts`
- Drizzle: `db/schema-organizations.ts`

---

**Phase 5A Status: Foundation Complete ✅**  
**Next: Execute migrations and begin API integration**
