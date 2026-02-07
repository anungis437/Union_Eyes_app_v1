/**
 * API SECURITY MIGRATION GUIDE
 * 
 * This document shows how to migrate existing API routes to use the new
 * security middleware. Start with the most critical routes (admin, voting,
 * financial) and expand systematically.
 */

// ============================================================================
// PATTERN 1: Basic Secure API with Auth Only
// ============================================================================
// Use for: Any route that needs authentication + SQL injection check

// BEFORE:
export async function GET_BEFORE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Your handler logic
  return NextResponse.json({});
}

// AFTER:
import { withSecureAPI } from '@/lib/middleware/api-security';

export const GET = withSecureAPI(
  async (request, user) => {
    // user.id is guaranteed to be set
    // SQL injection patterns automatically checked
    // Environment validated at startup
    return NextResponse.json({});
  }
);

// ============================================================================
// PATTERN 2: Validate Request Body (POST/PATCH)
// ============================================================================
// Use for: Routes accepting JSON body - validates + sanitizes input

// BEFORE:
export async function POST_BEFORE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await request.json();
  
  // Manual validation
  if (!body.email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  if (!body.name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  
  // Your logic
  return NextResponse.json({});
}

// AFTER:
import { withValidatedBody } from '@/lib/middleware/api-security';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(255),
});

export const POST = withValidatedBody(
  createUserSchema,
  async (request, user, body) => {
    // body is guaranteed valid per schema
    // body.email and body.name are typed and validated
    return NextResponse.json({});
  }
);

// ============================================================================
// PATTERN 3: Validate Query Parameters (GET with filters)
// ============================================================================
// Use for: GET routes with query parameters - validates + prevents injection

// BEFORE:
export async function GET_BEFORE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  if (page < 1 || limit < 1 || limit > 100) {
    return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 });
  }
  
  // Your logic
  return NextResponse.json({});
}

// AFTER:
import { withValidatedQuery } from '@/lib/middleware/api-security';
import { z } from 'zod';

const listUsersSchema = z.object({
  page: z.string().default('1').transform(v => parseInt(v)),
  limit: z.string().default('20').transform(v => parseInt(v)),
  search: z.string().optional(),
});

export const GET = withValidatedQuery(
  listUsersSchema,
  async (request, user, query) => {
    // query.page, query.limit are validated numbers
    // Automatically capped at 100
    return NextResponse.json({});
  }
);

// ============================================================================
// PATTERN 4: Validate Both Body and Query
// ============================================================================
// Use for: Routes with both input types

// AFTER:
import { withValidatedRequest } from '@/lib/middleware/api-security';
import { z } from 'zod';

const searchBodySchema = z.object({
  filters: z.object({
    status: z.enum(['active', 'inactive']).optional(),
    role: z.string().optional(),
  }).optional(),
});

const searchQuerySchema = z.object({
  page: z.string().default('1').transform(v => parseInt(v)),
  limit: z.string().default('20').transform(v => parseInt(v)),
});

export const POST = withValidatedRequest(
  searchBodySchema,
  searchQuerySchema,
  async (request, user, data) => {
    const { body, query } = data;
    // Access validated inputs
    return NextResponse.json({});
  }
);

// ============================================================================
// PATTERN 5: Admin-Only Routes
// ============================================================================
// Use for: Routes requiring admin role

// AFTER:
import { withAdminOnly } from '@/lib/middleware/api-security';

export const DELETE = withAdminOnly(
  async (request, user) => {
    // Only admins reach here
    // All security checks applied
    return NextResponse.json({ success: true });
  }
);

// ============================================================================
// PATTERN 6: Public Routes (No Auth Required)
// ============================================================================
// Use for: Health checks, public stats, webhooks

// AFTER:
import { withPublicAPI } from '@/lib/middleware/api-security';

export const GET = withPublicAPI(
  async (request) => {
    // No authentication required
    // Still checks SQL injection patterns
    // Environment validated
    return NextResponse.json({});
  }
);

