/**
 * Employer Remittances Routes
 * Endpoints for managing employer bulk payments and reconciliation
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { db, schema } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { RemittanceParser, ReconciliationEngine } from '@union-claims/financial';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Validation schemas
const createRemittanceSchema = z.object({
  employerId: z.string().uuid(),
  batchNumber: z.string().min(1).max(50),
  billingPeriodStart: z.coerce.date(),
  billingPeriodEnd: z.coerce.date(),
  totalAmount: z.coerce.number().positive(),
  totalMembers: z.number().int().positive(),
  remittanceDate: z.coerce.date(),
  paymentMethod: z.enum(['check', 'ach', 'wire', 'credit_card']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const reconcileSchema = z.object({
  transactionIds: z.array(z.string().uuid()).optional(),
  autoMatch: z.boolean().default(true),
});

/**
 * GET /api/remittances
 * List all remittances with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).user;
    const { employerId, status, batchNumber } = req.query;

    const conditions = [eq(schema.employerRemittances.tenantId, tenantId)];

    if (employerId) {
      conditions.push(eq(schema.employerRemittances.employerId, employerId as string));
    }
    if (status) {
      conditions.push(eq(schema.employerRemittances.processingStatus, status as any));
    }
    if (batchNumber) {
      conditions.push(eq(schema.employerRemittances.batchNumber, batchNumber as string));
    }

    const remittances = await db
      .select()
      .from(schema.employerRemittances)
      .where(and(...conditions))
      .orderBy(desc(schema.employerRemittances.remittanceDate))
      .limit(100);

    res.json({
      success: true,
      data: remittances,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/remittances/:id
 * Get single remittance with matched transactions
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).user;
    const { id } = req.params;

    const [remittance] = await db
      .select()
      .from(schema.employerRemittances)
      .where(
        and(
          eq(schema.employerRemittances.id, id),
          eq(schema.employerRemittances.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!remittance) {
      return res.status(404).json({
        success: false,
        error: 'Remittance not found',
      });
    }

    // Fetch matched transactions
    const transactions = await db
      .select()
      .from(schema.duesTransactions)
      .where(
        and(
          eq(schema.duesTransactions.remittanceId, id),
          eq(schema.duesTransactions.tenantId, tenantId)
        )
      );

    res.json({
      success: true,
      data: {
        remittance,
        matchedTransactions: transactions,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/remittances
 * Create a new remittance record
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, role } = (req as any).user;

    if (!['admin', 'financial_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    const validatedData = createRemittanceSchema.parse(req.body);

    // Check for duplicate batch number
    const [existing] = await db
      .select()
      .from(schema.employerRemittances)
      .where(
        and(
          eq(schema.employerRemittances.tenantId, tenantId),
          eq(schema.employerRemittances.batchNumber, validatedData.batchNumber)
        )
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Batch number already exists',
      });
    }

    const [remittance] = await db
      .insert(schema.employerRemittances)
      .values({
        tenantId,
        employerId: validatedData.employerId,
        batchNumber: validatedData.batchNumber,
        billingPeriodStart: validatedData.billingPeriodStart,
        billingPeriodEnd: validatedData.billingPeriodEnd,
        totalAmount: validatedData.totalAmount.toString(),
        totalMembers: validatedData.totalMembers,
        remittanceDate: validatedData.remittanceDate,
        paymentMethod: validatedData.paymentMethod,
        referenceNumber: validatedData.referenceNumber,
        processingStatus: 'pending',
        notes: validatedData.notes,
        createdBy: userId,
      } as any)
      .returning();

    res.status(201).json({
      success: true,
      data: remittance,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/remittances/:id/reconcile
 * Reconcile remittance with dues transactions
 */
