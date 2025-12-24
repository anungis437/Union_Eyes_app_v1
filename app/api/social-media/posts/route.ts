/**
 * Social Media Posts API Routes - Phase 10
 * 
 * CRUD endpoints for managing social media posts across platforms.
 * Supports create, read, update, delete, and publish operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSocialMediaService } from '@/lib/social-media/social-media-service';
import { createClient } from '@supabase/supabase-js';

// Supabase client for social media tables (not in Drizzle schema yet)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/social-media/posts
 * 
 * List posts with filtering and pagination
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
    const status = searchParams.get('status');
    const campaignId = searchParams.get('campaign_id');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('social_posts')
      .select(`
        *,
        account:social_accounts(id, platform, platform_username, platform_account_name),
        campaign:social_campaigns(id, name),
        created_by_profile:profiles!created_by(id, first_name, last_name)
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (platform) {
      query = query.eq('platform', platform);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error, count } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({
      posts: posts || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/social-media/posts
 * 
 * Create and publish a new post to one or more platforms
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

    // Parse request body
    const body = await request.json();
    const {
      platforms,
      content,
      media_urls,
      link_url,
      link_title,
      link_description,
      hashtags,
      mentions,
      scheduled_for,
      campaign_id,
    } = body;

    // Validation
    if (!platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'At least one platform required' }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check character limits per platform
    const characterLimits: Record<string, number> = {
      twitter: 280,
      facebook: 63206,
      instagram: 2200,
      linkedin: 3000,
    };

    for (const platform of platforms) {
      const limit = characterLimits[platform];
      if (limit && content.length > limit) {
        return NextResponse.json(
          { error: `Content exceeds ${platform} character limit of ${limit}` },
          { status: 400 }
        );
      }
    }

    // Create social media service
    const socialMediaService = createSocialMediaService();

    // Publish post
    const results = await socialMediaService.publishPost(
      orgId,
      {
        text: content,
        media_urls: media_urls || [],
        link_url,
        link_title,
        link_description,
        hashtags: hashtags || [],
        mentions: mentions || [],
        scheduled_for: scheduled_for ? new Date(scheduled_for) : undefined,
        platforms,
      },
      userId
    );

    // Check if any posts succeeded
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    if (successCount === 0) {
      return NextResponse.json(
        {
          error: 'Failed to publish to any platform',
          results,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Published to ${successCount} platform(s)${failureCount > 0 ? `, failed on ${failureCount}` : ''}`,
      results,
      success: successCount,
      failed: failureCount,
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
 * DELETE /api/social-media/posts
 * 
 * Delete a post from the platform and database
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

    // Get post ID from query params
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Verify user has access to this post (belongs to their organization)
    const { data: post, error: fetchError } = await supabase
      .from('social_posts')
      .select('*, account:social_accounts(organization_id)')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (orgId !== (post.account as any).organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete post using social media service
    const socialMediaService = createSocialMediaService();
    await socialMediaService.deletePost(postId);

    return NextResponse.json({
      message: 'Post deleted successfully',
      post_id: postId,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete post',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
