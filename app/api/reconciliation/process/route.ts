import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { members, duesTransactions, employerRemittances } from '@/services/financial-service/src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

// Process reconciliation file and match with transactions
export const POST = async (req: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Get member to verify tenant
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.user.id, user.id))
        .limit(1);

      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      const body = await req.json();
      const { 
        fileUrl, 
        columnMapping, 
        periodStart, 
        periodEnd,
        employerName,
        employerId,
      } = body;

      // Validate required fields
      if (!fileUrl || !columnMapping || !periodStart || !periodEnd) {
        return NextResponse.json(
          { error: 'fileUrl, columnMapping, periodStart, and periodEnd are required' },
          { status: 400 }
        );
      }

      // Download file from URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to download file' }, { status: 400 });
      }

      const fileBuffer = await response.arrayBuffer();
      const fileContent = Buffer.from(fileBuffer);

      // Detect file type from URL
      const isCSV = fileUrl.toLowerCase().includes('.csv');
      let rows: any[] = [];

      if (isCSV) {
        const text = fileContent.toString('utf-8');
        const parseResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });
        rows = parseResult.data;
      } else {
        const workbook = XLSX.read(fileContent, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
      }

      // Generate batch number
      const batchNumber = `REM-${Date.now()}`;
      const periodStartDate = new Date(periodStart).toISOString().split('T')[0];
      const periodEndDate = new Date(periodEnd).toISOString().split('T')[0];

      // Create employer remittance record
      const [remittance] = await db
        .insert(employerRemittances)
        .values({
          tenantId: member.tenantId,
          employerName: employerName || 'Unknown Employer',
          employerId: employerId || null,
          batchNumber,
          remittanceDate: periodStartDate,
          remittancePeriodStart: periodStartDate,
          remittancePeriodEnd: periodEndDate,
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
          billingPeriodStart: periodStartDate,
          billingPeriodEnd: periodEndDate,
          totalAmount: '0',
          remittedAmount: '0',
          memberCount: '0',
          totalMembers: '0',
          fileUrl,
          status: 'pending',
          varianceAmount: '0',
          metadata: { uploadedBy: member.id },
        })
        .returning();

      // Process each row and match with transactions
      const results = [];
      let totalAmount = 0;
      let matchedAmount = 0;
      let matchedCount = 0;
      let unknownMemberCount = 0;
      let amountMismatchCount = 0;
      let periodMismatchCount = 0;

      for (const row of rows) {
        const memberIdentifier = row[columnMapping.memberId];
        const amount = parseFloat(row[columnMapping.amount] || '0');
        const period = row[columnMapping.period] || periodStart;

        totalAmount += amount;

        let matchStatus = 'unmatched';
        let variance = 0;
        let transaction = null;
        let memberRecord = null;

        // Find member by identifier (could be membershipNumber, email, or ID)
        const [foundMember] = await db
          .select()
          .from(members)
          .where(
            and(
              eq(members.tenantId, member.tenantId),
              sql`(
              ${members.membershipNumber} = ${memberIdentifier} OR
              ${members.email} = ${memberIdentifier} OR
              ${members.id}::text = ${memberIdentifier}
            )`
            )
          )
          .limit(1);

        if (!foundMember) {
          matchStatus = 'unknown_member';
          unknownMemberCount++;
          results.push({
            row,
            matchStatus,
            variance,
            transaction: null,
            member: null,
            error: 'Member not found',
          });
          continue;
        }

        memberRecord = foundMember;

        // Exact match: member + period + amount
        const [exactMatch] = await db
          .select()
          .from(duesTransactions)
          .where(
            and(
              eq(duesTransactions.memberId, foundMember.id),
              eq(duesTransactions.tenantId, member.tenantId),
              sql`${duesTransactions.periodStart} <= ${new Date(period)}`,
              sql`${duesTransactions.periodEnd} >= ${new Date(periodEnd)}`,
              sql`ABS(CAST(${duesTransactions.totalAmount} AS NUMERIC) - ${amount}) < 0.01`
            )
          )
          .limit(1);

        if (exactMatch) {
          matchStatus = 'matched';
          transaction = exactMatch;
          matchedAmount += amount;
          matchedCount++;
        } else {
          // Partial match: member + period, but wrong amount
          const [partialMatch] = await db
            .select()
            .from(duesTransactions)
            .where(
              and(
                eq(duesTransactions.memberId, foundMember.id),
                eq(duesTransactions.tenantId, member.tenantId),
                sql`${duesTransactions.periodStart} <= ${new Date(period)}`,
                sql`${duesTransactions.periodEnd} >= ${new Date(periodEnd)}`
              )
            )
            .limit(1);

          if (partialMatch) {
            matchStatus = 'amount_mismatch';
            variance = amount - parseFloat(partialMatch.totalAmount || '0');
            transaction = partialMatch;
            amountMismatchCount++;
          } else {
            matchStatus = 'period_mismatch';
            periodMismatchCount++;
          }
        }

        results.push({
          row,
          matchStatus,
          variance,
          transaction,
          member: memberRecord ? {
            id: memberRecord.id,
            name: memberRecord.name,
            email: memberRecord.email,
            membershipNumber: memberRecord.membershipNumber,
          } : null,
        });
      }

      // Update remittance record with results
      const unmatchedAmount = totalAmount - matchedAmount;
      const varianceAmountCalc = results.reduce((sum, r) => sum + Math.abs(r.variance), 0);

      await db
        .update(employerRemittances)
        .set({
          totalAmount: totalAmount.toFixed(2),
          matchedAmount: matchedAmount.toFixed(2),
          unmatchedAmount: unmatchedAmount.toFixed(2),
          varianceAmount: varianceAmountCalc.toFixed(2),
          memberCount: rows.length.toString(),
          matchedTransactions: matchedCount.toString(),
          status: 'processed',
          reconciliationStatus: 'processed',
          reconciliationDate: new Date(),
          reconciledBy: user.id,
          metadata: { results },
          updatedAt: new Date(),
        })
        .where(eq(employerRemittances.id, remittance.id));

      // Calculate summary
      const summary = {
        totalRows: rows.length,
        matchedCount,
        matchedPercentage: ((matchedCount / rows.length) * 100).toFixed(2),
        unmatchedCount: rows.length - matchedCount,
        unmatchedPercentage: (((rows.length - matchedCount) / rows.length) * 100).toFixed(2),
        totalAmount,
        matchedAmount,
        unmatchedAmount,
        totalVariance: varianceAmountCalc,
        breakdown: {
          exactMatches: matchedCount,
          unknownMembers: unknownMemberCount,
          amountMismatches: amountMismatchCount,
          periodMismatches: periodMismatchCount,
        },
      };

      return NextResponse.json({
        message: 'Reconciliation completed',
        remittanceId: remittance.id,
        batchNumber,
        summary,
        results,
      });

    } catch (error) {
      console.error('Process reconciliation error:', error);
      return NextResponse.json(
        { error: 'Failed to process reconciliation' },
        { status: 500 }
      );
    }
  })
  })(request);
};
