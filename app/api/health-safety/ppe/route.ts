/**
 * Health & Safety PPE (Personal Protective Equipment) API Routes
 * 
 * PPE inventory management and distribution tracking.
 * Tracks equipment issuance, returns, inspections, and expiry.
 * 
 * Authentication: Minimum role level 30 (health_safety_rep)
 * RLS: Organization-level isolation enforced by database policies
 */


import { z } from "zod";
import { ppeEquipment } from "@/db/schema/domains/health-safety/health-safety-schema";
import { eq, desc, and, or, like, sql, lte } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limiter";
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

/**
 * Validation schema for recording PPE distribution
 */
const recordDistributionSchema = z.object({
  itemNumber: z.string().optional(), // If updating existing item
  ppeType: z.enum([
    'hard_hat', 'safety_glasses', 'face_shield', 'hearing_protection',
    'respirator', 'dust_mask', 'safety_gloves', 'chemical_gloves',
    'safety_boots', 'high_vis_vest', 'fall_protection', 'welding_helmet',
    'protective_clothing', 'coveralls', 'apron', 'other'
  ]),
  itemName: z.string().min(3, 'Item name required'),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  
  // Distribution
  issuedToId: z.string().uuid(),
  issuedToName: z.string(),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
  
  // Inventory
  quantityIssued: z.number().int().min(1).default(1),
  storageLocation: z.string().optional(),
  
  // Lifecycle
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().min(0).optional(),
  expiryDate: z.string().optional(),
  
  // Compliance
  certificationStandard: z.string().optional(),
  csaApproved: z.boolean().optional(),
  
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/health-safety/ppe
 * List PPE inventory with filtering
 * 
 * Query parameters:
 * - status: Filter by status (in_stock, issued, in_use, etc.)
 * - ppeType: Filter by equipment type
 * - issuedToId: Filter by person issued to
 * - expiringWithinDays: Show items expiring within N days
 * - lowStock: Show items below reorder level (true/false)
 * - search: Search in item name, serial number
 * - limit: Number of results (default 100, max 500)
 * - offset: Pagination offset
 */
export const GET = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const ppeType = searchParams.get("ppeType");
    const issuedToId = searchParams.get("issuedToId");
    const expiringWithinDays = searchParams.get("expiringWithinDays");
    const lowStock = searchParams.get("lowStock");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    return withRLSContext(async (tx) => {
      // Build query conditions
      const conditions = [];
      
      if (status) {
        conditions.push(eq(ppeEquipment.status, status));
      }
      
      if (ppeType) {
        conditions.push(eq(ppeEquipment.ppeType, ppeType));
      }
      
      if (issuedToId) {
        conditions.push(eq(ppeEquipment.issuedToId, issuedToId));
      }
      
      if (expiringWithinDays) {
        const days = parseInt(expiringWithinDays);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        conditions.push(
          and(
            lte(ppeEquipment.expiryDate, futureDate.toISOString().split('T')[0])
          ) as SQL<unknown> | undefined
        );
      }
      
      if (lowStock === 'true') {
        // Find items where quantity in stock is below reorder level
        conditions.push(
          sql`${ppeEquipment.quantityInStock} <= ${ppeEquipment.reorderLevel}`
        );
      }
      
      if (search) {
        conditions.push(
          or(
            like(ppeEquipment.itemNumber, `%${search}%`),
            like(ppeEquipment.itemName, `%${search}%`),
            like(ppeEquipment.serialNumber, `%${search}%`)
          ) as SQL<unknown> | undefined
        );
      }

      // Execute query
      const result = await tx
        .select()
        .from(ppeEquipment)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ppeEquipment.createdAt))
        .limit(limit)
        .offset(offset);

      // Count total
      const totalResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(ppeEquipment)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult[0]?.count || 0;

      // Calculate summary stats
      const statsResult = await tx
        .select({
          totalInStock: sql<number>`sum(${ppeEquipment.quantityInStock})`,
          totalIssued: sql<number>`sum(${ppeEquipment.quantityIssued})`,
          lowStockItems: sql<number>`count(*) filter (where ${ppeEquipment.quantityInStock} <= ${ppeEquipment.reorderLevel})`,
        })
        .from(ppeEquipment)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/health-safety/ppe',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'HEALTH_SAFETY',
        details: { organizationId, count: result.length, total },
      });

      return standardSuccessResponse({
        items: result,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        summary: statsResult[0] || { totalInStock: 0, totalIssued: 0, lowStockItems: 0 },
      });
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/health-safety/ppe',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch PPE inventory',
      error
    );
  }
});

/**
 * POST /api/health-safety/ppe
 * Record PPE distribution or add new inventory item
 * 
 * Rate limited: 50 distributions per hour per user
 */
export const POST = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(userId, {
      limit: 50,
      window: 3600,
      identifier: 'ppe-distribute'
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        standardErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded. Try again in ${rateLimitResult.resetIn} seconds`
        ),
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Parse and validate
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body'
      );
    }

    const parsed = recordDistributionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { errors: parsed.error.errors }
      );
    }

    const data = parsed.data;

    return withRLSContext(async (tx) => {
      // Generate unique item number if not provided
      let itemNumber = data.itemNumber;
      if (!itemNumber) {
        const year = new Date().getFullYear();
        const countResult = await tx
          .select({ count: sql<number>`count(*)` })
          .from(ppeEquipment)
          .where(
            sql`EXTRACT(YEAR FROM ${ppeEquipment.createdAt}) = ${year}`
          );
        
        const count = (countResult[0]?.count || 0) + 1;
        itemNumber = `PPE-${year}-${String(count).padStart(5, '0')}`;
      }

      // Create PPE record
      const [item] = await tx
        .insert(ppeEquipment)
        .values({
          organizationId,
          itemNumber,
          ppeType: data.ppeType,
          itemName: data.itemName,
          description: data.description,
          manufacturer: data.manufacturer,
          model: data.model,
          size: data.size,
          
          status: 'issued',
          storageLocation: data.storageLocation,
          quantityInStock: 0,
          quantityIssued: data.quantityIssued,
          
          issuedToId: data.issuedToId,
          issuedToName: data.issuedToName,
          issuedDate: data.issuedDate,
          issuedById: userId,
          
          purchaseDate: data.purchaseDate,
          purchaseCost: data.purchaseCost ? String(data.purchaseCost) : null,
          expiryDate: data.expiryDate,
          
          certificationStandard: data.certificationStandard,
          csaApproved: data.csaApproved,
          
          metadata: data.metadata,
          notes: data.notes,
          
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/health-safety/ppe',
        method: 'POST',
        eventType: 'create',
        severity: 'low',
        dataType: 'HEALTH_SAFETY',
        details: { 
          organizationId, 
          itemNumber,
          ppeType: data.ppeType,
          issuedTo: data.issuedToName,
          quantity: data.quantityIssued,
        },
      });

      return standardSuccessResponse({ item }, 201);
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/health-safety/ppe',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to record PPE distribution',
      error
    );
  }
});
