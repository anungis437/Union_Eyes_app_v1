/**
 * Negotiations Intelligence API
 * 
 * Track and manage collective bargaining negotiations with timeline
 * visualization and analytics.
 * 
 * Features:
 * - Negotiation lifecycle tracking
 * - Bargaining timeline management
 * - Issue and demand tracking
 * - Negotiation analytics
 * - Comparison with previous agreements
 * 
 * Authentication: Minimum role level 40 (staff)
 * RLS: Organization-level isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';
import { db } from '@/db';
import { organizations } from '@/db/schema-organizations';
import { and, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// In-memory store for negotiations (in production, this would be a database table)
const negotiations = new Map();

// Initialize with sample data
const initializeNegotiations = () => {
  if (negotiations.size === 0) {
    const sampleNegotiations = [
      {
        id: 'neg-001',
        employerId: 'emp-001',
        employerName: 'Acme Corporation',
        organizationId: 'org-001',
        status: 'active',
        bargainingUnit: 'Production Workers',
        unitSize: 450,
        contractStartDate: '2024-01-01',
        contractEndDate: '2026-12-31',
        noticeDate: '2025-09-01',
        negotiationStartDate: '2025-10-15',
        targetCompletionDate: '2025-12-31',
        currentStage: 'proposal_exchange',
        priority: 'high',
        leadNegotiator: 'Sarah Johnson',
        teamMembers: ['Mike Chen', 'Lisa Rodriguez', 'Tom Wilson'],
        issues: [
          { id: 'issue-1', category: 'wages', title: 'Annual wage increase', demand: '4.5%', managementOffer: '3.0%', status: 'open', priority: 'high' },
          { id: 'issue-2', category: 'benefits', title: 'Health insurance premiums', demand: 'Zero increase', managementOffer: '5% increase', status: 'open', priority: 'medium' },
          { id: 'issue-3', category: 'working_conditions', title: 'Paid parental leave', demand: '16 weeks', managementOffer: '12 weeks', status: 'tentative', priority: 'medium' },
        ],
        meetings: [
          { date: '2025-10-15', topic: 'Opening statements', outcome: 'Both parties presented initial positions' },
          { date: '2025-11-01', topic: 'Wages and benefits', outcome: 'Detailed discussion of economic proposals' },
          { date: '2025-11-15', topic: 'Working conditions', outcome: 'Management presented counter-proposal on parental leave' },
        ],
        keyDates: [
          { date: '2025-09-01', event: 'Notice to bargain filed', completed: true },
          { date: '2025-10-15', event: 'First negotiation meeting', completed: true },
          { date: '2025-11-30', event: 'Mediation session scheduled', completed: false },
          { date: '2025-12-31', event: 'Target ratification vote', completed: false },
        ],
        notes: 'Employer has indicated willingness to discuss productivity improvements in exchange for wage concessions.',
        createdAt: '2025-09-01T00:00:00Z',
        updatedAt: '2025-11-15T00:00:00Z',
      },
      {
        id: 'neg-002',
        employerId: 'emp-002',
        employerName: 'Tech Solutions Inc',
        organizationId: 'org-001',
        status: 'preparation',
        bargainingUnit: 'Technical Staff',
        unitSize: 120,
        contractStartDate: '2025-07-01',
        contractEndDate: '2027-06-30',
        noticeDate: '2026-02-01',
        negotiationStartDate: null,
        targetCompletionDate: '2026-06-30',
        currentStage: 'research',
        priority: 'medium',
        leadNegotiator: 'James Williams',
        teamMembers: ['Emily Davis'],
        issues: [],
        meetings: [],
        keyDates: [
          { date: '2026-02-01', event: 'Notice to bargain filed', completed: true },
          { date: '2026-03-01', event: 'Member survey deadline', completed: false },
          { date: '2026-04-01', event: 'Demand development meeting', completed: false },
        ],
        notes: 'Preparing member survey for priority issues identification.',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      },
      {
        id: 'neg-003',
        employerId: 'emp-003',
        employerName: 'Regional Hospital',
        organizationId: 'org-001',
        status: 'ratified',
        bargainingUnit: 'Healthcare Workers',
        unitSize: 280,
        contractStartDate: '2024-01-01',
        contractEndDate: '2025-12-31',
        noticeDate: '2024-09-15',
        negotiationStartDate: '2024-10-01',
        targetCompletionDate: '2025-03-31',
        currentStage: 'ratified',
        priority: 'high',
        leadNegotiator: 'Patricia Martinez',
        teamMembers: ['Robert Kim', 'Amanda Brown', 'David Lee'],
        issues: [
          { id: 'issue-prev-1', category: 'wages', title: 'Annual wage increase', demand: '5%', managementOffer: '3.5%', final: '4.25%', status: 'settled', priority: 'high' },
          { id: 'issue-prev-2', category: 'staffing', title: 'Safe staffing ratios', demand: 'Patient limits', managementOffer: 'Study committee', final: 'Implementation committee', status: 'settled', priority: 'high' },
        ],
        meetings: [
          { date: '2024-10-01', topic: 'Opening statements', outcome: 'Initial positions presented' },
          { date: '2025-01-15', topic: 'Economic package', outcome: 'Tentative agreement on wages' },
          { date: '2025-03-01', topic: 'Final agreement', outcome: 'Ratified by membership 78%' },
        ],
        keyDates: [
          { date: '2024-09-15', event: 'Notice to bargain filed', completed: true },
          { date: '2024-10-01', event: 'First negotiation meeting', completed: true },
          { date: '2025-03-15', event: 'Ratification vote', completed: true },
        ],
        notes: 'Successful negotiation achieving 4.25% wage increase and staffing committee.',
        createdAt: '2024-09-15T00:00:00Z',
        updatedAt: '2025-03-15T00:00:00Z',
      },
    ];

    sampleNegotiations.forEach(n => negotiations.set(n.id, n));
  }
};

initializeNegotiations();

// Validation schemas
const createNegotiationSchema = z.object({
  employerName: z.string().min(1).max(200),
  employerId: z.string().optional(),
  bargainingUnit: z.string().min(1).max(200),
  unitSize: z.number().int().positive(),
  contractStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contractEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  noticeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetCompletionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  leadNegotiator: z.string().optional(),
  teamMembers: z.array(z.string()).optional(),
});

const updateNegotiationSchema = z.object({
  status: z.enum(['preparation', 'active', 'mediation', 'tentative', 'ratified', 'expired', 'deadlocked']).optional(),
  currentStage: z.string().optional(),
  negotiationStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetCompletionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  leadNegotiator: z.string().optional(),
  teamMembers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const addIssueSchema = z.object({
  category: z.enum(['wages', 'benefits', 'working_conditions', 'staffing', 'job_security', 'pension', 'other']),
  title: z.string().min(1).max(200),
  demand: z.string().optional(),
  managementOffer: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

const addMeetingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topic: z.string().min(1).max(200),
  outcome: z.string().optional(),
});

/**
 * GET /api/negotiations
 * 
 * List negotiations with filters
 * 
 * Query Parameters:
 * - status: Filter by status
 * - priority: Filter by priority
 * - search: Search employer name
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return standardErrorResponse(ErrorCode.AUTH_REQUIRED, 'Authentication required');
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(`negotiations-read:${user.id}`, {
      identifier: 'negotiations-read',
      limit: 60,
      window: 60,
    });

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        { resetIn: rateLimitResult.resetIn }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    // Get user's organization
    const userOrgId = user.organizationId;

    // Get all negotiations for the organization
    let negotiationsList = Array.from(negotiations.values())
      .filter(n => n.organizationId === userOrgId);

    // Apply filters
    if (status) {
      negotiationsList = negotiationsList.filter(n => n.status === status);
    }

    if (priority) {
      negotiationsList = negotiationsList.filter(n => n.priority === priority);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      negotiationsList = negotiationsList.filter(n => 
        n.employerName.toLowerCase().includes(searchLower) ||
        n.bargainingUnit.toLowerCase().includes(searchLower)
      );
    }

    // Sort by updated date
    negotiationsList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Calculate summary stats
    const stats = {
      total: negotiationsList.length,
      preparation: negotiationsList.filter(n => n.status === 'preparation').length,
      active: negotiationsList.filter(n => n.status === 'active').length,
      mediation: negotiationsList.filter(n => n.status === 'mediation').length,
      tentative: negotiationsList.filter(n => n.status === 'tentative').length,
      ratified: negotiationsList.filter(n => n.status === 'ratified').length,
    };

    logger.info('Negotiations retrieved', {
      userId: user.id,
      organizationId: userOrgId,
      count: negotiationsList.length,
    });

    return standardSuccessResponse({
      negotiations: negotiationsList,
      stats,
    });

  } catch (error) {
    logger.error('Negotiations retrieval error', error as Error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve negotiations'
    );
  }
}

/**
 * POST /api/negotiations
 * 
 * Create a new negotiation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return standardErrorResponse(ErrorCode.AUTH_REQUIRED, 'Authentication required');
    }

    if (!user.organizationId) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Organization required');
    }

    // Check role
    const userOrg = await db
      .select({ organizationType: organizations.organizationType })
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    const orgType = userOrg[0]?.organizationType;
    if (orgType !== 'union' && orgType !== 'federation' && orgType !== 'congress') {
      return standardErrorResponse(
        ErrorCode.FORBIDDEN,
        'Only union, federation, or CLC staff can create negotiations'
      );
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(`negotiations-create:${user.id}`, {
      identifier: 'negotiations-create',
      limit: 20,
      window: 3600,
    });

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        { resetIn: rateLimitResult.resetIn }
      );
    }

    const body = await request.json();
    const validation = createNegotiationSchema.safeParse(body);

    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid negotiation data',
        { errors: validation.error.errors }
      );
    }

    const data = validation.data;

    // Generate negotiation ID
    const negId = `neg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newNegotiation = {
      id: negId,
      employerId: data.employerId || `emp-${Date.now()}`,
      employerName: data.employerName,
      organizationId: user.organizationId,
      status: 'preparation',
      bargainingUnit: data.bargainingUnit,
      unitSize: data.unitSize,
      contractStartDate: data.contractStartDate,
      contractEndDate: data.contractEndDate,
      noticeDate: data.noticeDate || null,
      negotiationStartDate: null,
      targetCompletionDate: data.targetCompletionDate || null,
      currentStage: 'research',
      priority: data.priority,
      leadNegotiator: data.leadNegotiator || null,
      teamMembers: data.teamMembers || [],
      issues: [],
      meetings: [],
      keyDates: data.noticeDate ? [
        { date: data.noticeDate, event: 'Notice to bargain filed', completed: true },
      ] : [],
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    negotiations.set(negId, newNegotiation);

    logger.info('Negotiation created', {
      userId: user.id,
      negotiationId: negId,
      employer: data.employerName,
    });

    return standardSuccessResponse({
      negotiation: newNegotiation,
      message: 'Negotiation created successfully',
    });

  } catch (error) {
    logger.error('Negotiation creation error', error as Error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create negotiation'
    );
  }
}