// ============================================================================
// MIGRATION PRIORITY
// ============================================================================
/*

PHASE 1 (IMMEDIATE): Admin & Sensitive Routes (15 routes)
---
✅ /api/admin/* (7 routes) - HIGHEST PRIORITY
  - POST /api/admin/users - User management
  - PATCH /api/admin/users/{id} - User updates
  - DELETE /api/admin/users/{id} - User deletion
  - POST /api/admin/organizations - Org management
  - PATCH /api/admin/system/settings - System config
  - POST /api/admin/feature-flags - Feature control
  - POST /api/admin/jobs - Background jobs

✅ /api/voting/* (3 routes) - CRITICAL VOTING  
  - POST /api/voting/sessions - Create voting session
  - PATCH /api/voting/sessions/{id} - Update session
  - DELETE /api/voting/sessions/{id} - Delete session

✅ /api/stripe/* (2 routes) - PAYMENT SECURITY
  - POST /api/stripe/webhooks - Webhook handler
  - POST /api/stripe/checkout - Payment intent

✅ /api/auth/* (3 routes) - AUTHENTICATION ROUTES
  - POST /api/auth/session - Session mgmt
  - POST /api/auth/logout - User logout
  - POST /api/auth/roles - Role assignment

PHASE 2 (WEEK 1): Financial Operations (12 routes)
---
  - POST /api/dues/transactions - Create transaction
  - POST /api/dues/members/{id}/payment - Process payment
  - POST /api/remittances - Create remittance
  - POST /api/strike-funds/{id}/lock - Fund operations
  - POST /api/hardship/apply - Hardship applications
  - POST /api/stipends/calculate - Stipend calculation
  - POST /api/donations - Donation recording
  - And 5 more financial endpoints

PHASE 3 (WEEK 2): Data Management (20 routes)
---
  - POST /api/claims - Create claim
  - PATCH /api/claims/{id} - Update claim
  - DELETE /api/claims/{id} - Delete claim
  - POST /api/members/merge - Member merge
  - POST /api/members/import - Bulk import
  - PATCH /api/members/{id} - Member updates
  - POST /api/organizations/{id}/members - Member assignments
  - And 13 more data management endpoints

PHASE 4 (WEEK 3): Reporting & Analytics (15 routes)
---
  - POST /api/reports - Create report
  - POST /api/exports/pdf - PDF export
  - POST /api/exports/excel - Excel export
  - GET /api/analytics/dashboard - Dashboard data
  - And 11 more reporting endpoints

PHASE 5 (WEEK 4+): Remaining Routes (335+ routes)
---
  - Search endpoints (/api/*/search)
  - Read-only endpoints (lower priority)
  - Integration endpoints gradually

*/

// ============================================================================
// VALIDATION SCHEMAS - REUSABLE
// ============================================================================

import { z } from 'zod';
import { createValidator } from '@/lib/middleware/request-validation';

// Common pagination
export const paginationSchema = z.object({
  page: z.string().default('1').transform(v => parseInt(v)),
  limit: z.string().default('20').transform(v => parseInt(v)),
});

// Common ID validation
export const uuidSchema = z.object({
  id: z.string().uuid(),
});

// Common email validation
export const emailSchema = z.object({
  email: createValidator.email(),
});

// Common password validation
export const passwordSchema = z.object({
  password: createValidator.password({ minLength: 12 }),
});

// Common authentication header
export const authHeaderSchema = z.object({
  Authorization: z.string().regex(/^Bearer\s+/),
});

// ============================================================================
// TESTING MIGRATION
// ============================================================================

/*

When migrating routes, test with:

1. SUCCESS CASE
   curl -X POST http://localhost:3000/api/admin/users \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","name":"John"}'
   
   Expect: 201 Created with user data

2. AUTH FAILED
   curl -X POST http://localhost:3000/api/admin/users \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","name":"John"}'
   
   Expect: 401 Unauthorized

3. VALIDATION FAILED
   curl -X POST http://localhost:3000/api/admin/users \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"email":"invalid-email","name":"John"}'
   
   Expect: 400 Invalid request body with field errors

4. SQL INJECTION ATTEMPT
   curl -X GET "http://localhost:3000/api/admin/users?search=*;DROP TABLE users;--" \
     -H "Authorization: Bearer <token>"
   
   Expect: 400 Request validation failed

5. AUDIT LOG
   Check /logs/security/* for audit trail of all operations

*/

// ============================================================================
// DEPLOYMENT CHECKLIST
// ============================================================================

/*

For each route migration:

□ Update handler to use security wrapper
□ Define validation schema (if body/query params)
□ Test all 5 cases above
□ Verify audit logs appear
□ Check error messages are non-revealing
□ Confirm response times acceptable (< 100ms add)
□ Deploy admin routes first (limited blast radius)
□ Monitor for errors in staging 24 hours
□ Deploy financial routes in batch
□ Monitor audit logs for anomalies
□ Gradually expand to other route categories
□ Team review of audit trails

*/
