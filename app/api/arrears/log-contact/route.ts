import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { arrearsCases, members } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Log contact attempt for an arrears case
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [currentMember] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await req.json();
    const { memberId, contactType, contactDate, outcome, notes, attachmentUrl } = body;

    // Validate required fields
    if (!memberId || !contactType || !contactDate || !outcome) {
      return NextResponse.json(
        { error: 'memberId, contactType, contactDate, and outcome are required' },
        { status: 400 }
      );
    }

    // Validate contact type
    const validContactTypes = ['phone_call', 'email_sent', 'letter_sent', 'in_person', 'text_message'];
    if (!validContactTypes.includes(contactType)) {
      return NextResponse.json(
        { error: 'Invalid contact type' },
        { status: 400 }
      );
    }

    // Validate outcome
    const validOutcomes = ['reached', 'voicemail', 'no_answer', 'payment_promised', 'refused', 'disputed', 'other'];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: 'Invalid outcome' },
        { status: 400 }
      );
    }

    // Get arrears case
    const [arrearsCase] = await db
      .select()
      .from(arrearsCases)
      .where(
        and(
          eq(arrearsCases.memberId, memberId),
          eq(arrearsCases.tenantId, currentMember.tenantId)
        )
      )
      .limit(1);

    if (!arrearsCase) {
      return NextResponse.json({ error: 'Arrears case not found' }, { status: 404 });
    }

    // Parse existing contact history
    let contactHistory = [];
    try {
      if (arrearsCase.contactHistory) {
        contactHistory = typeof arrearsCase.contactHistory === 'string'
          ? JSON.parse(arrearsCase.contactHistory)
          : arrearsCase.contactHistory;
      }
    } catch (parseError) {
      console.error('Error parsing contact history:', parseError);
      contactHistory = [];
    }

    // Create new contact entry
    const newContact = {
      id: crypto.randomUUID(),
      date: contactDate,
      type: contactType,
      outcome,
      notes: notes || '',
      attachmentUrl: attachmentUrl || null,
      recordedBy: userId,
      recordedByName: currentMember.name,
      recordedAt: new Date().toISOString(),
    };

    // Append to contact history
    contactHistory.push(newContact);

    // Update arrears case
    const [updatedCase] = await db
      .update(arrearsCases)
      .set({
        lastContactDate: new Date(contactDate),
        lastContactMethod: contactType,
        contactHistory: JSON.stringify(contactHistory),
        updatedAt: new Date(),
      })
      .where(eq(arrearsCases.id, arrearsCase.id))
      .returning();

    return NextResponse.json({
      message: 'Contact logged successfully',
      case: updatedCase,
      contact: newContact,
    });

  } catch (error) {
    console.error('Log contact error:', error);
    return NextResponse.json(
      { error: 'Failed to log contact' },
      { status: 500 }
    );
  }
}
