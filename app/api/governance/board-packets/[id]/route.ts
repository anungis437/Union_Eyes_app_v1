/**
 * Individual Board Packet API
 * 
 * Manages specific board packet operations (finalize, distribute, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { boardPackets, boardPacketDistributions } from '@/db/schema/board-packet-schema';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { boardPacketGenerator } from '@/lib/services/board-packet-generator';
import { logger } from '@/lib/logger';

// Validation schema for finalization
const finalizePacketSchema = z.object({
  signedBy: z.string().min(1),
});

// Validation schema for distribution
const distributePacketSchema = z.object({
  recipients: z.array(z.object({
    recipientId: z.string().uuid(),
    recipientName: z.string(),
    recipientEmail: z.string().email(),
    recipientRole: z.string(),
  })),
});

/**
 * GET /api/governance/board-packets/[id]
 * Get board packet details with all sections and distribution status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packetId = params.id;
    
    // Get packet details
    const [packet] = await db
      .select()
      .from(boardPackets)
      .where(eq(boardPackets.id, packetId));
    
    if (!packet) {
      return NextResponse.json(
        { error: 'Board packet not found' },
        { status: 404 }
      );
    }
    
    // Get distribution status
    const distributions = await db
      .select()
      .from(boardPacketDistributions)
      .where(eq(boardPacketDistributions.packetId, packetId));
    
    // Calculate distribution stats
    const stats = {
      totalRecipients: distributions.length,
      opened: distributions.filter(d => d.opened).length,
      downloaded: distributions.filter(d => d.downloaded).length,
      acknowledged: distributions.filter(d => d.acknowledged).length,
    };
    
    return NextResponse.json({
      ...packet,
      distributions,
      stats,
    });
  } catch (error: Record<string, unknown>) {
    logger.error('Error fetching board packet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch board packet', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/governance/board-packets/[id]/finalize
 * Finalize board packet (lock and prepare for distribution)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packetId = params.id;
    const body = await req.json();
    
    // Validate input
    const { signedBy } = finalizePacketSchema.parse(body);
    
    // Finalize packet
    const packet = await boardPacketGenerator.finalizePacket(packetId, signedBy);
    
    return NextResponse.json({
      message: 'Board packet finalized successfully',
      packet,
    });
  } catch (error: Record<string, unknown>) {
    logger.error('Error finalizing board packet:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to finalize board packet', details: error.message },
      { status: 500 }
    );
  }
}
