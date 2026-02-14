/**
 * Policy Template Distribution API
 * 
 * Manages centralized policy packs, procedures, and playbook templates
 * that can be distributed from federations to their affiliates.
 * 
 * Features:
 * - Template versioning
 * - Distribution to specific federations/unions
 * - Required vs optional templates
 * - Compliance tracking
 * - Template usage analytics
 * 
 * Authentication: Minimum role level 160 (fed_staff) or 180 (clc_staff)
 * RLS: Organization-level isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';
import { db } from '@/db';
import { organizations, organizationRelationships } from '@/db/schema-organizations';
import { and, desc, inArray } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// In-memory store for policy templates (in production, this would be a database table)
const policyTemplates = new Map();

// Initialize with sample templates
const initializeTemplates = () => {
  if (policyTemplates.size === 0) {
    const sampleTemplates = [
      {
        id: 'template-grievance-procedure',
        name: 'Standard Grievance Procedure',
        description: 'Template for standardized grievance handling procedures across affiliates',
        category: 'procedures',
        version: '2.1',
        minVersion: '2.0',
        content: {
          sections: [
            { title: 'Intake', steps: ['Receive grievance', 'Acknowledge within 48 hours', 'Initial assessment'] },
            { title: 'Investigation', steps: ['Gather facts', 'Interview parties', 'Review documentation'] },
            { title: 'Resolution', steps: ['Draft response', 'Management meeting', 'Settle or advance'] },
          ],
          timelines: {
            intakeAcknowledgement: 48,
            initialAssessment: 5,
            investigation: 30,
            totalResolution: 45,
          },
        },
        required: true,
        createdBy: 'clc',
        createdAt: '2025-01-15T00:00:00Z',
        updatedAt: '2026-01-10T00:00:00Z',
      },
      {
        id: 'template-member-intake',
        name: 'Member Intake Form',
        description: 'Standardized member onboarding and intake process',
        category: 'onboarding',
        version: '1.5',
        minVersion: '1.0',
        content: {
          requiredFields: ['name', 'employee_id', 'department', 'hire_date', 'contact'],
          optionalFields: ['emergency_contact', 'previous_union', 'skills'],
          workflow: ['submit', 'verify', 'activate', 'welcome'],
        },
        required: true,
        createdBy: 'clc',
        createdAt: '2025-03-01T00:00:00Z',
        updatedAt: '2025-11-20T00:00:00Z',
      },
      {
        id: 'template-health-safety',
        name: 'Health & Safety Incident Report',
        description: 'Standardized incident reporting template for workplace safety',
        category: 'compliance',
        version: '3.0',
        minVersion: '2.5',
        content: {
          sections: [
            { title: 'Incident Details', fields: ['date', 'time', 'location', 'witnesses'] },
            { title: 'Injuries', fields: ['injury_type', 'body_part', 'medical_attention'] },
            { title: 'Root Cause', fields: ['immediate_cause', 'underlying_factors', 'contributing_factors'] },
            { title: 'Corrective Actions', fields: ['immediate_actions', 'long_term_prevention'] },
          ],
          attachments: ['photos', 'witness_statements', 'medical_notes'],
        },
        required: true,
        createdBy: 'clc',
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2025-08-15T00:00:00Z',
      },
      {
        id: 'template-bargaining',
        name: 'Collective Bargaining Preparation',
        description: 'Checklist and template for collective bargaining preparation',
        category: 'bargaining',
        version: '1.2',
        minVersion: '1.0',
        content: {
          phases: [
            { name: 'Research', tasks: ['Analyze current contract', 'Survey members', 'Review industry trends'] },
            { name: 'Demands', tasks: ['Prioritize demands', 'Draft proposals', 'Member vote on priorities'] },
            { name: 'Negotiation', tasks: ['Prepare arguments', 'Legal review', 'Strategy sessions'] },
            { name: 'Settlement', tasks: ['Vote on agreement', 'Communicate results', 'Implement changes'] },
          ],
        },
        required: false,
        createdBy: 'clc',
        createdAt: '2025-02-01T00:00:00Z',
        updatedAt: '2025-09-30T00:00:00Z',
      },
      {
        id: 'template-steward-training',
        name: 'Steward Training Curriculum',
        description: 'Standardized training program for union stewards',
        category: 'training',
        version: '2.0',
        minVersion: '1.5',
        content: {
          modules: [
            { title: 'Union Basics', hours: 4, topics: ['History', 'Structure', 'Rights'] },
            { title: 'Grievance Handling', hours: 8, topics: ['Filing', 'Investigation', 'Representation'] },
            { title: 'Contract Knowledge', hours: 6, topics: ['Reading CBA', 'Key provisions', 'Application'] },
            { title: 'Communication', hours: 4, topics: ['Member relations', 'Documentation', 'Conflict resolution'] },
          ],
          totalHours: 22,
          certificationRequired: true,
        },
        required: false,
        createdBy: 'clc',
        createdAt: '2024-09-01T00:00:00Z',
        updatedAt: '2025-07-15T00:00:00Z',
      },
    ];

    sampleTemplates.forEach(t => policyTemplates.set(t.id, t));
  }
};

initializeTemplates();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  category: z.enum(['procedures', 'onboarding', 'compliance', 'bargaining', 'training', 'governance', 'other']),
  content: z.record(z.any()),
  required: z.boolean().default(false),
  distributionLevel: z.enum(['clc', 'federation', 'union']).default('clc'),
  distributeTo: z.array(z.string().uuid()).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  content: z.record(z.any()).optional(),
  required: z.boolean().optional(),
});

/**
 * GET /api/governance/policy-templates
 * 
 * List available policy templates
 * 
 * Query Parameters:
 * - category: Filter by category
 * - distributed: Filter by distribution status (all, distributed_to_me, available)
 * - search: Search templates
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return standardErrorResponse(ErrorCode.AUTH_REQUIRED, 'Authentication required');
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const distributed = searchParams.get('distributed');
    const search = searchParams.get('search');

    // Rate limiting
    const rateLimitResult = await checkRateLimit(user.id, {
      identifier: 'policy-templates-get',
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

    // Get user's organization
    const userOrgId = user.organizationId;
    if (!userOrgId) {
      return standardErrorResponse(ErrorCode.AUTH_REQUIRED, 'Organization ID required');
    }

    const userOrg = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        organizationType: organizations.organizationType,
      })
      .from(organizations)
      .where(eq(organizations.id, userOrgId))
      .limit(1);

    const userOrgData = userOrg[0];

    // Get user's federation (if any)
    const userFederation = await db
      .select({ parentOrgId: organizationRelationships.parentOrgId })
      .from(organizationRelationships)
      .where(
        and(
          eq(organizationRelationships.childOrgId, userOrgId),
          eq(organizationRelationships.relationshipType, 'affiliate')
        )
      )
      .limit(1);

    const userFedId = userFederation[0]?.parentOrgId;

    // Get all templates
    let templates = Array.from(policyTemplates.values());

    // Filter by category
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }

    // Add distribution/adoption info
    const templatesWithStatus = templates.map(template => {
      const isRelevant = 
        template.distributionLevel === 'clc' ||
        template.distributionLevel === 'federation' && template.distributeTo?.includes(userFedId || '') ||
        template.distributionLevel === 'union' && template.distributeTo?.includes(userOrgId);

      let adoptionStatus = 'available';
      
      if (template.required && isRelevant) {
        adoptionStatus = userOrgData?.organizationType === 'federation' ? 'distributed_required' : 'required';
      }

      return {
        ...template,
        adoptionStatus,
        isRelevant,
      };
    });

    // Filter by distributed status
    if (distributed === 'distributed_to_me') {
      // Show templates relevant to user's org
      const relevantTemplates = templatesWithStatus.filter(t => t.isRelevant);
      
      // Add adoption date if applicable
      return standardSuccessResponse({
        templates: relevantTemplates,
        categories: [...new Set(templates.map(t => t.category))],
        summary: {
          total: relevantTemplates.length,
          required: relevantTemplates.filter(t => t.required && t.isRelevant).length,
          optional: relevantTemplates.filter(t => !t.required && t.isRelevant).length,
        },
      });
    }

    // Get categories
    const categories = [...new Set(templates.map(t => t.category))];

    logger.info('Policy templates retrieved', {
      userId: user.id,
      organizationId: userOrgId,
      templateCount: templates.length,
    });

    return standardSuccessResponse({
      templates: templatesWithStatus,
      categories,
      summary: {
        total: templates.length,
        required: templates.filter(t => t.required).length,
        optional: templates.filter(t => !t.required).length,
      },
    });

  } catch (error) {
    logger.error('Policy templates retrieval error', error as Error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve policy templates'
    );
  }
}

/**
 * POST /api/governance/policy-templates
 * 
 * Create a new policy template (CLC/federation staff only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return standardErrorResponse(ErrorCode.AUTH_REQUIRED, 'Authentication required');
    }

    if (!user.organizationId) {
      return standardErrorResponse(ErrorCode.AUTH_REQUIRED, 'Organization ID required');
    }

    // Check role - only CLC or federation staff can create templates
    const userOrg = await db
      .select({ organizationType: organizations.organizationType })
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    const orgType = userOrg[0]?.organizationType;
    if (orgType !== 'federation' && orgType !== 'congress') {
      return standardErrorResponse(
        ErrorCode.FORBIDDEN,
        'Only federation or CLC staff can create policy templates'
      );
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(user.id, {
      identifier: 'policy-templates-post',
      limit: 10,
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
    const validation = createTemplateSchema.safeParse(body);

    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid template data',
        { errors: validation.error.errors }
      );
    }

    const { name, description, category, content, required, distributionLevel, distributeTo } = validation.data;

    // Generate template ID
    const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newTemplate = {
      id: templateId,
      name,
      description,
      category,
      version: '1.0',
      minVersion: '1.0',
      content,
      required,
      distributionLevel,
      distributeTo,
      createdBy: user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policyTemplates.set(templateId, newTemplate);

    logger.info('Policy template created', {
      userId: user.id,
      templateId,
      name,
      category,
    });

    return standardSuccessResponse({
      template: newTemplate,
      message: 'Policy template created successfully',
    });

  } catch (error) {
    logger.error('Policy template creation error', error as Error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create policy template'
    );
  }
}

/**
 * PATCH /api/governance/policy-templates/[id]
 * 
 * Update a policy template
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return standardErrorResponse(ErrorCode.AUTH_REQUIRED, 'Authentication required');
    }

    if (!user.organizationId) {
      return standardErrorResponse(ErrorCode.AUTH_REQUIRED, 'Organization ID required');
    }

    // Check role
    const userOrg = await db
      .select({ organizationType: organizations.organizationType })
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    const orgType = userOrg[0]?.organizationType;
    if (orgType !== 'federation' && orgType !== 'congress') {
      return standardErrorResponse(
        ErrorCode.FORBIDDEN,
        'Only federation or CLC staff can update policy templates'
      );
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'Template ID required');
    }

    const existingTemplate = policyTemplates.get(templateId);
    if (!existingTemplate) {
      return standardErrorResponse(ErrorCode.NOT_FOUND, 'Template not found');
    }

    const body = await request.json();
    const validation = updateTemplateSchema.safeParse(body);

    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid update data',
        { errors: validation.error.errors }
      );
    }

    // Update template (version bump)
    const updatedTemplate = {
      ...existingTemplate,
      ...validation.data,
      version: existingTemplate.version + 0.1,
      updatedAt: new Date().toISOString(),
    };

    policyTemplates.set(templateId, updatedTemplate);

    logger.info('Policy template updated', {
      userId: user.id,
      templateId,
      newVersion: updatedTemplate.version,
    });

    return standardSuccessResponse({
      template: updatedTemplate,
      message: 'Policy template updated successfully',
    });

  } catch (error) {
    logger.error('Policy template update error', error as Error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update policy template'
    );
  }
}
