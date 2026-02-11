# Union Role Assignment Guide
**For Organization Administrators**  
**Version:** 2.0 (Updated February 11, 2026)  
**Status:** Complete Role Hierarchy Now Available

---

## Quick Reference Card

### Complete Role Hierarchy (10 Roles)

| Role | Level | Who Gets This? | Key Permissions |
|------|-------|----------------|-----------------|
| **President** | 90 | Elected chief executive | CBA signing, appoint committees, full visibility |
| **Vice President** | 85 | Elected deputy/successor | Deputy authority, succession planning |
| **Secretary-Treasurer** | 85 | Elected financial officer | Financial management, dues, reporting |
| **Chief Steward** | 70 | Lead steward supervisor | Supervise stewards, complex grievances |
| **Officer** | 60 | Board members, section leaders | Approve claims, view analytics, oversight |
| **Steward** | 50 | Department representatives | Handle grievances, manage members in dept |
| **Bargaining Committee** | 40 | Contract negotiation team | Edit CBA, participate in negotiations |
| **Health & Safety Rep** | 30 | Workplace safety monitors | Safety claims, incident reporting |
| **Member** | 10 | Regular union members | Self-service, view own data, vote |
| **Admin** | 100 | IT/System Administrator | **DO NOT assign to union officers** |

⚠️ **Important:** `admin` is for IT staff only. Union presidents should get `president` role, not `admin`.

---

## Role Descriptions & Use Cases

### Executive Officers (Levels 85-90)

#### 🏆 President (Level 90)
**Who:** Elected chief executive officer of the union

**Authority:**
- Sign collective bargaining agreements (CBA signatory)
- Appoint committee members
- Delegate authority to other officers
- Full visibility across organization
- Manage elections and voting
- Ultimate decision-making authority

**Permissions:**
- All claim management (view, edit, approve)
- All member management
- Financial oversight (view)
- CBA editing and signing
- Analytics (all levels)
- User management

**Typical Assignment:** After union election, assign to elected president

**Term:** Usually 3 years (tracked in member_roles.term_years)

---

#### 👥 Vice President (Level 85)
**Who:** Elected second-in-command, successor to president

**Authority:**
- Acts as deputy to president
- Takes over during president's absence
- Succession planning (becomes acting president if needed)
- Oversight and approval authority

**Permissions:**
- All claim management (view, edit, approve)
- All member management
- Voting oversight
- CBA viewing (not signing)
- Analytics viewing

**Typical Assignment:** After union election, assign to elected vice president

**Term:** Usually 3 years (tracked in member_roles.term_years)

**Note:** Can be designated as `acting_for_member_id` when president is unavailable

---

#### 💰 Secretary-Treasurer (Level 85)
**Who:** Elected financial officer, manages union finances

**Authority:**
- Financial oversight and approval
- dues management
- Financial reporting
- Budget management
- Per-capita remittances

**Permissions:**
- Financial management (view, edit, approve)
- Financial analytics
- Member visibility (for dues tracking)
- Claim visibility (for financial impact)

**Typical Assignment:** After union election, assign to elected secretary-treasurer

**Term:** Usually 3 years (tracked in member_roles.term_years)

**Special:** May require co-signing authority with president for large transactions

---

### Senior Representatives (Levels 60-70)

#### 📋 Chief Steward (Level 70)
**Who:** Lead steward who supervises all other stewards

**Authority:**
- Supervise department stewards
- Handle complex/escalated grievances
- Assign claims to stewards
- Training and mentoring stewards

**Permissions:**
- All claim management (view, edit, approve)
- Member management
- Claim assignment
- Analytics viewing

**Typical Assignment:** Elected or appointed by executive board

**Term:** Usually 2 years

**Scope:** Global (org-wide) or by division/region

---

#### 🎖️ Officer (Level 60)
**Who:** Board members, section leaders, executive board members

**Authority:**
- Oversight and governance
- Approve claims and grievances
- View organizational analytics
- Participate in board decisions

**Permissions:**
- Claim approval
- Member viewing (all)
- Voting participation and oversight
- Analytics viewing

**Typical Assignment:** Elected to executive board or appointed as section leader

**Term:** Usually 3 years (if elected)

