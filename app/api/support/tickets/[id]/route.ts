/**
 * Support Ticket Detail API Route
 * 
 * Handles individual ticket operations (get, update, delete/close).
 * Part of Phase 2 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 250 (support_agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from '@/lib/api/standardized-responses';
import { getTicketById, updateTicket, closeTicket } from '@/lib/services/support-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  category: z.enum(['technical', 'billing', 'feature_request', 'bug', 'other']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  resolution: z.string().optional(),
  satisfactionRating: z.number().int().min(1).max(5).optional(),
  metadata: z.record(z.any()).optional(),
});

// ============================================================================
// GET /api/support/tickets/[id]
// Get ticket details
// ============================================================================

export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(250, async (request, context) => {
    const { userId } = context;

    try {
      const ticketId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 100,
        window: 60,
        identifier: 'support-ticket-read',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      // Fetch ticket
      const ticket = await getTicketById(ticketId);

      if (!ticket) {
        return standardErrorResponse(
          ErrorCode.NOT_FOUND,
          'Support ticket not found'
        );
      }

      // Audit log
      await logApiAuditEvent({
        action: 'support.ticket.read',
        userId,
        resourceType: 'support_ticket',
        resourceId: ticketId,
        severity: 'info',
      });

      logger.info('Support ticket retrieved', { userId, ticketId });

      return standardSuccessResponse({ ticket });
    } catch (error) {
      logger.error('Error retrieving support ticket', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve support ticket'
      );
    }
  })(request, {});
};

// ============================================================================
// PATCH /api/support/tickets/[id]
// Update ticket
// ============================================================================

export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(250, async (request, context) => {
    const { userId } = context;

    try {
      const ticketId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'support-ticket-update',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      // Validate ticket exists
      const existingTicket = await getTicketById(ticketId);
      if (!existingTicket) {
        return standardErrorResponse(
          ErrorCode.NOT_FOUND,
          'Support ticket not found'
        );
      }

      const body = await request.json();

      // Validate request body
      const validation = updateTicketSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid update data',
          validation.error.errors
        );
      }

      const updates = validation.data;

      // Update ticket
      const updatedTicket = await updateTicket(ticketId, updates, userId);

      // Audit log
      await logApiAuditEvent({
        action: 'support.ticket.updated',
        userId,
        resourceType: 'support_ticket',
        resourceId: ticketId,
        oldValues: existingTicket,
        newValues: updatedTicket,
        severity: 'info',
        metadata: { changes: Object.keys(updates) },
      });

      logger.info('Support ticket updated', { userId, ticketId, changes: Object.keys(updates) });

      return standardSuccessResponse({ ticket: updatedTicket });
    } catch (error) {
      logger.error('Error updating support ticket', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update support ticket'
      );
    }
  })(request, {});
};

// ============================================================================
// DELETE /api/support/tickets/[id]
// Close ticket
// ============================================================================

export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(250, async (request, context) => {
    const { userId } = context;

    try {
      const ticketId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 30,
        window: 60,
        identifier: 'support-ticket-delete',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      // Validate ticket exists
      const existingTicket = await getTicketById(ticketId);
      if (!existingTicket) {
        return standardErrorResponse(
          ErrorCode.NOT_FOUND,
          'Support ticket not found'
        );
      }

      // Close ticket (soft delete)
      const closedTicket = await closeTicket(ticketId, userId);

      // Audit log
      await logApiAuditEvent({
        action: 'support.ticket.closed',
        userId,
        resourceType: 'support_ticket',
        resourceId: ticketId,
        severity: 'info',
        metadata: { ticketNumber: existingTicket.ticketNumber },
      });

      logger.info('Support ticket closed', { userId, ticketId });

      return standardSuccessResponse({ ticket: closedTicket });
    } catch (error) {
      logger.error('Error closing support ticket', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to close support ticket'
      );
    }
  })(request, {});
};
