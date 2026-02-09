import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
/**
 * Social Media Campaigns API Routes - Phase 10
 * 
 * Endpoints for managing social media campaigns.
 * Supports campaign CRUD, goal tracking, and performance analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

// Lazy initialization - env vars not available during build
let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

export const GET = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const { userId, organizationId } = context;

      if (!organizationId) {
        return NextResponse.json({ error: 'No organization found' }, { status: 403 });
      }

      // Rate limit check
      const rateLimitResult = await checkRateLimit(
        RATE_LIMITS.CAMPAIGN_OPERATIONS,
        `social-campaigns-read:${userId}`
      );
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
          { status: 429 }
        );
      }

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams;
      const status = searchParams.get('status');
      const search = searchParams.get('search');
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      // Build query
      let query = supabase
        .from('social_campaigns')
        .select(
          `
        *,
        created_by_profile:profiles!social_campaigns_created_by_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        posts:social_posts(count)
      `,
          { count: 'exact' }
        )
        .eq('organization_id', organizationId);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (startDate) {
        query = query.gte('start_date', startDate);
      }

      if (endDate) {
        query = query.lte('end_date', endDate);
      }

      // Apply pagination
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data: campaigns, error, count } = await query;

      if (error) {
        console.error('Error fetching campaigns:', error);
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
      }

      // Calculate campaign metrics
      const campaignsWithMetrics = await Promise.all(
        (campaigns || []).map(async (campaign) => {
          // Get post performance
          const { data: posts } = await supabase
            .from('social_posts')
            .select('impressions, engagement, likes, comments, shares, clicks')
            .eq('campaign_id', campaign.id);

          const metrics = {
            total_posts: posts?.length || 0,
            total_impressions: posts?.reduce((sum, p) => sum + (p.impressions || 0), 0) || 0,
            total_engagement: posts?.reduce((sum, p) => sum + (p.engagement || 0), 0) || 0,
            total_likes: posts?.reduce((sum, p) => sum + (p.likes || 0), 0) || 0,
            total_comments: posts?.reduce((sum, p) => sum + (p.comments || 0), 0) || 0,
            total_shares: posts?.reduce((sum, p) => sum + (p.shares || 0), 0) || 0,
            total_clicks: posts?.reduce((sum, p) => sum + (p.clicks || 0), 0) || 0,
          };

          // Calculate goal progress
          const goalProgress = campaign.goals?.map((goal: any) => {
            const currentValue = metrics[`total_${goal.metric}` as keyof typeof metrics] || 0;
            const progress = goal.target_value > 0 ? (currentValue / goal.target_value) * 100 : 0;
            return {
              ...goal,
              current_value: currentValue,
              progress: Math.min(progress, 100),
              achieved: currentValue >= goal.target_value,
            };
          });

          return {
            ...campaign,
            metrics,
            goal_progress: goalProgress,
          };
        })
      );

      return NextResponse.json({
        campaigns: campaignsWithMetrics,
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withRoleAuth('member', async (request, context) => {
  try {
      const { userId, organizationId } = context;

      if (!organizationId) {
        return NextResponse.json({ error: 'No organization found' }, { status: 403 });
      }

      // Rate limit check
      const rateLimitResult = await checkRateLimit(
        RATE_LIMITS.CAMPAIGN_OPERATIONS,
        `social-campaigns-create:${userId}`
      );
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
          { status: 429 }
        );
      }

      if (!organizationId) {
        return NextResponse.json({ error: 'No organization found' }, { status: 403 });
      }

      const body = await request.json();
      const { name, description, platforms, start_date, end_date, goals, hashtags, target_audience } = body;

      // Validate required fields
      if (!name) {
        return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
      }

      if (!platforms || platforms.length === 0) {
        return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 });
      }

      // Validate dates
      if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        if (start > end) {
          return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
        }
      }

      // Validate goals
      if (goals) {
        for (const goal of goals) {
          if (!goal.metric || !goal.target_value) {
            return NextResponse.json(
              { error: 'Each goal must have a metric and target value' },
              { status: 400 }
            );
          }
          if (goal.target_value <= 0) {
            return NextResponse.json({ error: 'Target value must be positive' }, { status: 400 });
          }
        }
      }

      // Create campaign
      const { data: campaign, error } = await supabase
        .from('social_campaigns')
        .insert({
          organization_id: organizationId,
          name,
          description,
          platforms,
          start_date,
          end_date,
          goals,
          hashtags: hashtags || [],
          target_audience,
          status: 'active',
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign:', error);
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
      }

      return NextResponse.json({ campaign }, { status: 201 });
    } catch (error) {
      console.error('Unexpected error:', error);
      return NextResponse.json(
        {
          error: 'Failed to create campaign',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request);
};

export const PUT = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const { userId, organizationId } = context;

      // Get campaign ID from query params
      const searchParams = request.nextUrl.searchParams;
      const campaignId = searchParams.get('id');

      if (!campaignId) {
        return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
      }

      // Verify user has access to this campaign
      const { data: campaign, error: fetchError } = await supabase
        .from('social_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (fetchError || !campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      if (organizationId !== campaign.organization_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const body = await request.json();
      const { name, description, platforms, start_date, end_date, goals, hashtags, target_audience, status } = body;

      // Validate dates if provided
      if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        if (start > end) {
          return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
        }
      }

      // Validate goals if provided
      if (goals) {
        for (const goal of goals) {
          if (!goal.metric || !goal.target_value) {
            return NextResponse.json(
              { error: 'Each goal must have a metric and target value' },
              { status: 400 }
            );
          }
          if (goal.target_value <= 0) {
            return NextResponse.json({ error: 'Target value must be positive' }, { status: 400 });
          }
        }
      }

      // Update campaign
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (platforms !== undefined) updateData.platforms = platforms;
      if (start_date !== undefined) updateData.start_date = start_date;
      if (end_date !== undefined) updateData.end_date = end_date;
      if (goals !== undefined) updateData.goals = goals;
      if (hashtags !== undefined) updateData.hashtags = hashtags;
      if (target_audience !== undefined) updateData.target_audience = target_audience;
      if (status !== undefined) updateData.status = status;

      const { data: updatedCampaign, error: updateError } = await supabase
        .from('social_campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating campaign:', updateError);
        return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
      }

      return NextResponse.json({ campaign: updatedCampaign });
    } catch (error) {
      console.error('Unexpected error:', error);
      return NextResponse.json(
        {
          error: 'Failed to update campaign',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request);
};

export const DELETE = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const { userId, organizationId } = context;

      // Get campaign ID from query params
      const searchParams = request.nextUrl.searchParams;
      const campaignId = searchParams.get('id');

      if (!campaignId) {
        return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
      }

      // Verify user has access to this campaign
      const { data: campaign, error: fetchError } = await supabase
        .from('social_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (fetchError || !campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      if (organizationId !== campaign.organization_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Check if campaign has posts
      const { data: posts } = await supabase
        .from('social_posts')
        .select('id')
        .eq('campaign_id', campaignId)
        .limit(1);

      if (posts && posts.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete campaign with associated posts',
            details: 'Please delete or reassign posts first',
          },
          { status: 400 }
        );
      }

      // Delete campaign
      const { error: deleteError } = await supabase
        .from('social_campaigns')
        .delete()
        .eq('id', campaignId);

      if (deleteError) {
        console.error('Error deleting campaign:', deleteError);
        return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Campaign deleted successfully',
        campaign_id: campaignId,
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      return NextResponse.json(
        {
          error: 'Failed to delete campaign',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request);
};