**Note:** Generic officer role for board members who don't hold specific executive positions

---

### Front-Line Representatives (Levels 40-50)

#### 🛠️ Steward (Level 50)
**Who:** Department representatives, handle day-to-day member issues

**Authority:**
- Represent members in grievances (first step)
- Handle workplace complaints
- Member onboarding and support
- First point of contact for members

**Permissions:**
- Create and edit claims (own scope)
- View all claims (within scope)
- Edit member information
- Assign claims (within department)

**Typical Assignment:** Elected by department or appointed by chief steward

**Term:** Usually 2 years

**Scope:** Department, location, shift, or chapter

**Example Scopes:**
- scope_type: "department", scope_value: "Manufacturing"
- scope_type: "location", scope_value: "Plant A"
- scope_type: "shift", scope_value: "Night Shift"

---

#### 🤝 Bargaining Committee Member (Level 40)
**Who:** Participates in collective bargaining and contract negotiations

**Authority:**
- Contract negotiation participation
- CBA editing and proposals
- Research and analysis for negotiations
- Member communication about bargaining

**Permissions:**
- CBA viewing and editing
- Member viewing (for bargaining impact)
- Analytics viewing (contract analysis)

**Typical Assignment:** Elected by membership or appointed by executive board

**Term:** Duration of contract negotiations (can be indefinite)

**Note:** Usually appointed before bargaining starts, removed after contract ratification

---

### Specialized Representatives (Levels 20-30)

#### 🏥 Health & Safety Representative (Level 30)
**Who:** Monitors workplace safety, handles safety complaints

**Authority:**
- Workplace safety inspections
- Safety incident investigation
- Health & safety committee participation
- WSIB/Workers' Comp support

**Permissions:**
- View and create health & safety claims
- View members (for safety incidents)
- Access safety inspection reports

**Typical Assignment:** Elected or appointed as per provincial legislation

**Term:** Usually 1 year (can be renewed)

**Scope:** Location or department-specific

**Legal Note:** Some provinces require certified H&S reps by law

---

### Base Membership (Level 10)

#### 👤 Member (Level 10)
**Who:** Regular union members, base membership

**Authority:**
- Self-service access to own data
- Submit grievances and claims
- Participate in voting
- View collective agreements

**Permissions:**
- View own claims, create claims, edit own claims
- View own profile
- Cast votes
- View CBA (read-only)

**Typical Assignment:** Automatic upon joining union

**Term:** Indefinite (while employed and in good standing)

**Default Role:** All users start as members unless upgraded

---

## Role Assignment Workflow

### Step 1: Identify the Need

**Trigger Events:**
- Union election held
- New steward elected/appointed
- Officer resignation or term expiration
- Committee formed
- New hire needs system access

### Step 2: Verify Authority

**Who Can Assign Roles:**
- Organization Admin (role: `admin`) - Can assign ANY role
- President (role: `president`) - Can assign roles up to officer
- Chief Steward (role: `chief_steward`) - Can assign steward roles

**Authorization Matrix:**
| Assigner Role | Can Assign |
|---------------|------------|
| Admin | All roles (system-level) |
| President | President, VP, Secretary-Treasurer, Chief Steward, Officer, Steward, Bargaining Committee, H&S Rep, Member |
| Chief Steward | Steward, Member |
| Officer | Member only |

### Step 3: Choose the Correct Role

**Decision Tree:**

1. **Is this person IT/system staff?**
   - ✅ YES → **admin** (Level 100)
   - ❌ NO → Continue

2. **Is this person an elected executive officer?**
   - ✅ YES → Which position?
     - President → **president** (Level 90)
     - Vice President → **vice_president** (Level 85)
     - Secretary-Treasurer → **secretary_treasurer** (Level 85)
   - ❌ NO → Continue

3. **Is this person a senior representative?**
   - ✅ Chief Steward (supervises stewards) → **chief_steward** (Level 70)
   - ✅ Executive Board Member → **officer** (Level 60)
   - ❌ NO → Continue

4. **Is this person a front-line representative?**
   - ✅ Department Steward → **steward** (Level 50)
   - ✅ Bargaining Team Member → **bargaining_committee** (Level 40)
   - ❌ NO → Continue

