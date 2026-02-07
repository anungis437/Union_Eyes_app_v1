import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberDocuments } from '@/db/schema/member-documents-schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
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
        userId: userId,
  });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  })(request);
};
