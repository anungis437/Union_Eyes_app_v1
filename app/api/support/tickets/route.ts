/**
 * Support Tickets API Route
 * 
 * Handles support ticket listing and creation for the operations team.
 * Part of Phase 2 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 250 (support_agent)
 * RLS: Organization-level isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { standardSuccessResponse,
} from '@/lib/api/standardized-responses';
import { createTicket, listTickets, type TicketFilters } from '@/lib/services/support-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum(['technical', 'billing', 'feature_request', 'bug', 'other']),
  organizationId: z.string().uuid().optional(),
  requestorEmail: z.string().email(),
  requestorName: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const listTicketsSchema = z.object({
  status: z.array(z.enum(['open', 'in_progress', 'resolved', 'closed'])).optional(),
  priority: z.array(z.enum(['critical', 'high', 'medium', 'low'])).optional(),
  category: z.array(z.string()).optional(),
  assigned_to: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sla_breached: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// GET /api/support/tickets
// List tickets with filters
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(250, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 100,
        window: 60,
        identifier: 'support-tickets-read',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many ticket read requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      
      // Parse query parameters
      const queryParams = {
        status: searchParams.get('status')?.split(','),
        priority: searchParams.get('priority')?.split(','),
        category: searchParams.get('category')?.split(','),
        assigned_to: searchParams.get('assigned_to') || undefined,
        organization_id: searchParams.get('organization_id') || undefined,
        search: searchParams.get('search') || undefined,
        sla_breached: searchParams.get('sla_breached') === 'true' || undefined,
        limit: parseInt(searchParams.get('limit') || '50'),
        offset: parseInt(searchParams.get('offset') || '0'),
      };

      // Validate query parameters
      const validation = listTicketsSchema.safeParse(queryParams);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          validation.error.errors
        );
      }

      const { limit, offset, ...filters } = validation.data;

      // Build filters object
      const ticketFilters: TicketFilters = {
        status: filters.status,
        priority: filters.priority,
        category: filters.category,
        assignedTo: filters.assigned_to,
        organizationId: filters.organization_id,
        search: filters.search,
        slaBreached: filters.sla_breached,
      };

      // Fetch tickets
      const tickets = await listTickets(ticketFilters, limit, offset);

      // Audit log
      await logApiAuditEvent({
        action: 'support.tickets.list',
        userId,
        resourceType: 'support_ticket',
        severity: 'info',
        metadata: { filters: ticketFilters, count: tickets.length },
      });

      logger.info('Support tickets listed', { userId, count: tickets.length });

      return standardSuccessResponse({
        tickets,
        pagination: {
          limit,
          offset,
          count: tickets.length,
          hasMore: tickets.length === limit,
        },
        filters: ticketFilters,
      });
    } catch (error) {
      logger.error('Error listing support tickets', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to list support tickets'
      );
    }
  })(request, {});
};

// ============================================================================
// POST /api/support/tickets
// Create a new support ticket
// ============================================================================

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(250, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 20,
        window: 60,
        identifier: 'support-tickets-create',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many ticket creation requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const body = await request.json();

      // Validate request body
      const validation = createTicketSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid ticket data',
          validation.error.errors
        );
      }

      const ticketData = validation.data;

      // Create ticket
      const ticket = await createTicket({
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        status: 'open',
        organizationId: ticketData.organizationId,
        requestorEmail: ticketData.requestorEmail,
        requestorName: ticketData.requestorName,
        createdBy: userId,
        metadata: ticketData.metadata,
      });

      // Audit log
      await logApiAuditEvent({
        action: 'support.ticket.created',
        userId,
        resourceType: 'support_ticket',
        resourceId: ticket.id,
        severity: 'info',
        metadata: { ticketNumber: ticket.ticketNumber, priority: ticket.priority },
      });

      logger.info('Support ticket created', {
        userId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
      });

      return standardSuccessResponse(
        { ticket },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Error creating support ticket', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create support ticket'
      );
    }
  })(request, {});
};