5. **Is this person a specialized representative?**
   - ✅ Health & Safety Rep → **health_safety_rep** (Level 30)
   - ❌ NO → **member** (Level 10)

### Step 4: Assign the Role

**Via UI (Recommended):**
1. Navigate to: Dashboard → Members → [Select Member]
2. Click "Edit Member" or "Manage Roles"
3. Select role from dropdown
4. Set scope (if applicable): Department, Location, Shift
5. Set term information:
   - Start Date (default: today)
   - End Date (optional, for term limits)
   - Term Length (e.g., 3 years)
   - Election Date (if elected)
6. Save changes

**Via API:**
```bash
POST /api/members/{memberId}/roles
{
  "roleCode": "president",
  "scopeType": "global",
  "startDate": "2026-02-11",
  "termYears": 3,
  "assignmentType": "elected",
  "electionDate": "2026-02-01",
  "voteCount": 450,
  "totalVotes": 620
}
```

**Via Database (Emergency):**
```sql
INSERT INTO member_roles (
  member_id, tenant_id, role_code, scope_type,
  start_date, term_years, assignment_type, 
  status, created_by, created_at
) VALUES (
  '{member_id}', '{tenant_id}', 'president', 'global',
  CURRENT_DATE, 3, 'elected',
  'active', '{admin_user_id}', NOW()
);
```

### Step 5: Verify Assignment

**Checks:**
- [ ] Member can see appropriate menu items
- [ ] Member can access appropriate pages
- [ ] Member can perform role-specific actions
- [ ] Role appears in member profile
- [ ] Audit log shows role assignment

**Test Actions by Role:**
| Role | Test Action |
|------|-------------|
| president | Try to sign CBA, appoint committee member |
| vice_president | View all claims, approve claim |
| secretary_treasurer | View financial reports, approve payment |
| chief_steward | Assign claim to steward |
| officer | Approve claim, view analytics |
| steward | Create claim for member, edit member info |
| bargaining_committee | Edit CBA language |
| health_safety_rep | Create safety incident claim |
| member | Create own claim, cast vote |

---

## Scope-Based Assignments

### What is Scope?

**Scope** limits a role's authority to a subset of the organization.

**Scope Types:**
- `global` - Org-wide authority (default for executives)
- `department` - Specific department/section
- `location` - Specific workplace location
- `shift` - Specific work shift
- `chapter` - Specific chapter (for large locals with chapters)

### Examples

#### Department Steward
```
role: steward
scope_type: department
scope_value: "Manufacturing"
```
→ This steward can only handle claims/members in Manufacturing department

#### Plant-Specific Officer
```
role: officer
scope_type: location
scope_value: "Plant A - Windsor"
```
→ This officer has authority only at Windsor plant

#### Night Shift Steward
```
role: steward
scope_type: shift
scope_value: "Night Shift (11pm-7am)"
```
→ This steward represents night shift workers only

#### Global President
```
role: president
scope_type: global
scope_value: null
```
→ President has authority across entire organization (typical)

---

## Term Limits & Elections

### Tracking Terms

When assigning elected roles, record:
- `assignment_type`: "elected"
- `election_date`: Date election was held
- `term_years`: Length of term (e.g., 3)
- `next_election_date`: Calculated end of term
- `vote_count`: Votes received (optional)
- `total_votes`: Total votes cast (optional)

**Example:**
```
Election Date: 2026-02-01
Term: 3 years
Next Election: 2029-02-01
```

### Automatic Expiration

The system checks for expired terms daily:
- `member_roles.status` changes from "active" to "expired"
- Member loses permissions automatically
- Notifications sent to admins

### Renewal Process

When term expires:
1. Union holds election
2. Admin assigns new role (winner) or renews existing:
   ```sql
   -- Renew existing officer
   UPDATE member_roles 
   SET election_date = '2029-02-01',
       next_election_date = '2032-02-01',
       vote_count = 520,
       total_votes = 700,
       status = 'active',
       updated_at = NOW()
   WHERE member_id = '{member_id}' 
     AND role_code = 'president'
     AND status = 'expired';
   ```

---

## Acting Roles & Delegation

### When to Use Acting Roles

**Scenarios:**
- President on medical leave → VP becomes acting president
- Steward on vacation → Backup steward assigned
- Secretary-Treasurer resignation → Interim appointment

