# Authentication System Documentation

## Current Setup: Clerk Authentication

UnionEyes uses **Clerk** as the primary authentication provider via `@clerk/nextjs`.

### Why Two Auth Packages?

You may notice both Clerk and Supabase packages in dependencies:

- **`@clerk/nextjs`** (Primary) - Active authentication system
  - Handles user authentication, sessions, and authorization
  - Provides middleware for route protection
  - Manages user metadata and roles
  
- **`@supabase/supabase-js`** (Package dependencies) - Data layer only
  - Used by workspace packages for database operations
  - NOT used for authentication
  - Some packages imported it before Clerk migration

### Architecture

```
User Request
    ↓
Clerk Middleware (middleware.ts)
    ↓
Auth Functions (lib/auth.ts)
    ├── getCurrentUser()
    ├── requireAuth()
    └── hasRole()
    ↓
Application Routes
```

### Key Files

1. **[middleware.ts](../middleware.ts)** - Clerk middleware for route protection
2. **[lib/auth.ts](../lib/auth.ts)** - Auth utility functions and role management
3. **[app/layout.tsx](../app/layout.tsx)** - ClerkProvider wrapper

### Role Hierarchy

Defined in `lib/auth.ts`:

```typescript
export const ROLE_HIERARCHY = {
  super_admin: 100,
  admin: 80,
  steward: 60,
  member: 40,
  guest: 20,
} as const;
```

Higher-level roles inherit permissions of lower-level roles.

### Usage Examples

#### Protect an API Route

```typescript
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const user = await requireAuth();
  // user is guaranteed to exist or error is thrown
}
```

#### Check User Role

```typescript
import { hasRole } from '@/lib/auth';

const isAdmin = await hasRole('admin');
if (isAdmin) {
  // User is admin or super_admin
}
```

#### Multi-Tenant Context

```typescript
import { requireAuthWithTenant } from '@/lib/auth';

const user = await requireAuthWithTenant();
// user.tenantId is guaranteed to exist
```

### Migration Notes

If you need to migrate to a different auth provider:

1. Update `middleware.ts` to use new provider middleware
2. Modify `lib/auth.ts` functions to call new provider APIs
3. Keep function signatures the same to avoid breaking changes
4. Test role hierarchy and tenant isolation

### Environment Variables

Required for Clerk:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### Metadata Structure

User metadata in Clerk:

```typescript
publicMetadata: {
  tenantId: string;
  role: UserRole;
  organizationId?: string;
}
```

### Security Considerations

- ✅ Session tokens are httpOnly cookies managed by Clerk
- ✅ Role checks use server-side functions only
- ✅ Tenant isolation enforced at auth layer
- ⚠️ Never expose `privateMetadata` to client
- ⚠️ Always use `requireAuth()` for protected routes

### Troubleshooting

**Issue:** User shows as unauthenticated

- Check CLERK_SECRET_KEY is set
- Verify ClerkProvider wraps app
- Check middleware matcher patterns

**Issue:** Wrong role permissions

- Verify publicMetadata.role is set in Clerk dashboard
- Check ROLE_HIERARCHY constants
- Review hasRole() logic

**Issue:** Token size errors (431)

- Middleware handles this automatically
- See middleware.ts token reduction logic
