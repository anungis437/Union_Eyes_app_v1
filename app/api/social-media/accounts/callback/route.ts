/**
 * OAuth Callback Handler - Phase 10
 * 
 * Handles OAuth callbacks from social media platforms.
 * Exchanges authorization codes for access tokens and stores credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createMetaClient } from '@/lib/social-media/meta-api-client';
import { createTwitterClient } from '@/lib/social-media/twitter-api-client';
import { createLinkedInClient } from '@/lib/social-media/linkedin-api-client';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Supabase client for social media tables (not in Drizzle schema yet)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/social-media/accounts/callback
 * 
 * OAuth callback endpoint for all platforms
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?error=Invalid callback parameters`
      );
    }

    // Verify OAuth state
    const cookieStore = cookies();
    const storedState = cookieStore.get('oauth_state')?.value;

    if (state !== storedState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?error=Invalid OAuth state`
      );
    }

    // Parse state to get user ID and platform
    const [userId, platform] = state.split(':');

    if (!userId || !platform) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?error=Invalid state format`
      );
    }

    // Verify user with Clerk
    const { userId: clerkUserId, orgId } = await auth();

    if (!clerkUserId || clerkUserId !== userId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?error=Authentication failed`
      );
    }

    if (!orgId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?error=No organization found`
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social-media/accounts/callback`;

    try {
      switch (platform) {
        case 'facebook':
        case 'instagram': {
          await handleMetaCallback(
            code,
            redirectUri,
            platform,
            orgId,
            clerkUserId,
            supabase
          );
          break;
        }

        case 'twitter': {
          const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;
          if (!codeVerifier) {
            throw new Error('Code verifier not found');
          }
          await handleTwitterCallback(
            code,
            codeVerifier,
            redirectUri,
            orgId,
            clerkUserId,
            supabase
          );
          // Clear code verifier cookie
          cookieStore.delete('twitter_code_verifier');
          break;
        }

        case 'linkedin': {
          await handleLinkedInCallback(
            code,
            redirectUri,
            orgId,
            clerkUserId,
            supabase
          );
          break;
        }

        default:
          throw new Error('Unsupported platform');
      }

      // Clear OAuth state cookie
      cookieStore.delete('oauth_state');

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?success=Account connected successfully`
      );
    } catch (error) {
      console.error('Callback handling error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'Failed to connect account'
        )}`
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-media?error=Internal server error`
    );
  }
}

/**
 * Handle Meta (Facebook/Instagram) OAuth callback
 */
async function handleMetaCallback(
  code: string,
  redirectUri: string,
  platform: string,
  organizationId: string,
  userId: string,
  supabase: any
) {
  const metaClient = createMetaClient();

  // Exchange code for short-lived token
  const shortToken = await metaClient.getAccessToken(code, redirectUri);

  // Exchange for long-lived token (60 days)
  const tokenData = await metaClient.getLongLivedToken(shortToken.access_token);

  // Get user's Facebook pages
  const metaClientWithToken = createMetaClient(tokenData.access_token);
  const pages = await metaClientWithToken.getUserPages();

  if (pages.length === 0) {
    throw new Error('No Facebook pages found. Please create a Facebook page first.');
  }

  // Store each page as a separate account
  for (const page of pages) {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Check if Instagram is connected
    let instagramAccount = null;
    if (platform === 'instagram') {
      try {
        instagramAccount = await metaClientWithToken.getInstagramAccount(page.id);
      } catch (error) {
        console.error('Failed to get Instagram account:', error);
      }
    }

    const accountPlatform = instagramAccount ? 'instagram' : 'facebook';
    const accountId = instagramAccount?.id || page.id;
    const accountUsername = instagramAccount?.username || page.name;
    const accountName = instagramAccount?.name || page.name;

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('platform', accountPlatform)
      .eq('platform_account_id', accountId)
      .single();

    const accountData = {
      organization_id: organizationId,
      platform: accountPlatform,
      platform_account_id: accountId,
      platform_username: accountUsername,
      platform_account_name: accountName,
      access_token: page.access_token, // Use page access token
      refresh_token: null,
      token_expires_at: expiresAt.toISOString(),
      status: 'active',
      metadata: {
        page_id: page.id,
        instagram_business_account_id: instagramAccount?.id,
        category: page.category,
        tasks: page.tasks,
      },
      connected_by: userId,
      connected_at: new Date().toISOString(),
    };

    if (existingAccount) {
      // Update existing account
      await supabase
        .from('social_accounts')
        .update(accountData)
        .eq('id', existingAccount.id);
    } else {
      // Insert new account
      await supabase.from('social_accounts').insert(accountData);
    }
  }
}

