/**
 * SSO Providers API
 * 
 * Manages SAML and OIDC identity provider configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { ssoProviders } from '@/db/schema/sso-scim-schema';
import { and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { requireUserForOrganization } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';

// Validation schema for creating SSO provider
const createSSOProviderSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  providerType: z.enum(['saml', 'oidc']),
  
  // SAML fields (conditional)
  samlEntityId: z.string().optional(),
  samlSsoUrl: z.string().url().optional(),
  samlCertificate: z.string().optional(),
  
  // OIDC fields (conditional)
  oidcIssuer: z.string().url().optional(),
  oidcClientId: z.string().optional(),
  oidcClientSecret: z.string().optional(),
  oidcAuthorizationEndpoint: z.string().url().optional(),
  oidcTokenEndpoint: z.string().url().optional(),
  
  // Common settings
  attributeMapping: z.record(z.string()),
  roleMapping: z.record(z.string()).optional(),
  autoProvision: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/enterprise/sso/providers
 * List SSO providers
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(ssoProviders.organizationId, organizationId));
    }
    
    const providersQuery = db
      .select()
      .from(ssoProviders)
      .orderBy(desc(ssoProviders.createdAt));
    
    if (conditions.length > 0) {
      providersQuery.where(and(...conditions));
    }
    
    const providers = await providersQuery;
    
    // Redact sensitive information
    const sanitizedProviders = providers.map(p => ({
      ...p,
      samlCertificate: p.samlCertificate ? '***REDACTED***' : null,
      oidcClientSecret: p.oidcClientSecret ? '***REDACTED***' : null,
    }));
    
    return NextResponse.json({ providers: sanitizedProviders });
  } catch (error: Record<string, unknown>) {
    logger.error('Error fetching SSO providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SSO providers', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/sso/providers
 * Create new SSO provider
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = createSSOProviderSchema.parse(body);
    const authContext = await requireUserForOrganization(validatedData.organizationId);
    const createdBy = authContext.userId;
    
    // Validate provider-specific required fields
    if (validatedData.providerType === 'saml') {
      if (!validatedData.samlEntityId || !validatedData.samlSsoUrl || !validatedData.samlCertificate) {
        return NextResponse.json(
          { error: 'SAML provider requires entityId, ssoUrl, and certificate' },
          { status: 400 }
        );
      }
    } else if (validatedData.providerType === 'oidc') {
      if (!validatedData.oidcIssuer || !validatedData.oidcClientId || !validatedData.oidcClientSecret) {
        return NextResponse.json(
          { error: 'OIDC provider requires issuer, clientId, and clientSecret' },
          { status: 400 }
        );
      }
    }
    
    // Create provider
    const [provider] = await db
      .insert(ssoProviders)
      .values({
        ...validatedData,
        createdBy,
      })
      .returning();
    
    return NextResponse.json({
      message: 'SSO provider created successfully',
      provider: {
        ...provider,
        samlCertificate: provider.samlCertificate ? '***REDACTED***' : null,
        oidcClientSecret: provider.oidcClientSecret ? '***REDACTED***' : null,
      },
    }, { status: 201 });
  } catch (error: Record<string, unknown>) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    logger.error('Error creating SSO provider:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create SSO provider', details: error.message },
      { status: 500 }
    );
  }
}
