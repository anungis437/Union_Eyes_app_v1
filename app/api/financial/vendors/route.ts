import { z } from 'zod';
import { db } from '@/services/financial-service/src/db';
import { vendors } from '@/services/financial-service/src/db/schema';
import { and, or, ilike } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

interface AuthUser {
  id: string;
  roleLevel?: number;
}

interface RequestContext {
  organizationId: string;
}

type SQLCondition = SQL<unknown> | undefined;
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const createVendorSchema = z.object({
  vendorName: z.string().min(1).max(255),
  legalName: z.string().max(255).optional(),
  vendorType: z.string().max(100).optional(),
  taxId: z.string().max(50).optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  primaryContactName: z.string().max(255).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().max(50).optional(),
  paymentTerms: z.enum(['net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'due_on_receipt', 'cod']).default('net_30'),
  defaultAccountCode: z.string().max(50).optional(),
  currency: z.string().length(3).default('CAD'),
  creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/financial/vendors
 * List all vendors for the organization
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userLevel = (user as AuthUser).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as RequestContext;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const vendorType = searchParams.get('vendorType');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conditions: SQLCondition[] = [eq(vendors.organizationId, organizationId)];

    if (status) {
      conditions.push(eq(vendors.status, status));
    }

    if (vendorType) {
      conditions.push(eq(vendors.vendorType, vendorType));
    }

    if (search) {
      conditions.push(
        or(
          ilike(vendors.vendorName, `%${search}%`),
          ilike(vendors.email, `%${search}%`),
          ilike(vendors.vendorNumber, `%${search}%`)
        )
      );
    }

    const results = await db
      .select()
      .from(vendors)
      .where(and(...conditions))
      .orderBy(vendors.vendorName)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendors)
      .where(and(...conditions));

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: '/api/financial/vendors',
      method: 'GET',
      eventType: 'read',
      severity: 'low',
      details: { status, vendorType, count: results.length },
    });

    return standardSuccessResponse({
      vendors: results,
      pagination: {
        total: Number(count),
        limit,
        offset,
        hasMore: offset + results.length < Number(count),
      },
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch vendors',
      error
    );
  }
});

/**
 * POST /api/financial/vendors
 * Create a new vendor
 */
export const POST = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userLevel = (user as AuthUser).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as RequestContext;
    const body = await request.json();
    
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error
      );
    }

    const data = parsed.data;

    // Generate vendor number
    const date = new Date();
    const year = date.getFullYear();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendors)
      .where(eq(vendors.organizationId, organizationId));
    const vendorNumber = `VEN-${year}-${String(Number(count) + 1).padStart(5, '0')}`;

    // Create vendor
    const [vendor] = await db.insert(vendors).values({
      organizationId,
      vendorNumber,
      vendorName: data.vendorName,
      legalName: data.legalName,
      vendorType: data.vendorType,
      taxId: data.taxId,
      website: data.website,
      email: data.email,
      phone: data.phone,
      fax: data.fax,
      address: data.address,
      billingAddress: data.billingAddress,
      primaryContactName: data.primaryContactName,
      primaryContactEmail: data.primaryContactEmail,
      primaryContactPhone: data.primaryContactPhone,
      paymentTerms: data.paymentTerms,
      defaultAccountCode: data.defaultAccountCode,
      currency: data.currency,
      creditLimit: data.creditLimit,
      currentBalance: '0.00',
      ytdSpending: '0.00',
      status: 'active',
      notes: data.notes,
      tags: data.tags || [],
      createdBy: user.id,
    }).returning();

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: '/api/financial/vendors',
      method: 'POST',
      eventType: 'create',
      severity: 'medium',
      details: { vendorId: vendor.id, vendorName: data.vendorName },
    });

    return standardSuccessResponse({
      vendor,
      message: 'Vendor created successfully',
    }, 201);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('unique_vendor_name')) {
      return standardErrorResponse(
        ErrorCode.DUPLICATE_ENTRY,
        'A vendor with this name already exists'
      );
    }
    if (errorMessage.includes('unique_vendor_number')) {
      return standardErrorResponse(
        ErrorCode.DUPLICATE_ENTRY,
        'Vendor number conflict - please try again'
      );
    }
    console.error('Error creating vendor:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create vendor',
      error
    );
  }
});
