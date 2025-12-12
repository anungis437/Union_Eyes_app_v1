import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { put } from '@vercel/blob';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Upload and parse employer remittance file
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
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
    const blobFileName = `reconciliation/${member.tenantId}/${timestamp}-${file.name}`;
    const { url: fileUrl } = await put(blobFileName, fileContent, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    });

    // Return preview data (first 10 rows)
    const previewRows = rows.slice(0, 10);

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
    console.error('Upload reconciliation file error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
