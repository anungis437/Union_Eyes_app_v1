# Admin Access Setup Guide

## Problem

The admin panel redirects to dashboard with `error=unauthorized` because:

1. Clerk user IDs (format: `user_xxxxx`) don't match the database UUID column type
2. Role lookup fails, so the system can't identify you as admin

## Solutions

### Option 1: Quick Fix via Clerk Dashboard (Recommended for Testing)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** → Find your user
3. Click on your user → **Metadata** tab
4. Under **Public Metadata**, add:

   ```json
   {
     "role": "admin"
   }
   ```

5. Save and refresh your browser at `http://localhost:3000`

**Pros**: No database changes, immediate effect
**Cons**: Not persistent if you need to manage multiple users or sync with database

---

### Option 2: Database Schema Fix (Recommended for Production)

#### Prerequisites

- Access to your PostgreSQL database
- psql or any PostgreSQL client

#### Steps

1. **Connect to your database**:

   ```bash
   # Using psql
   psql postgresql://postgres:postgres@host.docker.internal:5432/unioneyes
   
   # Or using your Supabase connection
   psql "postgresql://postgres.lzwzyxayfrbdpmlcltjd:[PASSWORD]@aws-1-ca-central-1.pooler.supabase.com:6543/postgres"
   ```

2. **Run the migration**:

   ```bash
   # From the UnionEyes directory
   psql [YOUR_CONNECTION_STRING] -f database/migrations/fix-user-id-type.sql
   ```

   Or manually execute the SQL:

   ```sql
   -- Change column type
   ALTER TABLE user_management.organization_users 
   ALTER COLUMN user_id TYPE VARCHAR(255);
   
   -- Add index for performance
   CREATE INDEX IF NOT EXISTS idx_organization_users_user_id 
   ON user_management.organization_users(user_id);
   
   -- Insert your admin user (replace with your Clerk user ID)
   INSERT INTO user_management.organization_users 
     (tenant_id, user_id, role, is_active, joined_at)
   VALUES
     (
       (SELECT tenant_id FROM tenant_management.tenants LIMIT 1),
       'user_35NlrrNcfTv0DMh2kzBHyXZRtpb', -- Your Clerk user ID
       'admin',
       true,
       NOW()
     )
   ON CONFLICT DO NOTHING;
   ```

3. **Verify the changes**:

   ```sql
   -- Check column type
   SELECT column_name, data_type, character_maximum_length 
   FROM information_schema.columns 
   WHERE table_schema = 'user_management' 
     AND table_name = 'organization_users' 
     AND column_name = 'user_id';
   
   -- Check your user exists
   SELECT * FROM user_management.organization_users 
   WHERE user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb';
   ```

4. **Restart your dev server**:

   ```powershell
   # Stop the current dev server (Ctrl+C)
   cd d:\APPS\union-claims-standalone\UnionEyes
   pnpm run dev
   ```

5. **Test admin access**:
   - Navigate to `http://localhost:3000/dashboard`
   - You should now see "Admin Panel" in the left sidebar
   - Click it to access `/admin/settings`

---

## Finding Your Clerk User ID

Your Clerk user ID is visible in the server logs. Look for lines like:

```
Looking up profile by user ID: user_35NlrrNcfTv0DMh2kzBHyXZRtpb
```

Or find it in:

1. Clerk Dashboard → Users → Click on your user → Copy the User ID
2. Browser console → Check the Clerk user object
3. Server logs when you log in

---

## Verification Checklist

After implementing either solution:

- [ ] Navigate to `http://localhost:3000/dashboard`
- [ ] "Admin Panel" link appears in the left sidebar (below Analytics)
- [ ] Click "Admin Panel" → Should route to `/admin/settings`
- [ ] No "unauthorized" error or redirect
- [ ] Admin control panel loads with all settings sections
- [ ] No UUID errors in server logs

---

## Troubleshooting

### Still getting "unauthorized" error?

1. Check server logs for `Error fetching user role` messages
2. Verify your Clerk user ID matches what's in the database
3. Ensure tenant exists in `tenant_management.tenants` table
4. Clear browser cache and restart dev server

### "Admin Panel" link not showing in sidebar?

1. Verify the schema change was applied: `userId` should be VARCHAR(255), not UUID
2. Check that your role is correctly set in database or Clerk metadata
3. Restart dev server to pick up changes

### Database errors after migration?

1. Check foreign key constraints were properly handled
2. Verify no other tables reference the old UUID format
3. Review the backup table: `user_management.organization_users_backup`

---

## Next Steps After Setup

Once you have admin access:

1. **Test all admin pages**: Overview, Claims Management, Members, Voting Admin, Analytics, Settings
2. **Add other admin users**: Use the admin panel to invite and assign roles
3. **Configure system settings**: Email, notifications, security policies
4. **Review RBAC implementation**: Check role-based navigation is working correctly

---

## Related Files

- **Database Schema**: `db/schema/user-management-schema.ts`
- **Migration SQL**: `database/migrations/fix-user-id-type.sql`
- **RBAC Server Logic**: `lib/auth/rbac-server.ts`
- **Admin Layout**: `app/admin/layout.tsx`
- **Sidebar Navigation**: `components/sidebar.tsx`

---

## Support

If you encounter issues:

1. Check server logs: `terminal output → Look for PostgresError or "Error fetching user role"`
2. Verify database connection: Can you query `tenant_management.tenants`?
3. Test Clerk authentication: Can you log in and see your user ID?
4. Review this guide's troubleshooting section