### How to Assign Acting Role

**Via UI:**
1. Go to: Members → [Select Deputy]
2. Click "Assign Acting Role"
3. Select:
   - Acting As: president
   - Acting For: [Current President]
   - Reason: "Medical leave"
   - Start Date: 2026-02-15
   - End Date: 2026-04-15 (optional)
4. Submit for approval (if required)

**Via Database:**
```sql
INSERT INTO member_roles (
  member_id, tenant_id, role_code, 
  is_acting_role, acting_for_member_id, acting_reason,
  acting_start_date, acting_end_date,
  assignment_type, status, created_by
) VALUES (
  '{vp_member_id}', '{tenant_id}', 'president',
  TRUE, '{president_member_id}', 'Medical leave',
  '2026-02-15', '2026-04-15',
  'acting', 'active', '{admin_user_id}'
);
```

**Result:** VP now has president permissions until 2026-04-15

---

## Multi-Role Assignments

### Can One Person Have Multiple Roles?

**Yes!** A member can hold multiple roles simultaneously.

**Common Combinations:**
- President + Officer (usually redundant, President is higher)
- Officer + Bargaining Committee Member
- Steward + Health & Safety Rep
- Chief Steward + Officer

**Example:**
```
John Smith:
  - Role: chief_steward (level 70, global)
  - Role: health_safety_rep (level 30, location: "Plant A")
```
→ John is Chief Steward org-wide AND H&S rep at Plant A

**Hierarchy Rule:**
- Highest role level applies for access control
- Permissions are UNION of all roles
- Scope restrictions still apply per-role

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Assigning Union President as "admin"

**Wrong:**
```
President → admin (Level 100)
```

**Why Wrong:**
- `admin` is for IT/system staff
- Creates audit confusion (is this IT or President?)
- Mixes operational with technical authority

**Right:**
```
President → president (Level 90)
IT Staff → admin (Level 100)
```

---

### ❌ Mistake 2: Using "officer" for Everyone

**Wrong:**
```
President → officer
Vice President → officer
Secretary-Treasurer → officer
Chief Steward → officer
```

**Why Wrong:**
- Loses role specificity
- Cannot enforce CBA signing restrictions
- Cannot restrict financial controls to Secretary-Treasurer
- Audit trail is meaningless

**Right:**
```
President → president
Vice President → vice_president
Secretary-Treasurer → secretary_treasurer
Chief Steward → chief_steward
Board Member → officer
```

---

### ❌ Mistake 3: Forgetting Scope for Stewards

**Wrong:**
```
role: steward
scope_type: global
scope_value: null
```

**Why Wrong:**
- Steward gets access to ALL departments
- Should be restricted to their department

**Right:**
```
role: steward
scope_type: department
scope_value: "Manufacturing"
```

---

### ❌ Mistake 4: Not Setting Term Limits

**Wrong:**
```
role: president
start_date: 2026-02-01
end_date: null  ← No expiration!
```

**Why Wrong:**
- President's term never expires
- No automatic notifications for re-election

**Right:**
```
role: president
start_date: 2026-02-01
term_years: 3
next_election_date: 2029-02-01
```

---

## Troubleshooting

### Problem: Member Can't See Expected Features

**Check:**
1. Verify role assigned correctly:
   ```sql
   SELECT role_code, status, start_date, end_date
   FROM member_roles
   WHERE member_id = '{member_id}'
     AND tenant_id = '{tenant_id}'
     AND status = 'active';
   ```

2. Check if term expired:
   ```sql
   SELECT * FROM member_roles
   WHERE member_id = '{member_id}'
     AND status = 'expired';
   ```

3. Verify role level matches expectations:
   ```typescript
   // In application code
   const role = await getUserRole(userId, organizationId);
   console.log('Role:', role, 'Level:', ROLE_HIERARCHY[role]);
   ```

### Problem: Role Assignment Fails

**Common Causes:**
1. **Insufficient permissions** → Check assigner's role
2. **Duplicate role** → Member already has this role/scope combo
3. **Invalid scope** → Scope value doesn't exist
4. **Database constraint violation** → Check UNIQUE constraint

