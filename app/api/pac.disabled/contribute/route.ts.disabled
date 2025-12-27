import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pacContributions, members } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await req.json();
    const { 
      amount, 
      electionCycle, 
      committeeName,
      employer,
      occupation,
      address,
      city,
      state,
      zip,
    } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid contribution amount' 
      }, { status: 400 });
    }

    // FEC compliance: Contributions over $200 require additional information
    if (amount > 200 && (!employer || !occupation)) {
      return NextResponse.json({ 
        error: 'Contributions over $200 require employer and occupation information for FEC compliance' 
      }, { status: 400 });
    }

    // Parse member metadata (stored as JSON string)
    const memberMetadata = member.metadata ? JSON.parse(member.metadata) : {};

    // Get or create Stripe customer
    let customerId = memberMetadata.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0]?.emailAddress,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : member.name,
        metadata: {
          userId,
          memberId: member.id,
          tenantId: member.tenantId,
        },
      });
      customerId = customer.id;

      // Store customer ID in member metadata
      await db
        .update(members)
        .set({
          metadata: JSON.stringify({ ...memberMetadata, stripeCustomerId: customerId }),
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      description: `PAC Contribution - ${electionCycle}`,
      metadata: {
        userId,
        memberId: member.id,
        tenantId: member.tenantId,
        contributionType: 'pac',
        electionCycle,
        committeeName,
      },
    });

    // Create contribution record
    const [contribution] = await db.insert(pacContributions).values({
      tenantId: member.tenantId,
      memberId: member.id,
      amount: amount.toString(),
      contributionDate: new Date().toISOString().split('T')[0],
      electionCycle,
      committeeName,
      fecCompliant: true,
      contributorEmployer: employer,
      contributorOccupation: occupation,
      contributorAddress: address,
      contributorCity: city,
      contributorState: state,
      contributorZip: zip,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
    }).returning();

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      contributionId: contribution.id,
    });

  } catch (error) {
    console.error('PAC contribution error:', error);
    return NextResponse.json(
      { error: 'Failed to process contribution' },
      { status: 500 }
    );
  }
}
