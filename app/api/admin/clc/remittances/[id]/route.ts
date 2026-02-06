/**
 * CLC Per-Capita Single Remittance API Routes
 * Purpose: Get, update, and manage individual remittances
 * 
 * Endpoints:
 * - GET /api/admin/clc/remittances/[id] - Get remittance details
 * - PUT /api/admin/clc/remittances/[id] - Update remittance
 * - DELETE /api/admin/clc/remittances/[id] - Delete remittance
 * 
 * TODO: Implement perCapitaRemittances schema to enable this functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// =====================================================================================
// GET - Get remittance details
// =====================================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Implement when perCapitaRemittances schema is created
  return NextResponse.json(
    { error: 'Per-capita remittances schema not yet implemented' },
    { status: 501 }
  );
}

// =====================================================================================
// PUT - Update remittance
// =====================================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Implement when perCapitaRemittances schema is created
  return NextResponse.json(
    { error: 'Per-capita remittances schema not yet implemented' },
    { status: 501 }
  );
}

// =====================================================================================
// DELETE - Delete remittance
// =====================================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Implement when perCapitaRemittances schema is created
  return NextResponse.json(
    { error: 'Per-capita remittances schema not yet implemented' },
    { status: 501 }
  );
}