**Debug:**
```sql
-- Check for existing role
SELECT * FROM member_roles
WHERE member_id = '{member_id}'
  AND role_code = '{role_code}'
  AND scope_type = '{scope_type}'
  AND scope_value = '{scope_value}'
  AND status = 'active';
-- If found → Role already exists, must update instead
```

### Problem: Acting Role Not Working

**Check:**
1. Verify acting role fields set:
   ```sql
   SELECT is_acting_role, acting_for_member_id, 
          acting_start_date, acting_end_date
   FROM member_roles
   WHERE member_id = '{member_id}'
     AND is_acting_role = TRUE;
   ```

2. Check if acting period expired:
   ```sql
   SELECT * FROM member_roles
   WHERE is_acting_role = TRUE
     AND acting_end_date < CURRENT_DATE
     AND status = 'active';
   -- Should return 0 rows (system should auto-expire)
   ```

---

## Migration from Old System

### If You Have Existing Role Assignments

The system handles backward compatibility automatically:

**Old Role Codes (Still Work):**
- `super_admin` → Maps to `admin`
- `guest` → Maps to `member`
- `union_officer` → Maps to `officer`
- `union_steward` → Maps to `steward`
- `local_president` → Maps to `president`

**No Changes Required** - Old codes continue to work

### Upgrade Strategy

**Recommended Approach:**
1. Leave existing assignments as-is initially
2. For new assignments, use new role codes
3. During next election cycle, upgrade executives:
   - Find members with `officer` who are actually President → Assign `president`
   - Find members with `officer` who are actually VP → Assign `vice_president`
4. Migrate remaining roles gradually

**Mass Upgrade Query (Review First!):**
```sql
-- Find officers who should be upgraded
SELECT 
  om.id, 
  om.name, 
  om.email,
  om.role AS current_role,
  CASE 
    WHEN om.name ILIKE '%president%' THEN 'president'
    WHEN om.name ILIKE '%vice%' THEN 'vice_president'
    WHEN om.name ILIKE '%treasurer%' THEN 'secretary_treasurer'
    WHEN om.name ILIKE '%chief%steward%' THEN 'chief_steward'
    ELSE om.role
  END AS suggested_role
FROM organization_members om
WHERE om.role = 'officer'
  AND om.status = 'active';
  
-- ⚠️ REVIEW OUTPUT BEFORE RUNNING UPDATE!
```

---

## FAQs

**Q: Can a member have both "president" and "admin" roles?**  
A: Technically yes, but **not recommended**. President should use `president` role only. `admin` should be reserved for IT staff.

**Q: What's the difference between "officer" and "president"?**  
A: `president` is the elected chief executive (CBA signatory). `officer` is a generic board member. President has higher authority (90 vs 60).

**Q: Do I need to assign "member" role explicitly?**  
A: No. All users have member-level permissions by default. Only assign `member` role if moving someone DOWN from a higher role.

**Q: Can a steward view all claims org-wide?**  
A: Depends on scope. If `scope_type: "global"` → Yes. If `scope_type: "department"` → Only that department. Most stewards should be department-scoped.

**Q: How do I remove someone's role?**  
A: Set `member_roles.status = 'expired'` or `end_date = CURRENT_DATE`. They revert to base member permissions.

**Q: What happens if term expires automatically?**  
A: System changes status to "expired", permissions removed immediately. Admin receives notification to reassign role after election.

**Q: Can I create custom roles?**  
A: Future feature. Currently, use one of the 10 standard roles. Contact support if you need custom roles.

---

## Support & Resources

**Documentation:**
- RBAC Implementation Guide: `docs/security/RBAC_IMPLEMENTATION.md`
- RBAC Gap Closure Report: `docs/security/RBAC_GAP_CLOSURE_REPORT.md`
- Permission Reference: `lib/auth/roles.ts`

**Database Reference:**
- Role Definitions: `role_definitions` table
- Role Assignments: `member_roles` table
- Migration History: `database/migrations-archive-raw-sql/008_enhanced_rbac_schema.sql`

**Need Help?**
- Check: Troubleshooting section above
- Review: Database validation queries in Gap Closure Report
- Contact: System Administrator or IT Support

---

**Document Version:** 2.0  
**Last Updated:** February 11, 2026  
**Status:** Production Ready
