/**
 * Mobile Sync API
 * 
 * Handles bidirectional data synchronization between
 * mobile devices and the server
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { getAuth } from '@clerk/nextjs/server';

// Sync request schema
const syncRequestSchema = z.object({
  lastSyncTimestamp: z.string().datetime().optional(),
  deviceId: z.string().min(1),
  platform: z.enum(['ios', 'android', 'pwa']),
  pendingChanges: z.array(z.object({
    type: z.enum(['create', 'update', 'delete']),
    entity: z.enum(['claim', 'member', 'message', 'document']),
    data: z.record(z.unknown()),
    timestamp: z.string().datetime(),
  })).optional(),
});

// Sync response schema
const syncResponseSchema = z.object({
  changes: z.object({
    claims: z.array(z.record(z.unknown())).optional(),
    members: z.array(z.record(z.unknown())).optional(),
    messages: z.array(z.record(z.unknown())).optional(),
    documents: z.array(z.record(z.unknown())).optional(),
  }).optional(),
  deleted: z.object({
    claims: z.array(z.string()).optional(),
    members: z.array(z.string()).optional(),
    messages: z.array(z.string()).optional(),
    documents: z.array(z.string()).optional(),
  }).optional(),
  syncTimestamp: z.string(),
});

/**
 * POST /api/mobile/sync
 * Synchronize data between mobile device and server
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuth(request);
    
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = syncRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { lastSyncTimestamp, deviceId, platform, pendingChanges } = validation.data;
    const syncTimestamp = new Date().toISOString();

    // Process pending changes from device
    const processedChanges = await processPendingChanges(
      pendingChanges || [],
      auth.userId
    );

    // Get changes since last sync
    const serverChanges = await getServerChanges(lastSyncTimestamp);

    // Get deleted items since last sync
    const deletedItems = await getDeletedItems(lastSyncTimestamp);

    const response = {
      success: true,
      changes: serverChanges,
      deleted: deletedItems,
      processedChanges,
      syncTimestamp,
      device: {
        platform,
        appVersion: body.appVersion,
        needsFullSync: !lastSyncTimestamp,
      },
    };

    logger.info('Sync completed', {
      userId: auth.userId,
      deviceId,
      pendingChangesCount: pendingChanges?.length || 0,
      processedChangesCount: processedChanges.length,
      serverChangesCount: {
        claims: serverChanges.claims?.length || 0,
        members: serverChanges.members?.length || 0,
        messages: serverChanges.messages?.length || 0,
        documents: serverChanges.documents?.length || 0,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Sync failed', { error });
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mobile/sync
 * Get sync status and pending items count
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuth(request);
    
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID required' },
        { status: 400 }
      );
    }

    // Return sync status
    const status = {
      lastSync: await getLastSyncTime(auth.userId, deviceId),
      pendingChanges: 0, // Would check in IndexedDB on client
      serverAvailable: true,
      syncEndpoint: '/api/mobile/sync',
    };

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Failed to get sync status', { error });
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * Process pending changes from mobile device
 */
async function processPendingChanges(
  changes: SyncChange[],
  userId: string
): Promise<ProcessedChange[]> {
  const processed: ProcessedChange[] = [];

  for (const change of changes) {
    try {
      const result = await processChange(change, userId);
      processed.push({
        entity: change.entity,
        entityId: change.data.id as string,
        status: 'success',
        ...result,
      });
    } catch (error) {
      logger.error('Failed to process change', { 
        entity: change.entity, 
        error 
      });
      processed.push({
        entity: change.entity,
        entityId: change.data.id as string,
        status: 'failed',
        error: (error as Error).message,
      });
    }
  }

  return processed;
}

/**
 * Process a single change
 */
async function processChange(
  change: SyncChange,
  userId: string
): Promise<{ id?: string }> {
  switch (change.entity) {
    case 'claim':
      return processClaimChange(change, userId);
    case 'member':
      return processMemberChange(change, userId);
    case 'message':
      return processMessageChange(change, userId);
    case 'document':
      return processDocumentChange(change, userId);
    default:
      throw new Error(`Unknown entity: ${change.entity}`);
  }
}

/**
 * Process claim changes
 */
async function processClaimChange(
  change: SyncChange,
  userId: string
): Promise<{ id: string }> {
  // In production, would call appropriate service
  switch (change.type) {
    case 'create':
      // const [claim] = await db.insert(claims).values(change.data).returning();
      // return { id: claim.id };
      return { id: change.data.id as string };
    case 'update':
      // await db.update(claims).set(change.data).where(eq(claims.id, change.data.id));
      return { id: change.data.id as string };
    case 'delete':
      // await db.delete(claims).where(eq(claims.id, change.data.id));
      return { id: change.data.id as string };
    default:
      throw new Error('Unknown change type');
  }
}

/**
 * Process member changes
 */
async function processMemberChange(
  change: SyncChange,
  userId: string
): Promise<{ id: string }> {
  switch (change.type) {
    case 'create':
      // const [member] = await db.insert(members).values(change.data).returning();
      // return { id: member.id };
      return { id: change.data.id as string };
    case 'update':
      // await db.update(members).set(change.data).where(eq(members.id, change.data.id));
      return { id: change.data.id as string };
    case 'delete':
      // await db.delete(members).where(eq(members.id, change.data.id));
      return { id: change.data.id as string };
    default:
      throw new Error('Unknown change type');
  }
}

/**
 * Process message changes
 */
async function processMessageChange(
  change: SyncChange,
  userId: string
): Promise<{ id: string }> {
  switch (change.type) {
    case 'create':
      return { id: change.data.id as string };
    case 'update':
      return { id: change.data.id as string };
    case 'delete':
      return { id: change.data.id as string };
    default:
      throw new Error('Unknown change type');
  }
}

/**
 * Process document changes
 */
async function processDocumentChange(
  change: SyncChange,
  userId: string
): Promise<{ id: string }> {
  switch (change.type) {
    case 'create':
      return { id: change.data.id as string };
    case 'update':
      return { id: change.data.id as string };
    case 'delete':
      return { id: change.data.id as string };
    default:
      throw new Error('Unknown change type');
  }
}

/**
 * Get server changes since last sync
 */
async function getServerChanges(lastSyncTimestamp?: string): Promise<{
  claims?: Record<string, unknown>[];
  members?: Record<string, unknown>[];
  messages?: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
}> {
  // In production, would query database for changes
  // since lastSyncTimestamp
  const since = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);

  // Placeholder - would return actual data
  return {
    claims: [],
    members: [],
    messages: [],
    documents: [],
  };
}

/**
 * Get deleted items since last sync
 */
async function getDeletedItems(lastSyncTimestamp?: string): Promise<{
  claims?: string[];
  members?: string[];
  messages?: string[];
  documents?: string[];
}> {
  // In production, would query deletion log
  return {
    claims: [],
    members: [],
    messages: [],
    documents: [],
  };
}

/**
 * Get last sync time for user/device
 */
async function getLastSyncTime(userId: string, deviceId: string): Promise<string | null> {
  // In production, would query database
  return null;
}

// Types
interface SyncChange {
  type: 'create' | 'update' | 'delete';
  entity: 'claim' | 'member' | 'message' | 'document';
  data: Record<string, unknown>;
  timestamp: string;
}

interface ProcessedChange {
  entity: string;
  entityId: string;
  status: 'success' | 'failed';
  id?: string;
  error?: string;
}
