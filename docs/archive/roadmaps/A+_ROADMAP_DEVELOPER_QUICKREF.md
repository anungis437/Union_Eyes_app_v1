# A+ Roadmap: Developer Quick Reference

> **TL;DR:** Quick Wins complete! Use these patterns for all new code.

---

## 🚀 Quick Commands

```bash
# Security & Quality Checks
pnpm security:audit-routes          # Full security scan (2 min)
pnpm validate:api-guards            # Check auth guards
pnpm test:coverage                  # Run tests with coverage
pnpm type-check                     # TypeScript validation

# View Results  
pnpm test:coverage:open             # Open coverage in browser
pnpm coverage:summary               # Quick coverage %
cat route-security-audit.json       # Security scan results
```

---

## 📝 Code Patterns (Copy-Paste Ready)

### ✅ API Route with Auth
```typescript
// app/api/your-route/route.ts
import { NextRequest } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { standardSuccessResponse, standardErrorResponse, ErrorCode } from '@/lib/api/standardized-responses';

export const GET = withEnhancedRoleAuth(10, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;
  
  try {
    // Your logic here
    const data = await fetchData(organizationId);
    
    return standardSuccessResponse(data);
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch data'
    );
  }
});
```

### ✅ API Route with Validation
```typescript
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().positive().optional(),
});

export const POST = withEnhancedRoleAuth(10, async (request, context) => {
  try {
    const body = await request.json();
    const validatedData = requestSchema.parse(body);
    
    // Use validatedData...
    return standardSuccessResponse({ success: true });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        { errors: error.errors }
      );
    }
    throw error;
  }
});
```

### ✅ Database Query with RLS
```typescript
import { db } from '@/db';
import { members } from '@/db/schema';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { eq } from 'drizzle-orm';

export const GET = withEnhancedRoleAuth(10, async (request, context) => {
  const { userId, organizationId } = context;
  
  const result = await withRLSContext(userId, async (db) => {
    return await db
      .select()
      .from(members)
      .where(eq(members.organizationId, organizationId));
  });
  
  return standardSuccessResponse({ members: result });
});
```

### ✅ Error Handling (Multiple Patterns)

**Pattern 1: Automatic wrapper**
```typescript
import { withStandardizedErrors } from '@/lib/api/standardized-responses';

export const POST = withStandardizedErrors(async (request) => {
  // Errors automatically caught and standardized
  const data = await riskyOperation();
  return standardSuccessResponse(data);
});
```

**Pattern 2: Manual handling**
```typescript
import { fromError } from '@/lib/api/standardized-responses';

export const POST = async (request: NextRequest) => {
  try {
    const data = await operation();
    return NextResponse.json(data);
  } catch (error) {
    return fromError(error); // Auto-converts to StandardizedError
  }
};
```

**Pattern 3: Specific errors**
```typescript
if (!user) {
  return standardErrorResponse(
    ErrorCode.AUTH_REQUIRED,
    'You must be logged in'
  );
}

if (!hasPermission(user, 'delete:members')) {
  return standardErrorResponse(
    ErrorCode.INSUFFICIENT_PERMISSIONS,
    'You do not have permission to delete members'
  );
}
```

---

## 🔒 Security Checklist

Before committing a new API route, verify:

- [ ] **Auth Guard:** Uses `withEnhancedRoleAuth` or equivalent
- [ ] **RLS Context:** Database queries wrapped in `withRLSContext`
- [ ] **Input Validation:** Uses Zod schema for POST/PUT/PATCH
- [ ] **Standardized Errors:** Returns `standardErrorResponse`
- [ ] **No SQL Injection:** Uses Drizzle ORM, no template literal SQL
- [ ] **No Secrets:** All keys/tokens from environment variables
- [ ] **Rate Limiting:** Auth endpoints have rate limits (if applicable)
- [ ] **Public Routes:** Documented in `lib/public-routes.ts` if needed

---

## 📊 Error Codes Reference

