import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Self-Serve Onboarding API
 * 
 * POST /api/onboarding - Process organization onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema-organizations';
import { logger } from '@/lib/logger';
import { eventBus, AppEvents } from '@/lib/events';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const runtime = 'nodejs';

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await request.json();
      const { orgName, orgType, province, memberCount, plan } = body;

      // Validate required fields
      if (!orgName || !orgType || !province || !memberCount || !plan) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Create organization
      const org = await db
        .insert(organizations)
        .values({
          name: orgName,
          slug: orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          organizationType: orgType,
          provinceTerritory: province,
          memberCount: parseInt(memberCount),
          subscriptionTier: plan,
          hierarchyPath: [],
          hierarchyLevel: 0,
          createdBy: userId,
        })
        .returning();

      // Emit onboarding event
      eventBus.emit(AppEvents.ORG_CREATED, {
        orgId: org[0].id,
        createdBy: userId,
      });

      logger.info('Organization onboarded', {
        orgId: org[0].id,
        orgName,
        plan,
      });

      return NextResponse.json({
        success: true,
        organization: org[0],
      });
    } catch (error) {
      logger.error('Onboarding failed', { error });
      return NextResponse.json(
        { error: 'Failed to process onboarding' },
        { status: 500 }
      );
    }
    })(request);
};

