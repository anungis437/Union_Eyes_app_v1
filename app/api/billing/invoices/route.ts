/**
 * Billing Invoices API
 * 
 * POST /api/billing/invoices
 * Lists Stripe invoices for a customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as const,
});

// Validation schema for POST body
const listInvoicesBodySchema = z.object({
  customer_id: z.string().min(1, 'customer_id is required'),
  limit: z.number().min(1).max(100).default(10),
  starting_after: z.string().optional(),
});

// Validation schema for GET query
const listInvoicesQuerySchema = z.object({
  customer_id: z.string().min(1, 'customer_id parameter is required'),
  limit: z.string().default('10').transform(v => Math.min(parseInt(v), 100)),
  starting_after: z.string().optional(),
});

export const POST = withEnhancedRoleAuth(60, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = listInvoicesBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      const { customer_id, limit, starting_after } = body;

      // List invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: customer_id,
        limit,
        starting_after: starting_after,
      });

      // Map Stripe invoices to response format
      const formattedInvoices = invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        pdf_url: invoice.invoice_pdf || null,
        created: invoice.created,
        paid: invoice.paid,
        due_date: invoice.due_date,
        description: invoice.description,
      }));

      logger.info('Listed invoices', {
        userId,
        customerId: customer_id,
        count: formattedInvoices.length,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/billing/invoices',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          customerId: customer_id,
          invoicesCount: formattedInvoices.length,
        },
      });

      return NextResponse.json({
        invoices: formattedInvoices,
        has_more: invoices.has_more,
      });
    } catch (error) {
      logger.error('Failed to list invoices', { userId, error });
      
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/billing/invoices',
        method: 'POST',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to list invoices',
      error
    );
    }
});

export const GET = withEnhancedRoleAuth(60, async (request, context) => {
  const parsed = listInvoicesQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters',
      error
    );
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      const { customer_id, limit, starting_after } = query;

      // List invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: customer_id,
        limit,
        starting_after: starting_after || undefined,
      });

      // Map Stripe invoices to response format
      const formattedInvoices = invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        pdf_url: invoice.invoice_pdf || null,
        created: invoice.created,
        paid: invoice.paid,
        due_date: invoice.due_date,
        description: invoice.description,
      }));

      logger.info('Retrieved invoices', {
        userId,
        customerId: customer_id,
        count: formattedInvoices.length,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/billing/invoices',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          customerId: customer_id,
          invoicesCount: formattedInvoices.length,
        },
      });

      return NextResponse.json({
        invoices: formattedInvoices,
        has_more: invoices.has_more,
      });
    } catch (error) {
      logger.error('Failed to retrieve invoices', { userId, error });
      
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/billing/invoices',
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve invoices',
      error
    );
    }
});


