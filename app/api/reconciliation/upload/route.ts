import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { members } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { put } from '@vercel/blob';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// Upload and parse employer remittance file
export const POST = async (req: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting: 10 reconciliation operations per hour per user
      const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.RECONCILIATION);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Too many reconciliation requests.',
            resetIn: rateLimitResult.resetIn 
          },
          { 
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      // Get member to verify organization
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.userId, userId))
        .limit(1);

      if (!member) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Member not found'
    );
      }

      // Parse multipart form data
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'No file uploaded');
      }

      // Validate file type
      const fileName = file.name.toLowerCase();
      const isCSV = fileName.endsWith('.csv');
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      if (!isCSV && !isExcel) {
        return NextResponse.json(
          { error: 'File must be CSV or Excel format' },
          { status: 400 }
        );
      }

      // Read file content
      const buffer = await file.arrayBuffer();
      const fileContent = Buffer.from(buffer);

      // Parse based on file type
      let rows: any[] = [];
      let headers: string[] = [];

      if (isCSV) {
        const text = fileContent.toString('utf-8');
        const parseResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        if (parseResult.errors.length > 0) {
          return NextResponse.json(
            { error: 'CSV parsing error', details: parseResult.errors },
            { status: 400 }
          );
        }

        rows = parseResult.data;
        headers = parseResult.meta.fields || [];
      } else {
        // Parse Excel
        const workbook = XLSX.read(fileContent, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        rows = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: '',
        });

        if (rows.length > 0) {
          headers = Object.keys(rows[0]);
        }
      }

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'File is empty or has no valid data' },
          { status: 400 }
        );
      }

      // Upload file to Vercel Blob Storage
      const timestamp = Date.now();
      const blobFileName = `reconciliation/${member.organizationId}/${timestamp}-${file.name}`;
      const { url: fileUrl } = await put(blobFileName, fileContent, {
        access: 'public',
        contentType: file.type || 'application/octet-stream',
      });

      // Return preview data (first 10 rows)
      const previewRows = rows.slice(0, 10);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/reconciliation/upload',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          fileName: file.name,
          fileType: isCSV ? 'csv' : 'excel',
          totalRows: rows.length,
        },
      });

      return NextResponse.json({
        message: 'File uploaded successfully',
        fileUrl,
        fileName: file.name,
        fileType: isCSV ? 'csv' : 'excel',
        totalRows: rows.length,
        headers,
        previewRows,
        uploadedAt: new Date().toISOString(),
      });

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/reconciliation/upload',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to upload file',
      error
    );
    }
    })(request);
};

