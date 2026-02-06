/**
 * Social Media Feed API Routes - Phase 10
 * 
 * Endpoints for fetching and aggregating social media feeds.
 * Provides unified view of posts across all connected platforms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSocialMediaService } from '@/lib/social-media/social-media-service';
import { createClient } from '@supabase/supabase-js';

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

/**
 * GET - Get unified feed of posts from all connected accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');
    const accountId = searchParams.get('account_id');
    const campaignId = searchParams.get('campaign_id');
    const status = searchParams.get('status') || 'published';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('social_posts')
      .select(
        `
        id,
        platform,
        platform_post_id,
        post_type,
        content,
        media_urls,
        link_url,
        hashtags,
        mentions,
        scheduled_for,
        published_at,
        status,
        impressions,
        reach,
        engagement,
        likes,
        comments,
        shares,
        clicks,
        engagement_rate,
        permalink,
        error_message,
        account:social_accounts!social_posts_account_id_fkey(
          id,
          platform,
          platform_username,
          platform_account_name,
          profile_image_url
        ),
        campaign:social_campaigns(
          id,
          name
        ),
        created_by_profile:profiles!social_posts_created_by_fkey(
          id,
          first_name,
          last_name
        )
      `,
        { count: 'exact' }
      )
      .eq('account.organization_id', orgId);

    // Apply filters
    if (platform) {
      query = query.eq('platform', platform);
    }

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination and sorting
    query = query.order('published_at', { ascending: false, nullsFirst: false });
    query = query.order('scheduled_for', { ascending: false, nullsFirst: false });
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error, count } = await query;

    if (error) {
      console.error('Error fetching feed:', error);
      return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
    }

    return NextResponse.json({
      posts: posts || [],
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
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
}

/**
 * POST - Refresh feed by fetching latest analytics from platforms
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const body = await request.json();
    const { account_ids } = body;

    // Get accounts to refresh
    let accountsQuery = supabase
      .from('social_accounts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active');

    if (account_ids && account_ids.length > 0) {
      accountsQuery = accountsQuery.in('id', account_ids);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No active accounts found' }, { status: 404 });
    }

    const socialMediaService = createSocialMediaService();
    const results = [];
    
    // Default date range for analytics refresh (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Refresh analytics for each account
    for (const account of accounts) {
      try {
        await socialMediaService.fetchAnalytics(account.id, startDate, endDate);
        results.push({
          account_id: account.id,
          platform: account.platform,
          status: 'success',
        });

        // Update last_synced_at
        await supabase
          .from('social_accounts')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', account.id);
      } catch (error) {
        console.error(`Error refreshing account ${account.id}:`, error);
        results.push({
          account_id: account.id,
          platform: account.platform,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      message: 'Feed refresh completed',
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
      results,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh feed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Get detailed information about a specific post
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get post ID from query params
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Fetch post with all related data
    const { data: post, error } = await supabase
      .from('social_posts')
      .select(
        `
        *,
        account:social_accounts!social_posts_account_id_fkey(
          id,
          organization_id,
          platform,
          platform_username,
          platform_account_name,
          profile_image_url,
          follower_count
        ),
        campaign:social_campaigns(
          id,
          name,
          description,
          goals
        ),
        created_by_profile:profiles!social_posts_created_by_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `
      )
      .eq('id', postId)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify user has access to this post
    if (orgId !== post.account.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get engagement timeline if available
    let engagementTimeline = null;
    if (post.status === 'published' && post.platform_post_id) {
      try {
        const socialMediaService = createSocialMediaService();
        // Fetch latest analytics (last 30 days)
        const analyticsEndDate = new Date();
        const analyticsStartDate = new Date();
        analyticsStartDate.setDate(analyticsStartDate.getDate() - 30);
        await socialMediaService.fetchAnalytics(post.account_id, analyticsStartDate, analyticsEndDate);

        // Get historical analytics
        const { data: analytics } = await supabase
          .from('social_analytics')
          .select('date, impressions, engagement, likes, comments, shares')
          .eq('account_id', post.account_id)
          .gte('date', post.published_at)
          .order('date', { ascending: true });

        engagementTimeline = analytics || [];
      } catch (error) {
        console.error('Error fetching engagement timeline:', error);
      }
    }

    // Calculate engagement metrics
    const engagementMetrics = {
      engagement_rate: post.engagement_rate || 0,
      like_rate: post.impressions > 0 ? ((post.likes || 0) / post.impressions) * 100 : 0,
      comment_rate: post.impressions > 0 ? ((post.comments || 0) / post.impressions) * 100 : 0,
      share_rate: post.impressions > 0 ? ((post.shares || 0) / post.impressions) * 100 : 0,
      click_through_rate: post.impressions > 0 ? ((post.clicks || 0) / post.impressions) * 100 : 0,
      reach_rate: post.follower_count > 0 ? ((post.reach || 0) / post.account.follower_count) * 100 : 0,
    };

    // Get related posts
    const { data: relatedPosts } = await supabase
      .from('social_posts')
      .select(
        `
        id,
        platform,
        content,
        published_at,
        impressions,
        engagement,
        engagement_rate,
        account:social_accounts!social_posts_account_id_fkey(
          platform_username
        )
      `
      )
      .eq('account.organization_id', orgId)
      .eq('status', 'published')
      .neq('id', postId)
      .or(
        post.campaign_id
          ? `campaign_id.eq.${post.campaign_id}`
          : post.hashtags && post.hashtags.length > 0
          ? `hashtags.cs.{${post.hashtags.join(',')}}`
          : 'false'
      )
      .order('engagement', { ascending: false })
      .limit(5);

    return NextResponse.json({
      post,
      engagement_metrics: engagementMetrics,
      engagement_timeline: engagementTimeline,
      related_posts: relatedPosts || [],
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch post details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Bulk delete posts
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const postIds = searchParams.get('ids')?.split(',') || [];

    if (postIds.length === 0) {
      return NextResponse.json({ error: 'No post IDs provided' }, { status: 400 });
    }

    const socialMediaService = createSocialMediaService();
    const results = [];

    for (const postId of postIds) {
      try {
        // Verify user has access to this post
        const { data: post } = await supabase
          .from('social_posts')
          .select('*, account:social_accounts!social_posts_account_id_fkey(organization_id)')
          .eq('id', postId)
          .single();

        if (!post) {
          results.push({
            post_id: postId,
            status: 'error',
            error: 'Post not found',
          });
          continue;
        }

        if (post.account.organization_id !== orgId) {
          results.push({
            post_id: postId,
            status: 'error',
            error: 'Unauthorized',
          });
          continue;
        }

        // Delete post
        await socialMediaService.deletePost(postId);
        results.push({
          post_id: postId,
          status: 'success',
        });
      } catch (error) {
        console.error(`Error deleting post ${postId}:`, error);
        results.push({
          post_id: postId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      message: 'Bulk delete completed',
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
      results,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete posts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
