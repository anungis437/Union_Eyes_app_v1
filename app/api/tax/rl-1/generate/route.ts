import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * RL-1 Tax Slip Generation API
 * Generate Quebec RL-1 slips for COPE/PAC contributions
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { jsPDF } from 'jspdf';
import { put } from '@vercel/blob';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { year } = await request.json();

      if (!year || year < 2020 || year > new Date().getFullYear()) {
        return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
      }

      // Calculate annual COPE and PAC contributions from dues transactions
      const result = await db.execute(sql`
      SELECT 
        dt.member_id,
        SUM(dt.cope_amount) as total_cope,
        SUM(dt.pac_amount) as total_pac
      FROM dues_transactions dt
      WHERE dt.member_id = ${userId}
        AND dt.status = 'paid'
        AND EXTRACT(YEAR FROM dt.paid_date) = ${year}
      GROUP BY dt.member_id
    `);

      if (!result || (Array.isArray(result) && result.length === 0)) {
        return NextResponse.json({ 
          error: 'No contributions found for specified year' 
        }, { status: 404 });
      }

      const data = Array.isArray(result) ? result[0] : result;
      const totalContributions = Number(data.total_cope) + Number(data.total_pac);

      // Generate RL-1 PDF
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RELEVÉ 1 (RL-1)', 105, 20, { align: 'center' });
      doc.text('REVENUS D\'EMPLOI ET REVENUS DIVERS', 105, 28, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Année d'imposition: ${year}`, 105, 38, { align: 'center' });
      
      // Employer information (Box A)
      doc.setFont('helvetica', 'bold');
      doc.text('A - EMPLOYEUR / PAYEUR', 20, 55);
      doc.setFont('helvetica', 'normal');
      doc.text('Union Organization', 20, 63);
      doc.text(`Numéro d'entreprise du Québec: N/A`, 20, 71);
      
      // Employee information (Box B)
      doc.setFont('helvetica', 'bold');
      doc.text('B - EMPLOYÉ / BÉNÉFICIAIRE', 20, 90);
      doc.setFont('helvetica', 'normal');
      doc.text(`Member: ${userId}`, 20, 98);
      doc.text(`Address: N/A`, 20, 106);
      doc.text(`NAS: N/A`, 20, 114);
      
      // Box G - Union dues (COPE + PAC contributions)
      doc.setFont('helvetica', 'bold');
      doc.text('G - COTISATIONS SYNDICALES', 20, 145);
      doc.setFontSize(14);
      doc.text(`$${totalContributions.toFixed(2)}`, 20, 155);
      
      // Breakdown
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cotisations COPE: $${Number(data.total_cope).toFixed(2)}`, 30, 165);
      doc.text(`Cotisations PAC: $${Number(data.total_pac).toFixed(2)}`, 30, 173);
      
      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Ce relevé doit être conservé avec vos documents fiscaux.', 105, 260, { align: 'center' });
      doc.text('Les cotisations syndicales sont déductibles d\'impôt selon la ligne 212 de votre déclaration.', 105, 268, { align: 'center' });
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-CA')}`, 105, 280, { align: 'center' });
      
      // Convert PDF to buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      // Upload to Vercel Blob
      const filename = `rl1-${year}-${userId}-${Date.now()}.pdf`;
      const blob = await put(`tax-slips/${userId}/${filename}`, pdfBuffer, {
        access: 'public',
        contentType: 'application/pdf',
      });
      
      logger.info('RL-1 tax slip generated successfully', {
        userId,
        year,
        totalContributions,
        slipUrl: blob.url,
      });
      
      return NextResponse.json({
        success: true,
        year,
        totalContributions,
        copeAmount: Number(data.total_cope),
        pacAmount: Number(data.total_pac),
        slipUrl: blob.url,
      });
    } catch (error) {
      logger.error('Failed to generate RL-1 tax slip', error as Error, {
        userId: userId,
  });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  })(request);
};