| Code | Status | Use When |
|------|--------|----------|
| `AUTH_REQUIRED` | 401 | User not authenticated |
| `AUTH_INVALID` | 401 | Invalid token/session |
| `AUTH_EXPIRED` | 401 | Token/session expired |
| `FORBIDDEN` | 403 | User authenticated but forbidden |
| `INSUFFICIENT_PERMISSIONS` | 403 | Missing required role/permission |
| `VALIDATION_ERROR` | 400 | Zod validation fails |
| `INVALID_INPUT` | 400 | Generic bad input |
| `MISSING_REQUIRED_FIELD` | 400 | Required field missing |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `CONFLICT` | 409 | State conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Generic server error |
| `DATABASE_ERROR` | 500 | DB operation failed |
| `EXTERNAL_SERVICE_ERROR` | 502 | Third-party API failed |
| `TIMEOUT` | 504 | Operation timed out |

---

## 🧪 Testing Patterns

### Unit Test Template
```typescript
// __tests__/api/your-route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/your-route/route';

describe('GET /api/your-route', () => {
  it('returns data when authenticated', async () => {
    const mockRequest = new Request('http://localhost:3000/api/your-route');
    const mockContext = {
      userId: 'user_123',
      organizationId: 'org_456',
    };
    
    const response = await GET(mockRequest, mockContext);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
  
  it('returns 401 when not authenticated', async () => {
    // Test auth failure
  });
});
```

### Coverage Goal
- **Current:** 70%
- **Target:** 80%
- **Run:** `pnpm test:coverage`

---

## 🚨 Common Issues & Fixes

### Issue: "No authentication guard detected"
```typescript
// ❌ Before
export async function GET(request: NextRequest) { ... }

// ✅ After
export const GET = withEnhancedRoleAuth(10, async (request, context) => { ... });
```

### Issue: "Database query without RLS context"
```typescript
// ❌ Before
const data = await db.select().from(members);

// ✅ After
const data = await withRLSContext(userId, async (db) => {
  return await db.select().from(members);
});
```

### Issue: "Not using standardized error responses"
```typescript
// ❌ Before
return NextResponse.json({ error: 'Failed' }, { status: 500 });

// ✅ After
return standardErrorResponse(ErrorCode.INTERNAL_ERROR, 'Operation failed');
```

### Issue: "Missing input validation"
```typescript
// ❌ Before
const body = await request.json();
// Use body directly

// ✅ After
const schema = z.object({ email: z.string().email() });
const validatedData = schema.parse(body);
```

---

## 🎯 Priority Levels

When fixing issues found by `pnpm security:audit-routes`:

| Severity | Fix Timeline | Priority |
|----------|-------------|----------|
| 🔴 Critical | This week | P0 |
| 🟠 High | Next week | P1 |
| 🟡 Medium | This month | P2 |
| 🟢 Low | This quarter | P3 |

---

## 📈 Current Metrics (Week 2)

```
Security Score:    75/100  (Target: 93+)
Auth Coverage:     80%     (Target: 100%)
RLS Coverage:      99%     (Target: 100%)
Error Standards:   0%      (Target: 100%)
Code Coverage:     70%     (Target: 80%)
```

---

## 🔗 Quick Links

- [Full Implementation Guide](QUICK_WINS_IMPLEMENTATION.md)
- [Executive Summary](A+_ROADMAP_EXECUTIVE_SUMMARY.md)
- [Security Audit Results](route-security-audit.json)
- [Standardized Responses](lib/api/standardized-responses.ts)
- [Auth Guards](lib/api-auth-guard.ts)

---

## 💬 Need Help?

### For Auth Issues
```typescript
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
// See lib/api-auth-guard.ts for all options
```

### For Error Handling
```typescript
import { 
  standardErrorResponse, 
  ErrorCode,
  fromError 
} from '@/lib/api/standardized-responses';
// See lib/api/standardized-responses.ts for all utilities
```

### For Database Queries
```typescript
import { withRLSContext } from '@/lib/db/with-rls-context';
// See lib/db/with-rls-context.ts for patterns
```

---

**Remember:** All new routes MUST use these patterns. Legacy routes will be migrated progressively.

**Last Updated:** February 11, 2026  
**Phase:** Critical Fixes (Week 3-4)
