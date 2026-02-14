/**
 * SCIM 2.0 Users API
 * 
 * Implements SCIM 2.0 User resource endpoint for enterprise provisioning
 * Spec: https://datatracker.ietf.org/doc/html/rfc7644
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { scimConfigurations, scimEventsLog } from '@/db/schema/sso-scim-schema';
import { users } from '@/db/schema/user-management-schema';
import { and, like, or } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Validate SCIM bearer token
 */
async function validateSCIMAuth(req: NextRequest, organizationId: string): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const [config] = await db
    .select()
    .from(scimConfigurations)
    .where(
      and(
        eq(scimConfigurations.organizationId, organizationId),
        eq(scimConfigurations.tokenHash, tokenHash),
        eq(scimConfigurations.enabled, true)
      )
    );
  
  return !!config;
}

/**
 * Log SCIM event
 */
async function logSCIMEvent(
  configId: string,
  organizationId: string,
  eventType: string,
  operation: string,
  requestPath: string,
  status: string,
  statusCode: number,
  requestBody?: any,
  responseBody?: any | Record<string, unknown>,
  errorMessage?: string
) {
  await db.insert(scimEventsLog).values({
    configId,
    organizationId,
    eventType,
    resourceType: 'User',
    operation,
    requestPath,
    status,
    statusCode,
    requestBody,
    responseBody,
    errorMessage,
  });
}

/**
 * GET /api/scim/v2/[organizationId]/Users
 * List users (SCIM 2.0 User resource)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  const startTime = Date.now();
  const organizationId = params.organizationId;
  
  try {
    // Validate SCIM authentication
    const isValid = await validateSCIMAuth(req, organizationId);
    if (!isValid) {
      return NextResponse.json(
        {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'Invalid or missing authorization token',
          status: '401',
        },
        { status: 401 }
      );
    }
    
    // Get SCIM config
    const [config] = await db
      .select()
      .from(scimConfigurations)
      .where(eq(scimConfigurations.organizationId, organizationId));
    
    if (!config) {
      return NextResponse.json(
        {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'SCIM not configured for organization',
          status: '404',
        },
        { status: 404 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter');
    const startIndex = parseInt(searchParams.get('startIndex') || '1');
    const count = parseInt(searchParams.get('count') || '100');
    
    // Build user query
    const conditions = [eq(users.organizationId, organizationId)];
    
    // Simple filter support (SCIM filter can be complex - this is simplified)
    if (filter) {
      // Example: userName eq "test@example.com"
      const emailMatch = filter.match(/userName eq "([^"]+)"/);
      if (emailMatch) {
        conditions.push(eq(users.email, emailMatch[1]));
      }
    }
    
    // Query users
    const userList = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .limit(count)
      .offset(startIndex - 1);
    
    // Transform to SCIM User resource format
    const scimUsers = userList.map(user => ({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id,
      userName: user.email,
      name: {
        givenName: user.firstName || '',
        familyName: user.lastName || '',
        formatted: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      },
      emails: [
        {
          value: user.email,
          type: 'work',
          primary: true,
        },
      ],
      active: user.status === 'active',
      meta: {
        resourceType: 'User',
        created: user.createdAt,
        lastModified: user.updatedAt,
      },
    }));
    
    const response = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: userList.length,
      startIndex,
      itemsPerPage: count,
      Resources: scimUsers,
    };
    
    // Log event
    await logSCIMEvent(
      config.id,
      organizationId,
      'users.list',
      'GET',
      req.url,
      'success',
      200,
      null,
      response
    );
    
    return NextResponse.json(response);
  } catch (error: Record<string, unknown>) {
    logger.error('SCIM Users GET error:', error);
    return NextResponse.json(
      {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: error.message,
        status: '500',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scim/v2/[organizationId]/Users
 * Create user (SCIM 2.0)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  const organizationId = params.organizationId;
  
  try {
    // Validate SCIM authentication
    const isValid = await validateSCIMAuth(req, organizationId);
    if (!isValid) {
      return NextResponse.json(
        {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'Invalid or missing authorization token',
          status: '401',
        },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    // Get SCIM config
    const [config] = await db
      .select()
      .from(scimConfigurations)
      .where(eq(scimConfigurations.organizationId, organizationId));
    
    if (!config || !config.syncUsers) {
      return NextResponse.json(
        {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'User provisioning not enabled',
          status: '403',
        },
        { status: 403 }
      );
    }
    
    // Extract user data from SCIM format
    const userData = {
      email: body.userName || body.emails?.[0]?.value,
      firstName: body.name?.givenName,
      lastName: body.name?.familyName,
      status: body.active ? 'active' : 'inactive',
      organizationId,
    };
    
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, userData.email),
          eq(users.organizationId, organizationId)
        )
      );
    
    if (existingUser) {
      await logSCIMEvent(
        config.id,
        organizationId,
        'user.create',
        'POST',
        req.url,
        'error',
        409,
        body,
        null,
        'User already exists'
      );
      
      return NextResponse.json(
        {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'User already exists',
          status: '409',
        },
        { status: 409 }
      );
    }
    
    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        role: 'member', // Default role
        passwordHash: crypto.randomBytes(32).toString('hex'), // Random password (SSO login only)
      })
      .returning();
    
    // Transform to SCIM response
    const scimUser = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: newUser.id,
      userName: newUser.email,
      name: {
        givenName: newUser.firstName || '',
        familyName: newUser.lastName || '',
      },
      emails: [
        {
          value: newUser.email,
          type: 'work',
          primary: true,
        },
      ],
      active: newUser.status === 'active',
      meta: {
        resourceType: 'User',
        created: newUser.createdAt,
        lastModified: newUser.updatedAt,
      },
    };
    
    // Log event
    await logSCIMEvent(
      config.id,
      organizationId,
      'user.created',
      'POST',
      req.url,
      'success',
      201,
      body,
      scimUser
    );
    
    // Update sync stats
    await db
      .update(scimConfigurations)
      .set({
        usersSynced: (config.usersSynced || 0) + 1,
        lastSyncAt: new Date(),
      })
      .where(eq(scimConfigurations.id, config.id));
    
    return NextResponse.json(scimUser, { status: 201 });
  } catch (error: Record<string, unknown>) {
    logger.error('SCIM Users POST error:', error);
    return NextResponse.json(
      {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: error.message,
        status: '500',
      },
      { status: 500 }
    );
  }
}
