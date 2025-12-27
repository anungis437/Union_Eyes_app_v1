/**
 * Social Media Accounts API Routes - Phase 10
 * 
 * Endpoints for managing social media account connections.
 * Supports OAuth flows, token refresh, and account management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createMetaClient } from '@/lib/social-media/meta-api-client';
import { createTwitterClient, generatePKCE } from '@/lib/social-media/twitter-api-client';
import { createLinkedInClient } from '@/lib/social-media/linkedin-api-client';
import { cookies } from 'next/headers';
import { createClient } from '@getSupabaseClient()/getSupabaseClient()-js';

// Lazy initialization to avoid build-time execution
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
 * GET /api/social-media/accounts
 * 
 * List all connected social media accounts
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

    // Fetch accounts
    const { data: accounts, error } = await getSupabaseClient()
      .from('social_accounts')
      .select(`
        id,
        platform,
        platform_account_id,
        platform_username,
        platform_account_name,
        profile_image_url,
        follower_count,
        engagement_rate,
        status,
        connected_at,
        last_synced_at,
        rate_limit_remaining,
        rate_limit_reset_at
      `)
      .eq('organization_id', orgId)
      .order('connected_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/social-media/accounts/connect
 * 
 * Initiate OAuth flow for connecting a social media account
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform } = body;

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    // Generate OAuth state
    const state = `${userId}:${platform}:${Date.now()}`;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social-media/accounts/callback`;

    let authUrl: string;
    const cookieStore = cookies();

    switch (platform) {
      case 'facebook':
      case 'instagram': {
        const metaClient = createMetaClient();
        const scopes = [
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          'pages_manage_engagement',
          'instagram_basic',
          'instagram_content_publish',
          'business_management',
        ];
        authUrl = metaClient.getAuthorizationUrl(redirectUri, scopes, state);
        break;
      }

      case 'twitter': {
        const twitterClient = createTwitterClient();
        const { verifier, challenge } = generatePKCE();
        
        // Store code verifier in cookie for callback
        cookieStore.set('twitter_code_verifier', verifier, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600, // 10 minutes
        });

        const scopes = [
          'tweet.read',
          'tweet.write',
          'users.read',
          'offline.access',
        ];
        authUrl = twitterClient.getAuthorizationUrl(redirectUri, scopes, state, challenge);
        break;
      }

      case 'linkedin': {
        const linkedInClient = createLinkedInClient();
        const scopes = [
          'r_organization_social',
          'w_organization_social',
          'rw_organization_admin',
          'r_basicprofile',
        ];
        authUrl = linkedInClient.getAuthorizationUrl(redirectUri, scopes, state);
        break;
      }

      default:
        return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }

    // Store OAuth state in cookie
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return NextResponse.json({ auth_url: authUrl });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social-media/accounts/:id
 * 
 * Disconnect a social media account
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from query params
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Verify user has access to this account
    const { data: account, error: fetchError } = await getSupabaseClient()
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (orgId !== account.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Revoke tokens on the platform (if supported)
    try {
      switch (account.platform) {
        case 'twitter': {
          const twitterClient = createTwitterClient(
            account.access_token,
            account.refresh_token || undefined
          );
          await twitterClient.revokeToken();
          break;
        }
        // Meta and LinkedIn don't require explicit revocation
      }
    } catch (revokeError) {
      console.error('Token revocation error:', revokeError);
      // Continue with deletion even if revocation fails
    }

    // Delete account from database
    const { error: deleteError } = await getSupabaseClient()
      .from('social_accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) {
      console.error('Error deleting account:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Account disconnected successfully',
      account_id: accountId,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/social-media/accounts/refresh
 * 
 * Manually refresh an account's access token
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const body = await request.json();
    const { account_id } = body;

    if (!account_id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Verify user has access to this account
    const { data: account, error: fetchError } = await getSupabaseClient()
      .from('social_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('organization_id', orgId) // Use orgId from Clerk auth
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Refresh token based on platform
    let newAccessToken: string;
    let newRefreshToken: string | null = null;
    let expiresIn: number;

    try {
      switch (account.platform) {
        case 'facebook':
        case 'instagram': {
          const metaClient = createMetaClient(account.access_token);
          const tokenData = await metaClient.getLongLivedToken(account.access_token);
          newAccessToken = tokenData.access_token;
          expiresIn = tokenData.expires_in;
          break;
        }

        case 'twitter': {
          if (!account.refresh_token) {
            throw new Error('No refresh token available');
          }
          const twitterClient = createTwitterClient(
            account.access_token,
            account.refresh_token
          );
          const tokenData = await twitterClient.refreshAccessToken();
          newAccessToken = tokenData.access_token;
          newRefreshToken = tokenData.refresh_token || null;
          expiresIn = tokenData.expires_in;
          break;
        }

        case 'linkedin': {
          if (!account.refresh_token) {
            throw new Error('No refresh token available');
          }
          const linkedInClient = createLinkedInClient(account.access_token);
          const tokenData = await linkedInClient.refreshAccessToken(account.refresh_token);
          newAccessToken = tokenData.access_token;
          newRefreshToken = tokenData.refresh_token || null;
          expiresIn = tokenData.expires_in;
          break;
        }

        default:
          throw new Error('Unsupported platform');
      }

      // Update account with new tokens
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      const updateData: any = {
        access_token: newAccessToken,
        token_expires_at: expiresAt.toISOString(),
        status: 'active',
        error_message: null,
        updated_at: new Date().toISOString(),
      };

      if (newRefreshToken) {
        updateData.refresh_token = newRefreshToken;
      }

      const { error: updateError } = await getSupabaseClient()
        .from('social_accounts')
        .update(updateData)
        .eq('id', account_id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        message: 'Token refreshed successfully',
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      // Update account status to error
      await getSupabaseClient()
        .from('social_accounts')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Token refresh failed',
        })
        .eq('id', account_id);

      throw error;
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
