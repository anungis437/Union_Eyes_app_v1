# Admin Settings - Complete Overview

**Union Claims Management System**

## 🎯 What's New

The **Admin Settings** page (`/admin/settings`) has been completely redesigned to provide super administrators with **full visibility** into all available pages, tools, and system management capabilities.

### ✅ Enhanced Features

1. **Admin Tools Quick Access** - Direct links to all admin pages
2. **Role & Permission Management** - Visual overview of all user roles
3. **System Monitoring** - Health checks and status indicators
4. **Database Management Tools** - Query, export, import, and backup options
5. **API Documentation** - Complete list of all API endpoints
6. **Security & Audit Logs** - Recent security events and audit trail
7. **System Information** - Version, status, and uptime metrics

---

## 🗺️ Admin Navigation Map

### Main Dashboard Pages

| Page | Route | Permission Required | Description |
|------|-------|---------------------|-------------|
| **Admin Dashboard** | `/admin` | `VIEW_ADMIN_PANEL` | System overview with key metrics |
| **Claims Management** | `/admin/claims` | `VIEW_ALL_CLAIMS` | View and manage all claims |
| **User Management** | `/admin/members` | `MANAGE_USERS` | Manage users, roles, permissions |
| **Voting Administration** | `/admin/voting` | `MANAGE_VOTING` | Create and manage voting sessions |
| **Advanced Analytics** | `/admin/analytics` | `VIEW_ADVANCED_ANALYTICS` | Deep insights and reports |
| **System Settings** | `/admin/settings` | `SYSTEM_SETTINGS` | **Current page** - All admin tools |

### Member Dashboard Pages

| Page | Route | Permission Required | Description |
|------|-------|---------------------|-------------|
| **Dashboard** | `/dashboard` | None (all users) | Personal dashboard |
| **My Claims** | `/dashboard/claims` | `VIEW_OWN_CLAIMS` | Submit and track personal claims |
| **Collective Agreements** | `/dashboard/collective-agreements` | `VIEW_CBA` | Search CBA documents |
| **Voting** | `/voting` | `VIEW_VOTING` | View and cast votes |
| **Members** | `/dashboard/members` | `VIEW_ALL_MEMBERS` | View all union members |
| **Analytics** | `/dashboard/analytics` | `VIEW_ANALYTICS` | View analytics dashboard |
| **Settings** | `/dashboard/settings` | None (all users) | Personal account settings |

---

## 👥 Role Hierarchy & Access

### Admin (Highest Level)

- **Full System Access** - All pages and features
- **Permissions**: All 40+ permissions
- **Can Access**:
  - All admin pages (`/admin/*`)
  - All dashboard pages
  - User role management
  - System settings and configuration
  - Advanced analytics and reports
  - Security and audit logs

### Union Rep (High Level)

- **Voting & Claims Management**
- **Permissions**: All except user management
- **Can Access**:
  - Admin dashboard and analytics
  - Voting administration
  - All claims management
  - All member viewing
  - Cannot manage user roles

### Staff Rep (Medium Level)

- **View All Members & Claims**
- **Permissions**: View-all permissions, no admin
- **Can Access**:
  - Dashboard with all sections
  - View all members and claims
  - Analytics dashboard
  - Cannot access `/admin` panel

### Member (Low Level)

- **Submit Claims & Vote**
- **Permissions**: Basic member operations
- **Can Access**:
  - Personal dashboard
  - Submit and track own claims
  - Vote in sessions
  - View CBAs
  - Cannot see other members or analytics

### Guest (Minimal Level)

- **View Only Access**
- **Permissions**: Read-only
- **Can Access**:
  - View dashboard (read-only)
  - View CBA documents
  - Cannot submit claims or vote

---

## 🔧 System Tools Available

### 1. Database Management

Located in: `/admin/settings` → System Monitoring section

**Available Tools:**

- **Query Database** - Run SQL queries with safety checks
- **Export Data** - Export tables to CSV, JSON, or SQL
- **Import Data** - Bulk import users, claims, or other data
- **Backup Manager** - Schedule and restore backups

**Access**: Admin only (`SYSTEM_SETTINGS` permission)

### 2. User Role Management

Located in: `/admin/members`

**Capabilities:**

- View all users in the system
- Change user roles (Admin, Union Rep, Staff Rep, Member, Guest)
- Assign/revoke specific permissions
- Deactivate or remove users
- Bulk role updates

**Access**: Admin only (`MANAGE_USERS` permission)

### 3. System Monitoring

Located in: `/admin/settings` → System Health section

**Monitors:**

- Database connection status
- API service health
- Authentication service status
- Real-time active users
- System uptime and performance

**Access**: Admin and Union Rep (`VIEW_ADMIN_PANEL` permission)

### 4. Analytics & Reports

Located in: `/admin/analytics`

**Available Reports:**

