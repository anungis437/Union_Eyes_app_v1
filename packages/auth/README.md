# @courtlens/auth - Unified Authentication System

Centralized authentication, authorization, and audit logging for all 17 CourtLens applications.

## Features

- ✨ **Single Sign-On (SSO)** - One login for all applications
- 🔐 **Role-Based Access Control (RBAC)** - Fine-grained permissions
- 🔄 **Cross-App Session Management** - Seamless navigation between apps
- 📝 **Security Audit Logging** - Complete authentication event tracking
- ⚡ **Automatic Token Refresh** - No interruptions for users
- 🛡️ **Security First** - Built on Supabase Auth

## Installation

```bash
# This is an internal package, used via workspace
pnpm install
```

## Quick Start

### 1. Wrap your application with AuthProvider

```tsx
import { AuthProvider } from '@courtlens/auth';

function App() {
  return (
    <AuthProvider appName="Dashboard">
      <YourApp />
    </AuthProvider>
  );
}
```

### 2. Use the authentication hook

```tsx
import { useAuth } from '@courtlens/auth';

function LoginPage() {
  const { signIn, user, loading } = useAuth();

  const handleLogin = async () => {
    const { error } = await signIn(email, password);
    if (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (user) return <div>Welcome {user.email}!</div>;

  return <button onClick={handleLogin}>Sign In</button>;
}
```

### 3. Check permissions

```tsx
import { useAuth } from '@courtlens/auth';

function MatterActions() {
  const { hasPermission } = useAuth();

  return (
    <div>
      {hasPermission('matters:write') && (
        <button>Edit Matter</button>
      )}
      {hasPermission('matters:delete') && (
        <button>Delete Matter</button>
      )}
    </div>
  );
}
```

## Architecture

```
packages/auth/
├── unified-auth/           # Core authentication
│   ├── AuthProvider.tsx    # React context provider
│   ├── audit-logger.ts     # Security audit logging
│   └── index.ts            # Exports
├── session-manager/        # Session persistence
│   └── index.ts            # JWT & localStorage management
├── rbac/                   # Access control
│   └── index.ts            # Roles & permissions
└── index.ts                # Main entry point
```

## API Reference

### AuthProvider

Provides authentication context to all child components.

**Props:**
- `children: ReactNode` - Child components
- `appName?: string` - Name of the application (for audit logs)

### useAuth Hook

Access authentication state and methods.

**Returns:**
```typescript
{
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{error: Error | null}>;
  signUp: (email: string, password: string, metadata?) => Promise<{error: Error | null}>;
  signOut: () => Promise<{error: Error | null}>;
  resetPassword: (email: string) => Promise<{error: Error | null}>;
  updatePassword: (newPassword: string) => Promise<{error: Error | null}>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  refreshSession: () => Promise<void>;
}
```

### User Roles

- `super_admin` - Platform-wide administrator
- `org_admin` - Organization administrator
- `lawyer` - Legal practitioner
- `paralegal` - Legal assistant
- `support_staff` - Administrative staff
- `client` - External client (view-only)

### Permissions

Permissions follow the pattern `resource:action`:

**Resources:**
- `matters` - Legal matters/cases
- `clients` - Client records
- `documents` - Document management
- `billing` - Billing & invoicing
- `time` - Time tracking
- `reports` - Analytics & reporting
- `admin` - Admin panel
- `settings` - System settings

**Actions:**
- `read` - View resources
- `write` - Create/update resources
- `delete` - Remove resources
- `approve` - Approve changes
- `assign` - Assign to users

**Examples:**
- `matters:read` - View matters
- `matters:write` - Create/edit matters
- `billing:approve` - Approve invoices
- `admin:access` - Access admin panel

### RBAC Utility

```typescript
import { RBAC } from '@courtlens/auth';

// Check permission
RBAC.hasPermission('lawyer', 'matters:write'); // true

// Get all permissions for a role
const permissions = RBAC.getPermissions('paralegal');

// Check action on resource
RBAC.canPerformAction('lawyer', 'write', 'matters'); // true

// Compare roles
RBAC.isHigherRole('lawyer', 'paralegal'); // true
```

### Session Manager

```typescript
import { SessionManager } from '@courtlens/auth';

const sessionManager = SessionManager.getInstance();

// Check authentication
sessionManager.isAuthenticated(); // boolean

// Get tokens
const accessToken = sessionManager.getAccessToken();
const refreshToken = sessionManager.getRefreshToken();

// Get session metadata
const { expiresAt, timeRemaining, needsRefresh } = sessionManager.getSessionMetadata();
```

### Audit Logger

```typescript
import { AuditLogger } from '@courtlens/auth';

const auditLogger = AuditLogger.getInstance();

// Query logs
const logs = await auditLogger.getAuditLogs({
  userId: 'user-id',
  startDate: new Date('2025-01-01'),
  limit: 50
});

// Get user summary
const summary = await auditLogger.getUserAuditSummary('user-id', 30);
// { totalEvents, signInCount, signOutCount, failedAttempts, lastActivity }
```

## Database Schema

Required database tables:

### user_profiles
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  organization_name TEXT,
  role TEXT NOT NULL,
  permissions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### auth_audit_logs
```sql
CREATE TABLE auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  app_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON auth_audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON auth_audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_event ON auth_audit_logs(event_type);
```

## Environment Variables

Required in your `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Security Best Practices

1. **Never expose service role keys** on the client side
2. **Use RLS policies** on all tables
3. **Log all authentication events** for audit compliance
4. **Rotate tokens** before expiry
5. **Use HTTPS** in production
6. **Implement rate limiting** on auth endpoints

## Integration with Apps

### Dashboard App

```tsx
// apps/dashboard/main.tsx
import { AuthProvider } from '@courtlens/auth';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider appName="Dashboard">
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

### Protected Routes

```tsx
import { useAuth } from '@courtlens/auth';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
}
```

### Permission-Based UI

```tsx
import { useAuth } from '@courtlens/auth';

function MatterList() {
  const { hasPermission } = useAuth();

  return (
    <div>
      <h1>Matters</h1>
      {hasPermission('matters:write') && (
        <button>Create New Matter</button>
      )}
      {/* ... */}
    </div>
  );
}
```

## Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@courtlens/auth';

describe('useAuth', () => {
  it('should provide authentication context', async () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeDefined();
  });
});
```

## Troubleshooting

### Session not persisting across apps

1. Check that all apps use the same Supabase URL
2. Verify localStorage is accessible
3. Ensure cookies are not blocked
4. Check browser console for errors

### Permissions not working

1. Verify user_profiles table exists
2. Check that user has assigned role
3. Ensure permissions array is populated
4. Check RBAC definitions match your needs

### Audit logs not appearing

1. Verify auth_audit_logs table exists
2. Check database permissions
3. Look for errors in browser console
4. Ensure Supabase connection is working

## Contributing

This package is part of Phase 2 of the CourtLens platform development. See `docs/phases/PHASE_2_PLANNING.md` for implementation details.

## License

Private - CourtLens Platform

---

**Phase 2 - Week 1 Implementation**  
**Status:** In Progress  
**Last Updated:** October 22, 2025
