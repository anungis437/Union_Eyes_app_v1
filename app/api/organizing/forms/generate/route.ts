import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Labour Board Form Generation API
 * Generate fillable PDF forms for provincial labour board certification applications
 * Phase 1: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

interface FormField {
  id: string;
  label: string;
  value: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { campaignId, templateId, formData } = await request.json();

      if (!campaignId || !templateId || !formData) {
        return NextResponse.json(
          { error: 'Campaign ID, template ID, and form data are required' },
          { status: 400 }
        );
      }

      // Fetch campaign details
      const campaignResult = await db.execute(sql`
      SELECT 
        oc.id,
        oc.campaign_name,
        oc.employer_name,
        oc.workplace_address,
        oc.total_eligible_workers as total_workers,
        oc.bargaining_unit_scope,
        oc.jurisdiction,
        oc.filing_deadline,
        o.name as organization_name,
        o.address as organization_address,
        COUNT(DISTINCT ocont.id) FILTER (WHERE ocont.card_signed = true) as cards_signed
      FROM organizing_campaigns oc
      INNER JOIN organizations o ON oc.organization_id = o.id
      LEFT JOIN organizing_contacts ocont ON ocont.campaign_id = oc.id
      WHERE oc.id = ${campaignId}
      GROUP BY 
        oc.id, oc.campaign_name, oc.employer_name, oc.workplace_address,
        oc.total_eligible_workers, oc.bargaining_unit_scope, oc.jurisdiction,
        oc.filing_deadline, o.name, o.address
    `);

      if (campaignResult.length === 0) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }

      const campaign = campaignResult[0];

      // Log certification application
      await db.execute(sql`
      INSERT INTO certification_applications (
        campaign_id,
        jurisdiction,
        application_type,
        form_template_id,
        form_data,
        submission_status,
        created_at
      ) VALUES (
        ${campaignId},
        ${campaign.jurisdiction},
        ${templateId},
        ${templateId},
        ${JSON.stringify(formData)}::jsonb,
        'draft',
        NOW()
      )
    `);

      // Generate PDF
      const pdfBytes = await generateFormPDF(templateId, formData, campaign);

      // Return PDF as downloadable file
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${templateId}_${String(campaign.employer_name || 'document').replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
        },
      });
    } catch (error) {
      console.error('Error generating form:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
  })(request);
};

async function generateFormPDF(
  templateId: string,
  formData: Record<string, string>,
  campaignData: any
): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size (8.5" x 11")
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 12;
  const titleFontSize = 16;

  let yPosition = height - 50;

  // Draw title
  const title = getFormTitle(templateId);
  page.drawText(title, {
    x: 50,
    y: yPosition,
    size: titleFontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 30;

  // Draw jurisdiction
  const jurisdiction = getJurisdiction(templateId);
  page.drawText(`Jurisdiction: ${jurisdiction}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  yPosition -= 30;

  // Draw form fields
  const fields = getFormFields(templateId);
  
  for (const field of fields) {
    if (yPosition < 100) {
      // Add new page if running out of space
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = height - 50;
    }

    // Draw field label
    page.drawText(`${field.label}:`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;

    // Draw field value
    const value = formData[field.id] || '';
    const lines = wrapText(value, 70);
    
    for (const line of lines) {
      page.drawText(line, {
        x: 70,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 18;
    }

    // Draw underline for empty fields
    if (!value) {
      page.drawLine({
        start: { x: 70, y: yPosition + 15 },
        end: { x: width - 50, y: yPosition + 15 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    }

    yPosition -= 15;
  }

  // Add footer with generation timestamp
  const footer = `Generated: ${new Date().toLocaleString()} | Campaign: ${campaignData.campaign_name}`;
  page.drawText(footer, {
    x: 50,
    y: 30,
    size: 8,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function getFormTitle(templateId: string): string {
  const titles: Record<string, string> = {
    'olrb-a1': 'Application for Certification - Ontario Labour Relations Board',
    'bclrb-cert': 'Application for Certification - BC Labour Relations Board',
    'cirb-cert': 'Application for Certification - Canada Industrial Relations Board',
  };
  return titles[templateId] || 'Labour Board Certification Application';
}

function getJurisdiction(templateId: string): string {
  const jurisdictions: Record<string, string> = {
    'olrb-a1': 'Ontario',
    'bclrb-cert': 'British Columbia',
    'cirb-cert': 'Federal (Canada Labour Code)',
  };
  return jurisdictions[templateId] || 'Unknown';
}

function getFormFields(templateId: string): Array<{ id: string; label: string }> {
  const fieldSets: Record<string, Array<{ id: string; label: string }>> = {
    'olrb-a1': [
      { id: 'union_name', label: 'Name of Trade Union' },
      { id: 'union_address', label: 'Union Address' },
      { id: 'employer_name', label: 'Employer Legal Name' },
      { id: 'employer_address', label: 'Employer Address' },
      { id: 'bargaining_unit', label: 'Proposed Bargaining Unit Description' },
      { id: 'employee_count', label: 'Number of Employees in Unit' },
      { id: 'membership_evidence', label: 'Membership Evidence Date' },
      { id: 'contact_name', label: 'Union Representative Name' },
      { id: 'contact_phone', label: 'Contact Phone' },
      { id: 'contact_email', label: 'Contact Email' },
    ],
    'bclrb-cert': [
      { id: 'union_name', label: 'Trade Union Name' },
      { id: 'employer_name', label: 'Employer Name' },
      { id: 'workplace_location', label: 'Workplace Location' },
      { id: 'unit_description', label: 'Bargaining Unit Description' },
      { id: 'employee_estimate', label: 'Estimated Number of Employees' },
      { id: 'membership_count', label: 'Number of Members in Unit' },
      { id: 'membership_date', label: 'Membership Evidence Date' },
      { id: 'applicant_name', label: 'Applicant Name' },
      { id: 'applicant_contact', label: 'Applicant Contact Information' },
    ],
    'cirb-cert': [
      { id: 'union_name', label: 'Union Name' },
      { id: 'union_registration', label: 'Union Registration Number' },
      { id: 'employer_legal_name', label: 'Employer Legal Name' },
      { id: 'employer_operating_name', label: 'Employer Operating Name' },
      { id: 'workplace_address', label: 'Principal Place of Business' },
      { id: 'unit_description', label: 'Bargaining Unit Description' },
      { id: 'employee_count', label: 'Number of Employees' },
      { id: 'member_count', label: 'Number of Union Members' },
      { id: 'representative_name', label: 'Union Representative Name' },
      { id: 'representative_contact', label: 'Representative Contact' },
    ],
  };
  return fieldSets[templateId] || [];
}

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}
