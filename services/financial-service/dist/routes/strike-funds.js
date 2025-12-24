"use strict";
/**
 * Strike Fund Operations Routes
 * Endpoints for strike fund management, picket attendance, and stipend calculations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// Validation schemas
const checkInSchema = zod_1.z.object({
    picketLocationId: zod_1.z.string().uuid(),
    checkInMethod: zod_1.z.enum(['nfc', 'qr_code', 'gps', 'manual']),
    deviceId: zod_1.z.string().optional(),
    nfcTagUid: zod_1.z.string().optional(),
    qrCodeData: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    coordinatorOverride: zod_1.z.boolean().default(false),
    notes: zod_1.z.string().optional(),
});
/**
 * POST /api/strike-funds/:fundId/check-in
 * Check in to picket line (NFC/QR/GPS/Manual)
 */
router.post('/:fundId/check-in', async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const { fundId } = req.params;
        const validatedData = checkInSchema.parse(req.body);
        // Check if already checked in
        const existingCheckIn = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT * FROM picket_attendance 
      WHERE member_id = ${userId} 
        AND fund_id = ${fundId} 
        AND check_out_time IS NULL
      LIMIT 1
    `);
        if (existingCheckIn.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Already checked in. Please check out first.',
            });
        }
        // Prepare location (WKT format for PostGIS)
        let locationVerified = false;
        let checkInLocation = null;
        if (validatedData.latitude && validatedData.longitude) {
            checkInLocation = `POINT(${validatedData.longitude} ${validatedData.latitude})`;
            if (validatedData.checkInMethod === 'gps') {
                const verification = await db_1.db.execute((0, drizzle_orm_1.sql) `
          SELECT verify_picket_location(
            ST_GeogFromText(${checkInLocation}), 
            ${validatedData.picketLocationId}
          ) as verified
        `);
                locationVerified = verification.rows[0]?.verified || false;
                if (!locationVerified && !validatedData.coordinatorOverride) {
                    return res.status(400).json({
                        success: false,
                        error: 'Location verification failed. Not within 100m of picket line.',
                    });
                }
            }
        }
        // Insert attendance record
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO picket_attendance (
        tenant_id, fund_id, member_id, picket_location_id,
        check_in_time, check_in_method, check_in_location,
        device_id, nfc_tag_uid, qr_code_data,
        location_verified, coordinator_override, notes, created_by
      ) VALUES (
        ${tenantId}, ${fundId}, ${userId}, ${validatedData.picketLocationId},
        NOW(), ${validatedData.checkInMethod}, 
        ${checkInLocation ? (0, drizzle_orm_1.sql) `ST_GeogFromText(${checkInLocation})` : null},
        ${validatedData.deviceId}, ${validatedData.nfcTagUid}, ${validatedData.qrCodeData},
        ${locationVerified || validatedData.coordinatorOverride}, 
        ${validatedData.coordinatorOverride}, ${validatedData.notes}, ${userId}
      )
      RETURNING *
    `);
        res.status(201).json({
            success: true,
            data: {
                attendance: result[0],
                locationVerified,
                message: 'Successfully checked in to picket line',
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
 * POST /api/strike-funds/:fundId/check-out
 * Check out from picket line
 */
router.post('/:fundId/check-out', async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const { fundId } = req.params;
        const checkOutSchema = zod_1.z.object({
            attendanceId: zod_1.z.string().uuid(),
            latitude: zod_1.z.number().optional(),
            longitude: zod_1.z.number().optional(),
        });
        const validatedData = checkOutSchema.parse(req.body);
        let checkOutLocation = null;
        if (validatedData.latitude && validatedData.longitude) {
            checkOutLocation = `POINT(${validatedData.longitude} ${validatedData.latitude})`;
        }
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE picket_attendance
      SET 
        check_out_time = NOW(),
        check_out_location = ${checkOutLocation ? (0, drizzle_orm_1.sql) `ST_GeogFromText(${checkOutLocation})` : null},
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 60,
        hours_worked = ROUND(CAST(EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 3600 AS NUMERIC), 2),
        updated_at = NOW()
      WHERE id = ${validatedData.attendanceId}
        AND member_id = ${userId}
        AND tenant_id = ${tenantId}
        AND check_out_time IS NULL
      RETURNING *
    `);
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No active check-in found',
            });
        }
        res.json({
            success: true,
            data: result[0],
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
 * POST /api/strike-funds/:fundId/stipends/calculate
 * Calculate weekly stipends
 */
router.post('/:fundId/stipends/calculate', async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const { fundId } = req.params;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        const calculateSchema = zod_1.z.object({
            weekStart: zod_1.z.coerce.date(),
            weekEnd: zod_1.z.coerce.date(),
            dryRun: zod_1.z.boolean().default(false),
        });
        const validatedData = calculateSchema.parse(req.body);
        // Use database function
        const results = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT * FROM calculate_weekly_stipend(
        ${fundId}, NULL, ${validatedData.weekStart}, ${validatedData.weekEnd}
      )
    `);
        if (validatedData.dryRun) {
            return res.json({
                success: true,
                data: {
                    dryRun: true,
                    results: results.rows,
                },
            });
        }
        // Create disbursement records
        const disbursements = [];
        for (const row of results.rows) {
            const disbursement = await db_1.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO stipend_disbursements (
          tenant_id, fund_id, member_id, week_start, week_end,
          hours_worked, total_amount, status, created_by
        ) VALUES (
          ${tenantId}, ${fundId}, ${row.member_id}, 
          ${validatedData.weekStart}, ${validatedData.weekEnd},
          ${row.hours_worked}, ${row.stipend_amount}, 
          'pending', ${userId}
        )
        RETURNING *
      `);
            disbursements.push(disbursement.rows[0]);
        }
        res.json({
            success: true,
            data: {
                totalDisbursements: disbursements.length,
                disbursements,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
 * GET /api/strike-funds
 * List all strike funds
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT * FROM strike_funds 
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/strike-funds
 * Create new strike fund
 */
router.post('/', async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        if (!['admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Only admins can create strike funds',
            });
        }
        const createSchema = zod_1.z.object({
            name: zod_1.z.string().min(1).max(100),
            description: zod_1.z.string().optional(),
            targetAmount: zod_1.z.coerce.number().positive(),
            weeklyStipendAmount: zod_1.z.coerce.number().positive(),
            startDate: zod_1.z.coerce.date(),
        });
        const validatedData = createSchema.parse(req.body);
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO strike_funds (
        tenant_id, name, description, target_amount,
        current_balance, weekly_stipend_amount, start_date,
        status, created_by
      ) VALUES (
        ${tenantId}, ${validatedData.name}, ${validatedData.description},
        ${validatedData.targetAmount.toString()}, '0',
        ${validatedData.weeklyStipendAmount.toString()}, ${validatedData.startDate},
        'active', ${userId}
      )
      RETURNING *
    `);
        res.status(201).json({
            success: true,
            data: result[0],
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.default = router;
//# sourceMappingURL=strike-funds.js.map