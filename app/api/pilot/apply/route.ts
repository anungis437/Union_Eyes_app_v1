/**
 * Pilot Application API Endpoint
 * 
 * POST /api/pilot/apply - Submit pilot application with readiness assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pilotApplications, pilotMetrics } from '@/db/schema/domains/marketing';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessment, ...applicationData } = body;

    // Validate required fields
    if (
      !applicationData.organizationName ||
      !applicationData.contactEmail ||
      !applicationData.memberCount
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert pilot application
    const [application] = await db
      .insert(pilotApplications)
      .values({
        organizationName: applicationData.organizationName,
        organizationType: applicationData.organizationType || 'local',
        contactName: applicationData.contactName,
        contactEmail: applicationData.contactEmail,
        contactPhone: applicationData.contactPhone,
        memberCount: applicationData.memberCount,
        jurisdictions: applicationData.jurisdictions || [],
        sectors: applicationData.sectors || [],
        currentSystem: applicationData.currentSystem,
        challenges: applicationData.challenges || [],
        goals: applicationData.goals || [],
        readinessScore: assessment?.score || 0,
        readinessLevel: assessment?.level || 'needs-preparation',
        estimatedSetupTime: assessment?.estimatedSetupTime || 'TBD',
        supportLevel: assessment?.supportLevel || 'standard',
        status: 'pending',
        responses: applicationData.responses || {},
      })
      .returning();

    // Send notification email to team (implement separately)
    // await sendPilotApplicationNotification(application);

    return NextResponse.json(
      {
        success: true,
        applicationId: application.id,
        readinessLevel: assessment?.level,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Pilot application error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = db.select().from(pilotApplications);

    if (status) {
      query = query.where(eq(pilotApplications.status, status));
    }

    const applications = await query;

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
