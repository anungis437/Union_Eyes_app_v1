import { NextRequest, NextResponse } from "next/server";
import { withAuth, withValidatedBody, logApiAuditEvent } from '@/lib/middleware/api-security';

import { createClient } from "@/packages/supabase/server";
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations/[id]/sharing-settings
 * Retrieve sharing settings for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = params.id;
  if (authResult.orgId && organizationId !== authResult.orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

    const supabase = await createClient();

    // Verify user has admin access to this organization
    const { data: userOrgs } = await supabase.rpc("get_user_organizations");
    const hasAccess = (userOrgs as unknown as any[])?.some(
      (org: any) => org.id === organizationId && ["admin", "officer"].includes(org.user_role)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied - admin or officer role required" },
        { status: 403 }
      );
    }

    // Get sharing settings
    const { data: settings, error } = await supabase
      .from("organization_sharing_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (error) {
      // If no settings exist, return defaults
      if (error.code === "PGRST116") {
        return NextResponse.json({
          organization_id: organizationId,
          enable_clause_sharing: false,
          default_clause_sharing_level: "federation",
          auto_anonymize_clauses: true,
          enable_precedent_sharing: false,
          default_precedent_sharing_level: "federation",
          always_redact_member_names: true,
          enable_analytics_sharing: false,
          share_member_counts: true,
          share_financial_data: false,
          share_claims_data: true,
          updated_by: null,
          updated_at: null,
        });
      }
      throw error;
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Error fetching sharing settings', error as Error, {
      organizationId: params.id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { error: "Failed to fetch sharing settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizations/[id]/sharing-settings
 * Update sharing settings for an organization
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = params.id;
    const body = await request.json();
    const supabase = await createClient();

    // Verify user has admin access
    const { data: userOrgs } = await supabase.rpc("get_user_organizations");
    const hasAccess = (userOrgs as unknown as any[])?.some(
      (org: any) => org.id === organizationId && ["admin", "officer"].includes(org.user_role)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied - admin or officer role required" },
        { status: 403 }
      );
    }

    // Validate sharing levels
    const validSharingLevels = ["private", "federation", "congress", "public"];
    if (
      body.default_clause_sharing_level &&
      !validSharingLevels.includes(body.default_clause_sharing_level)
    ) {
      return NextResponse.json(
        { error: "Invalid clause sharing level" },
        { status: 400 }
      );
    }
    if (
      body.default_precedent_sharing_level &&
      !validSharingLevels.includes(body.default_precedent_sharing_level)
    ) {
      return NextResponse.json(
        { error: "Invalid precedent sharing level" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData = {
      organization_id: organizationId,
      enable_clause_sharing: body.enable_clause_sharing ?? false,
      default_clause_sharing_level: body.default_clause_sharing_level ?? "federation",
      auto_anonymize_clauses: body.auto_anonymize_clauses ?? true,
      enable_precedent_sharing: body.enable_precedent_sharing ?? false,
      default_precedent_sharing_level: body.default_precedent_sharing_level ?? "federation",
      always_redact_member_names: body.always_redact_member_names ?? true,
      enable_analytics_sharing: body.enable_analytics_sharing ?? false,
      share_member_counts: body.share_member_counts ?? true,
      share_financial_data: body.share_financial_data ?? false,
      share_claims_data: body.share_claims_data ?? true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    // Upsert settings
    const { data: settings, error } = await (supabase as any)
      .from("organization_sharing_settings")
      .upsert(updateData, {
        onConflict: "organization_id",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Error updating sharing settings', error as Error, {
      organizationId: params.id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { error: "Failed to update sharing settings" },
      { status: 500 }
    );
  }
}