- Claims analytics (status, trends, LRO workload)
- Member engagement metrics
- Voting participation rates
- System usage statistics
- Custom date range filtering

**Access**: Admin and Union Rep (`VIEW_ADVANCED_ANALYTICS` permission)

### 5. Security & Audit

Located in: `/admin/settings` → Security & Audit section

**Features:**

- Recent login attempts (successful and failed)
- Role change history
- Permission modifications
- Suspicious activity alerts
- Export security reports

**Access**: Admin only (`SYSTEM_SETTINGS` permission)

---

## 🌐 API Endpoints Reference

All API endpoints available in the system (documented in `/admin/settings`):

### Authentication

```
GET  /api/auth/role              - Fetch current user role and permissions
POST /api/auth/session           - Manage user sessions
```

### Claims Management

```
GET    /api/claims               - List all claims (filtered by role)
POST   /api/claims               - Create new claim
GET    /api/claims/:id           - Get specific claim details
PATCH  /api/claims/:id           - Update claim (status, assignment, etc.)
DELETE /api/claims/:id           - Delete claim (admin only)
```

### Analytics

```
GET /api/analytics/dashboard     - Dashboard metrics (claims, members, activity)
GET /api/analytics/claims        - Claims-specific analytics
GET /api/analytics/voting        - Voting participation metrics
GET /api/analytics/members       - Member engagement data
```

### Voting System

```
GET  /api/voting                 - List all voting sessions
POST /api/voting                 - Create new voting session (admin)
POST /api/voting/vote            - Cast a vote
GET  /api/voting/:id/results     - Get voting results
```

### CBA Management

```
GET /api/cba/search              - Search collective bargaining agreements
GET /api/cba/precedents          - Search CBA precedents
GET /api/cba/:id                 - Get specific CBA document
```

### User Management

```
GET   /api/user/status           - Get current user profile and status
PATCH /api/user/profile          - Update user profile
GET   /api/users                 - List all users (admin only)
PATCH /api/users/:id/role        - Change user role (admin only)
```

**Documentation**: Each endpoint's full documentation with request/response schemas is available in `/admin/settings` → API & Integration Tools section.

---

## 🔐 Permission Matrix

Complete mapping of permissions to roles:

| Permission | Admin | Union Rep | Staff Rep | Member | Guest |
|------------|:-----:|:---------:|:---------:|:------:|:-----:|
| **Claims Permissions** |
| VIEW_OWN_CLAIMS | ✅ | ✅ | ✅ | ✅ | ❌ |
| CREATE_OWN_CLAIMS | ✅ | ✅ | ✅ | ✅ | ❌ |
| UPDATE_OWN_CLAIMS | ✅ | ✅ | ✅ | ✅ | ❌ |
| DELETE_OWN_CLAIMS | ✅ | ✅ | ✅ | ✅ | ❌ |
| VIEW_ALL_CLAIMS | ✅ | ✅ | ✅ | ❌ | ❌ |
| MANAGE_ALL_CLAIMS | ✅ | ✅ | ❌ | ❌ | ❌ |
| ASSIGN_CLAIMS | ✅ | ✅ | ❌ | ❌ | ❌ |
| DELETE_ANY_CLAIM | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Member Permissions** |
| VIEW_ALL_MEMBERS | ✅ | ✅ | ✅ | ❌ | ❌ |
| MANAGE_USERS | ✅ | ❌ | ❌ | ❌ | ❌ |
| ASSIGN_ROLES | ✅ | ❌ | ❌ | ❌ | ❌ |
| VIEW_MEMBER_DETAILS | ✅ | ✅ | ✅ | ❌ | ❌ |
| EXPORT_MEMBER_DATA | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Voting Permissions** |
| VIEW_VOTING | ✅ | ✅ | ✅ | ✅ | ❌ |
| CREATE_VOTING | ✅ | ✅ | ❌ | ❌ | ❌ |
| MANAGE_VOTING | ✅ | ✅ | ❌ | ❌ | ❌ |
| CAST_VOTE | ✅ | ✅ | ✅ | ✅ | ❌ |
| **CBA Permissions** |
| VIEW_CBA | ✅ | ✅ | ✅ | ✅ | ✅ |
| SEARCH_CBA | ✅ | ✅ | ✅ | ✅ | ✅ |
| UPLOAD_CBA | ✅ | ✅ | ❌ | ❌ | ❌ |
| MANAGE_CBA | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Analytics Permissions** |
| VIEW_ANALYTICS | ✅ | ✅ | ✅ | ❌ | ❌ |
| VIEW_ADVANCED_ANALYTICS | ✅ | ✅ | ❌ | ❌ | ❌ |
| EXPORT_ANALYTICS | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Admin Permissions** |
| VIEW_ADMIN_PANEL | ✅ | ✅ | ❌ | ❌ | ❌ |
| SYSTEM_SETTINGS | ✅ | ❌ | ❌ | ❌ | ❌ |
| VIEW_AUDIT_LOGS | ✅ | ❌ | ❌ | ❌ | ❌ |
| MANAGE_NOTIFICATIONS | ✅ | ✅ | ❌ | ❌ | ❌ |

