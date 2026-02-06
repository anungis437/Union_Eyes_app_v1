/**
 * Member Documents API Route
 * Fetch member's uploaded documents
 */
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberDocuments } from '@/db/schema/member-documents-schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch member's documents from database
    const documents = await db
      .select()
      .from(memberDocuments)
      .where(eq(memberDocuments.userId, userId))
      .orderBy(desc(memberDocuments.uploadedAt));

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        name: doc.fileName,
        type: doc.fileType,
        category: doc.category || 'General',
        uploadDate: doc.uploadedAt,
        size: doc.fileSize,
        url: doc.fileUrl,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch documents', error as Error, {
      userId: (await auth()).userId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
