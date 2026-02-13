/**
 * Board Packets API
 * 
 * Manages board packet creation, generation, and distribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { boardPackets, boardPacketDistributions } from '@/db/schema/board-packet-schema';
import { eq, and, desc, sql, or, like, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { boardPacketGenerator } from '@/lib/services/board-packet-generator';

// Validation schema for generating board packet
const generatePacketSchema = z.object({
  title: z.string().min(1).max(255),
  organizationId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  packetType: z.enum(['monthly', 'quarterly', 'annual', 'special']).default('monthly'),
});

/**
 * GET /api/governance/board-packets
 * List board packets with filters
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Extract query parameters
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const packetType = searchParams.get('packetType');
    const fiscalYear = searchParams.get('fiscalYear');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(boardPackets.organizationId, organizationId));
    }
    
    if (status) {
      conditions.push(eq(boardPackets.status, status));
    }
    
    if (packetType) {
      conditions.push(eq(boardPackets.packetType, packetType));
    }
    
    if (fiscalYear) {
      conditions.push(eq(boardPackets.fiscalYear, parseInt(fiscalYear)));
    }
    
    if (search) {
      conditions.push(
        or(
          like(boardPackets.title, `%${search}%`),
          like(boardPackets.description, `%${search}%`)
        )
      );
    }
    
    // Query packets with distribution stats
    const packetsQuery = db
      .select({
        id: boardPackets.id,
        title: boardPackets.title,
        description: boardPackets.description,
        packetType: boardPackets.packetType,
        periodStart: boardPackets.periodStart,
        periodEnd: boardPackets.periodEnd,
        fiscalYear: boardPackets.fiscalYear,
        fiscalQuarter: boardPackets.fiscalQuarter,
        status: boardPackets.status,
        generatedAt: boardPackets.generatedAt,
        generatedBy: boardPackets.generatedBy,
        finalizedAt: boardPackets.finalizedAt,
        distributedAt: boardPackets.distributedAt,
        pdfUrl: boardPackets.pdfUrl,
        signedBy: boardPackets.signedBy,
        signedAt: boardPackets.signedAt,
        recipientCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${boardPacketDistributions} 
          WHERE ${boardPacketDistributions.packetId} = ${boardPackets.id}
        )`,
        acknowledgedCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${boardPacketDistributions} 
          WHERE ${boardPacketDistributions.packetId} = ${boardPackets.id}
            AND ${boardPacketDistributions.acknowledged} = true
        )`,
      })
      .from(boardPackets)
      .orderBy(desc(boardPackets.generatedAt))
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    if (conditions.length > 0) {
      packetsQuery.where(and(...conditions));
    }
    
    const packets = await packetsQuery;
    
    // Get total count
    const countQuery = db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(boardPackets);
    
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    
    const [{ count }] = await countQuery;
    
    return NextResponse.json({
      packets,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching board packets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch board packets', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/governance/board-packets
 * Generate new board packet
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = generatePacketSchema.parse(body);
    
    // TODO: Extract from auth
    const generatedBy = 'system'; // Replace with actual user ID
    
    // Generate board packet
    const packet = await boardPacketGenerator.generatePacket({
      title: validatedData.title,
      organizationId: validatedData.organizationId,
      periodStart: new Date(validatedData.periodStart),
      periodEnd: new Date(validatedData.periodEnd),
      packetType: validatedData.packetType,
      generatedBy,
    });
    
    return NextResponse.json({
      message: 'Board packet generated successfully',
      packet,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating board packet:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate board packet', details: error.message },
      { status: 500 }
    );
  }
}