**Total Permissions**: 40+ granular permissions

---

## 🚀 Quick Access Guide

### As Super Admin, You Can

1. **View All Pages**
   - Navigate to `/admin/settings` to see all available pages with quick links
   - Click any admin tool card to jump directly to that section

2. **Manage User Roles**
   - Go to `/admin/members`
   - Click on any user to change their role
   - View permission matrix in `/admin/settings`

3. **Monitor System Health**
   - Check system status in `/admin/settings` → System Health
   - View active users, database status, API health
   - Access audit logs for security events

4. **Access Database Tools**
   - Query database directly (with safety checks)
   - Export/import data for backups or migrations
   - Schedule automated backups

5. **View API Documentation**
   - All endpoints listed in `/admin/settings` → API Tools
   - Generate API keys for external integrations
   - Test endpoints directly from settings page

6. **Review Security & Audit**
   - See recent login attempts (successful and failed)
   - Track role changes and permission modifications
   - Export security reports for compliance

---

## 📋 Navigation Checklist

### Admin Dashboard

- [ ] Can access `/admin` dashboard
- [ ] See system overview and key metrics
- [ ] Quick actions work correctly

### Claims Management

- [ ] Can access `/admin/claims`
- [ ] View all claims in the system
- [ ] Assign claims to LROs
- [ ] Change claim status

### User Management

- [ ] Can access `/admin/members`
- [ ] View all users and their roles
- [ ] Change user roles (promote/demote)
- [ ] Deactivate users if needed

### Voting Administration

- [ ] Can access `/admin/voting`
- [ ] Create new voting sessions
- [ ] View voting results
- [ ] Close voting sessions

### Advanced Analytics

- [ ] Can access `/admin/analytics`
- [ ] View detailed reports
- [ ] Export analytics data
- [ ] Filter by date ranges

### System Settings (Current Page)

- [ ] Can access `/admin/settings`
- [ ] See all admin tools overview
- [ ] Access role management section
- [ ] View system health monitors
- [ ] See API documentation
- [ ] Review security audit logs

---

## 🔍 Troubleshooting

### Can't See Admin Panel in Navigation

**Issue**: "Settings" link doesn't show admin pages

**Solution**:

1. Check your role: `fetch('/api/auth/role').then(r => r.json()).then(console.log)`
2. Verify you have `admin` or `union_rep` role
3. If not, run SQL to update your role:

   ```sql
   UPDATE user_management.organization_users 
   SET role = 'admin' 
   WHERE user_id = 'your_user_id';
   ```

### Admin Tools Not Visible

**Issue**: Admin settings page doesn't show tools

**Solution**:

1. Clear browser cache (Ctrl+Shift+R)
2. Check dev server is running without errors
3. Verify `/admin/settings` route is accessible
4. Check browser console for permission errors

### Role Changes Not Taking Effect

**Issue**: Changed user role but navigation doesn't update

**Solution**:

1. User must log out and log back in
2. Or refresh the page to reload role from API
3. Check database was actually updated:

   ```sql
   SELECT user_id, role FROM user_management.organization_users WHERE user_id = 'user_id';
   ```

### Database UUID Error

**Issue**: Seeing "invalid input syntax for type uuid" errors

**Note**: This is a known issue where Clerk user IDs (format: `user_xxxxx`) don't match PostgreSQL UUID format. This is being handled with fallback to Clerk metadata. The settings page will still work correctly.

---

## 📚 Additional Resources

- **Full RBAC Documentation**: `/docs/RBAC_DOCUMENTATION.md`
- **Testing Guide**: `/docs/RBAC_TESTING_GUIDE.md`
- **Role Utilities**: `/lib/auth/roles.ts`
- **Server Guards**: `/lib/auth/rbac-server.ts`
- **Client Hooks**: `/lib/auth/rbac-hooks.ts`

---

## ✅ Success Criteria

**You have full visibility when you can:**

- ✅ See all 6 admin tool cards on `/admin/settings`
- ✅ Access each admin page by clicking the cards
- ✅ View complete role hierarchy with all 5 roles
- ✅ See permission categories (Claims, Members, Voting, CBA, Admin)
- ✅ Monitor system health (Database, API, Auth status)
- ✅ Access database management tools
- ✅ View all API endpoints documentation
- ✅ Review security audit logs
- ✅ See system information (version, uptime, active users)

**Current Status**: ✅ **All Admin Tools Visible - Full System Access Enabled**

---

Last Updated: November 12, 2025
Admin Settings Version: 2.0