router.post('/:id/reconcile', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, role } = (req as any).user;
    const { id } = req.params;

    if (!['admin', 'financial_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    const validatedData = reconcileSchema.parse(req.body);

    // Fetch remittance
    const [remittance] = await db
      .select()
      .from(schema.employerRemittances)
      .where(
        and(
          eq(schema.employerRemittances.id, id),
          eq(schema.employerRemittances.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!remittance) {
      return res.status(404).json({
        success: false,
        error: 'Remittance not found',
      });
    }

    if (remittance.processingStatus === 'reconciled') {
      return res.status(400).json({
        success: false,
        error: 'Remittance already reconciled',
      });
    }

    let transactionsToMatch: any[] = [];

    if (validatedData.transactionIds && validatedData.transactionIds.length > 0) {
      // Manual matching with specified transaction IDs
      transactionsToMatch = await db
        .select()
        .from(schema.duesTransactions)
        .where(
          and(
            eq(schema.duesTransactions.tenantId, tenantId),
            sql`${schema.duesTransactions.id} = ANY(${validatedData.transactionIds})`
          )
        );
    } else if (validatedData.autoMatch) {
      // Auto-match: Find pending transactions for same period
      transactionsToMatch = await db
        .select()
        .from(schema.duesTransactions)
        .where(
          and(
            eq(schema.duesTransactions.tenantId, tenantId),
            eq(schema.duesTransactions.periodStart, remittance.periodStart),
            eq(schema.duesTransactions.periodEnd, remittance.periodEnd),
            eq(schema.duesTransactions.status, 'pending')
          )
        );
    }

    if (transactionsToMatch.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No matching transactions found',
      });
    }

    // Calculate matched total
    const matchedTotal = transactionsToMatch.reduce(
      (sum, t) => sum + Number(t.totalAmount),
      0
    );
    const expectedTotal = Number(remittance.totalAmount);
    const variance = expectedTotal - matchedTotal;

    // Update transactions with remittance link
    await db
      .update(schema.duesTransactions)
      .set({
        remittanceId: id,
        status: 'paid', // Correct field name is 'status', not 'paymentStatus'
        paidDate: new Date(remittance.remittanceDate), // Convert date string to Date for timestamp field
      })
      .where(
        and(
          eq(schema.duesTransactions.tenantId, tenantId),
          sql`${schema.duesTransactions.id} = ANY(${transactionsToMatch.map((t) => t.id)})`
        )
      );

    // Update remittance status
    const newStatus = Math.abs(variance) < 0.01 ? 'reconciled' : 'variance_detected';
    
    const [updatedRemittance] = await db
      .update(schema.employerRemittances)
      .set({
        processingStatus: newStatus,
        matchedTransactions: transactionsToMatch.length.toString(),
        matchedAmount: matchedTotal.toString(),
        varianceAmount: variance.toString(),
        reconciledAt: new Date(), // Timestamp field expects Date object
        reconciledBy: userId,
      })
      .where(eq(schema.employerRemittances.id, id))
      .returning();

    res.json({
      success: true,
      data: {
        remittance: updatedRemittance,
        matchedTransactions: transactionsToMatch.length,
        matchedAmount: matchedTotal,
        expectedAmount: expectedTotal,
        variance,
        status: newStatus,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/remittances/:id
 * Update remittance details
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, role } = (req as any).user;
    const { id } = req.params;

    if (!['admin', 'financial_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    const updateSchema = z.object({
      notes: z.string().optional(),
      referenceNumber: z.string().optional(),
    });

    const validatedData = updateSchema.parse(req.body);

    const [updatedRemittance] = await db
      .update(schema.employerRemittances)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.employerRemittances.id, id),
          eq(schema.employerRemittances.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedRemittance) {
      return res.status(404).json({
        success: false,
        error: 'Remittance not found',
      });
    }

    res.json({
      success: true,
      data: updatedRemittance,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/remittances/upload
 * Upload and parse remittance file (CSV, Excel, XML)
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, role } = (req as any).user;

    if (!['admin', 'financial_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const file = req.file;
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    // Parse configuration from request body
    const parserConfig = req.body.config ? JSON.parse(req.body.config) : {};

    const parser = new RemittanceParser(parserConfig);
    let parseResult;

    // Parse based on file type
    if (fileExtension === 'csv') {
      parseResult = await parser.parseCSV(file.buffer);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parseResult = await parser.parseExcel(file.buffer);
    } else if (fileExtension === 'xml') {
      parseResult = await parser.parseXML(file.buffer);
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type: ${fileExtension}. Supported types: csv, xlsx, xls, xml`,
      });
    }

    res.json({
      success: parseResult.success,
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        parsedRecords: parseResult.records,
        summary: parseResult.summary,
        errors: parseResult.errors,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/remittances/:id/reconcile
 * Auto-reconcile remittance with transactions
 */
router.post('/:id/reconcile', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, role } = (req as any).user;
    const { id } = req.params;

    if (!['admin', 'financial_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    // Fetch remittance
    const [remittance] = await db
      .select()
      .from(schema.employerRemittances)
      .where(
        and(
          eq(schema.employerRemittances.id, id),
          eq(schema.employerRemittances.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!remittance) {
      return res.status(404).json({
        success: false,
        error: 'Remittance not found',
      });
    }

    // Fetch remittance details (parsed records should be stored in JSON field or separate table)
    // For now, assuming they're in req.body.records
    const remittanceRecords = req.body.records || [];

    if (remittanceRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No remittance records provided. Upload and parse file first.',
      });
    }

    // Fetch existing transactions for the billing period
    const transactions = await db
      .select()
      .from(schema.duesTransactions)
      .where(
        and(
          eq(schema.duesTransactions.tenantId, tenantId),
          eq(schema.duesTransactions.transactionType, 'charge'),
          sql`${schema.duesTransactions.periodStart} >= ${remittance.billingPeriodStart}`,
          sql`${schema.duesTransactions.periodEnd} <= ${remittance.billingPeriodEnd}`
        )
      );

    // Run reconciliation
    const reconciliationEngine = new ReconciliationEngine();
    const reconciliationResult = await reconciliationEngine.reconcile({
      remittanceId: id,
      remittanceRecords,
      existingTransactions: transactions.map((t: any) => ({
        id: t.id,
        memberId: t.memberId,
        amount: Number(t.amount),
        periodStart: t.periodStart,
        periodEnd: t.periodEnd,
        status: t.status,
        remittanceId: t.remittanceId || undefined,
      })) as any[],
      tenantId,
    });

    // If auto-apply is enabled, update matched transactions
    if (req.body.autoApply !== false && reconciliationResult.success) {
      for (const match of reconciliationResult.matches) {
        await db
          .update(schema.duesTransactions)
          .set({
            remittanceId: id,
            status: 'paid',
            paidDate: new Date(remittance.remittanceDate), // Convert date string to Date for timestamp field
          })
          .where(eq(schema.duesTransactions.id, match.transactionId));
      }

      // Update remittance status
      await db
        .update(schema.employerRemittances)
        .set({
          processingStatus: reconciliationResult.variances.length === 0 ? 'completed' : 'needs_review',
          matchedTransactions: reconciliationResult.summary.matchedCount.toString(),
          totalVariance: reconciliationResult.summary.totalVariance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(schema.employerRemittances.id, id));
    }

    // Generate report
    const report = reconciliationEngine.generateReport(reconciliationResult);

    res.json({
      success: true,
      data: {
        reconciliation: reconciliationResult,
        report,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/remittances/:id/report
 * Generate reconciliation report
 */
router.get('/:id/report', async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).user;
    const { id } = req.params;
    const { format = 'json' } = req.query;

    // Fetch remittance
    const [remittance] = await db
      .select()
      .from(schema.employerRemittances)
      .where(
        and(
          eq(schema.employerRemittances.id, id),
          eq(schema.employerRemittances.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!remittance) {
      return res.status(404).json({
        success: false,
        error: 'Remittance not found',
      });
    }

    // Fetch matched transactions
    const transactions = await db
      .select()
      .from(schema.duesTransactions)
      .where(
        and(
          eq(schema.duesTransactions.remittanceId, id),
          eq(schema.duesTransactions.tenantId, tenantId)
        )
      );

    const reportData = {
      remittance: {
        id: remittance.id,
        batchNumber: remittance.batchNumber,
        employerId: remittance.employerId,
        totalAmount: remittance.totalAmount,
        totalMembers: remittance.totalMembers,
        remittanceDate: remittance.remittanceDate,
        processingStatus: remittance.processingStatus,
        matchedTransactions: remittance.matchedTransactions,
        totalVariance: remittance.totalVariance,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        memberId: t.memberId,
        amount: t.amount,
        status: t.status,
        paidDate: t.paidDate,
      })),
      summary: {
        matchedCount: transactions.length,
        totalReconciled: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
        variance: remittance.totalVariance,
      },
    };

    if (format === 'text') {
      // Generate text report
      const lines = [
        '=== REMITTANCE REPORT ===',
        '',
        `Batch Number: ${remittance.batchNumber}`,
        `Remittance Date: ${remittance.remittanceDate}`, // Already a string from database
        `Total Amount: $${Number(remittance.totalAmount).toFixed(2)}`,
        `Total Members: ${remittance.totalMembers}`,
        `Status: ${remittance.processingStatus}`,
        '',
        '--- Matched Transactions ---',
        ...transactions.map(
          (t) =>
            `${t.memberId}: $${Number(t.amount).toFixed(2)} - ${t.status} (${t.paidDate ? t.paidDate.toISOString().split('T')[0] : 'N/A'})`
        ),
        '',
        `Total Matched: ${transactions.length}`,
        `Total Reconciled: $${reportData.summary.totalReconciled.toFixed(2)}`,
        `Variance: $${Number(remittance.totalVariance || 0).toFixed(2)}`,
        '',
        '=== END OF REPORT ===',
      ];

      res.setHeader('Content-Type', 'text/plain');
      res.send(lines.join('\n'));
    } else {
      res.json({
        success: true,
        data: reportData,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