/**
 * Handle Twitter OAuth callback
 */
async function handleTwitterCallback(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  organizationId: string,
  userId: string,
  supabase: any
) {
  const twitterClient = createTwitterClient();

  // Exchange code for access token
  const tokenData = await twitterClient.getAccessToken(code, codeVerifier, redirectUri);

  // Get authenticated user
  const twitterClientWithToken = createTwitterClient(
    tokenData.access_token,
    tokenData.refresh_token
  );
  const userInfo = await twitterClientWithToken.getMe();

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  // Check if account already exists
  const { data: existingAccount } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('platform', 'twitter')
    .eq('platform_account_id', userInfo.id)
    .single();

  const accountData = {
    organization_id: organizationId,
    platform: 'twitter',
    platform_account_id: userInfo.id,
    platform_username: userInfo.username,
    platform_account_name: userInfo.name,
    profile_image_url: userInfo.profile_image_url,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_expires_at: expiresAt.toISOString(),
    status: 'active',
    metadata: {
      description: userInfo.description,
      verified: userInfo.verified,
      protected: userInfo.protected,
      public_metrics: userInfo.public_metrics,
    },
    follower_count: userInfo.public_metrics?.followers_count || 0,
    connected_by: userId,
    connected_at: new Date().toISOString(),
  };

  if (existingAccount) {
    // Update existing account
    await supabase
      .from('social_accounts')
      .update(accountData)
      .eq('id', existingAccount.id);
  } else {
    // Insert new account
    await supabase.from('social_accounts').insert(accountData);
  }
}

/**
 * Handle LinkedIn OAuth callback
 */
async function handleLinkedInCallback(
  code: string,
  redirectUri: string,
  organizationId: string,
  userId: string,
  supabase: any
) {
  const linkedInClient = createLinkedInClient();

  // Exchange code for access token
  const tokenData = await linkedInClient.getAccessToken(code, redirectUri);

  // Get user profile
  const linkedInClientWithToken = createLinkedInClient(tokenData.access_token);
  const profile = await linkedInClientWithToken.getProfile();

  // Get user's organizations
  const organizations = await linkedInClientWithToken.getOrganizations();

  if (organizations.length === 0) {
    throw new Error('No LinkedIn organizations found. Please create an organization page first.');
  }

  // Store each organization as a separate account
  for (const org of organizations) {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Get full organization details
    const orgDetails = await linkedInClientWithToken.getOrganization(org.id);

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('platform', 'linkedin')
      .eq('platform_account_id', org.id)
      .single();

    const accountData = {
      organization_id: organizationId,
      platform: 'linkedin',
      platform_account_id: org.id,
      platform_username: orgDetails.vanityName || org.id,
      platform_account_name: orgDetails.localizedName,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: expiresAt.toISOString(),
      status: 'active',
      metadata: {
        role: org.role,
        state: org.state,
        website: orgDetails.website,
        industry: orgDetails.industries?.[0],
        follower_count: orgDetails.followerCount,
      },
      follower_count: orgDetails.followerCount || 0,
      connected_by: userId,
      connected_at: new Date().toISOString(),
    };

    if (existingAccount) {
      // Update existing account
      await supabase
        .from('social_accounts')
        .update(accountData)
        .eq('id', existingAccount.id);
    } else {
      // Insert new account
      await supabase.from('social_accounts').insert(accountData);
    }
  }
}
