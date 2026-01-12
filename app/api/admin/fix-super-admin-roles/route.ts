import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationMembers } from '@/db/schema-organizations';
import { eq, and } from 'drizzle-orm';

const DEFAULT_ORG_ID = '458a56cb-251a-4c91-a0b5-81bb8ac39087';

const SUPER_ADMINS = [
  'user_37vyDm8LHilksYNuVBcenvdktBW', // a_nungisa@yahoo.ca
  'user_37Zo7OrvP4jy0J0MU5APfkDtE2V'  // michel@nungisalaw.ca
];

export async function POST(request: NextRequest) {
  try {
    const results = [];
    
    for (const userId of SUPER_ADMINS) {
      // Update to super_admin
      await db
        .update(organizationMembers)
        .set({
          role: 'super_admin',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, DEFAULT_ORG_ID)
          )
        );

      // Verify the update
      const [updated] = await db
        .select({
          userId: organizationMembers.userId,
          name: organizationMembers.name,
          email: organizationMembers.email,
          role: organizationMembers.role,
          status: organizationMembers.status
        })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, DEFAULT_ORG_ID)
          )
        )
        .limit(1);

      results.push(updated);
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin roles updated successfully',
      updates: results
    });
  } catch (error) {
    console.error('Error updating super admin roles:', error);
    return NextResponse.json(
      { error: 'Failed to update super admin roles', details: error },
      { status: 500 }
    );
  }
}
