"use strict";
/**
 * Picket Tracking Routes
 * Endpoints for NFC/QR code check-ins, GPS verification, and attendance management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const PicketService = __importStar(require("../services/picket-tracking"));
const router = (0, express_1.Router)();
// Validation schemas
const checkInSchema = zod_1.z.object({
    strikeFundId: zod_1.z.string().uuid(),
    memberId: zod_1.z.string().uuid(),
    method: zod_1.z.enum(['nfc', 'qr_code', 'gps', 'manual']),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    nfcTagUid: zod_1.z.string().optional(),
    qrCodeData: zod_1.z.string().optional(),
    deviceId: zod_1.z.string().optional(),
    coordinatorOverride: zod_1.z.boolean().optional(),
    overrideReason: zod_1.z.string().optional(),
    verifiedBy: zod_1.z.string().optional(),
    picketLocation: zod_1.z.object({
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
        radius: zod_1.z.number().positive().optional(),
    }).optional(),
});
const checkOutSchema = zod_1.z.object({
    attendanceId: zod_1.z.string().uuid(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
});
const coordinatorOverrideSchema = zod_1.z.object({
    strikeFundId: zod_1.z.string().uuid(),
    memberId: zod_1.z.string().uuid(),
    hours: zod_1.z.number().positive().max(24),
    reason: zod_1.z.string().min(10),
    verifiedBy: zod_1.z.string().min(1),
});
/**
 * POST /api/picket/check-in
 * Check in a member to picket line
 */
router.post('/check-in', async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const validatedData = checkInSchema.parse(req.body);
        const result = await PicketService.checkIn({
            tenantId,
            strikeFundId: validatedData.strikeFundId,
            memberId: validatedData.memberId,
            method: validatedData.method,
            latitude: validatedData.latitude,
            longitude: validatedData.longitude,
            nfcTagUid: validatedData.nfcTagUid,
            qrCodeData: validatedData.qrCodeData,
            deviceId: validatedData.deviceId,
            coordinatorOverride: validatedData.coordinatorOverride,
            overrideReason: validatedData.overrideReason,
            verifiedBy: validatedData.verifiedBy,
        }, validatedData.picketLocation);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
                distance: result.distance,
            });
        }
        res.json({
            success: true,
            data: {
                attendanceId: result.attendanceId,
                distance: result.distance,
                message: 'Checked in successfully',
            },
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors,
            });
        }
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check in',
        });
    }
});
/**
 * POST /api/picket/check-out
 * Check out a member from picket line
 */
router.post('/check-out', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const validatedData = checkOutSchema.parse(req.body);
        const result = await PicketService.checkOut({
            tenantId,
            attendanceId: validatedData.attendanceId,
            latitude: validatedData.latitude,
            longitude: validatedData.longitude,
        });
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.json({
            success: true,
            data: {
                hoursWorked: result.hoursWorked,
                message: 'Checked out successfully',
            },
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors,
            });
        }
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check out',
        });
    }
});
/**
 * GET /api/picket/active
 * Get all active check-ins (not checked out)
 */
router.get('/active', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { strikeFundId } = req.query;
        if (!strikeFundId || typeof strikeFundId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'strikeFundId is required',
            });
        }
        const records = await PicketService.getActiveCheckIns(tenantId, strikeFundId);
        res.json({
            success: true,
            data: records,
            count: records.length,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch active check-ins',
        });
    }
});
/**
 * GET /api/picket/history
 * Get attendance history for a date range
 */
router.get('/history', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { strikeFundId, startDate, endDate, memberId } = req.query;
        if (!strikeFundId || typeof strikeFundId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'strikeFundId is required',
            });
        }
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required',
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
            });
        }
        const records = await PicketService.getAttendanceHistory(tenantId, strikeFundId, start, end, memberId);
        res.json({
            success: true,
            data: records,
            count: records.length,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch attendance history',
        });
    }
});
/**
 * GET /api/picket/summary
 * Get attendance summary for members
 */
router.get('/summary', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { strikeFundId, startDate, endDate, memberId } = req.query;
        if (!strikeFundId || typeof strikeFundId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'strikeFundId is required',
            });
        }
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required',
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
            });
        }
        const summary = await PicketService.getAttendanceSummary(tenantId, strikeFundId, start, end, memberId);
        res.json({
            success: true,
            data: summary,
            count: summary.length,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch attendance summary',
        });
    }
});
/**
 * POST /api/picket/generate-qr
 * Generate QR code data for member check-in
 */
router.post('/generate-qr', async (req, res) => {
    try {
        const { strikeFundId, memberId } = req.body;
        if (!strikeFundId || !memberId) {
            return res.status(400).json({
                success: false,
                error: 'strikeFundId and memberId are required',
            });
        }
        const qrData = PicketService.generateQRCodeData(strikeFundId, memberId);
        res.json({
            success: true,
            data: {
                qrData,
                expiresIn: '5 minutes',
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate QR code',
        });
    }
});
/**
 * POST /api/picket/validate-qr
 * Validate QR code data
 */
router.post('/validate-qr', async (req, res) => {
    try {
        const { qrData } = req.body;
        if (!qrData) {
            return res.status(400).json({
                success: false,
                error: 'qrData is required',
            });
        }
        const validation = PicketService.validateQRCodeData(qrData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error,
            });
        }
        res.json({
            success: true,
            data: {
                fundId: validation.fundId,
                memberId: validation.memberId,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to validate QR code',
        });
    }
});
/**
 * POST /api/picket/coordinator-override
 * Manual check-in/out by coordinator with specified hours
 */
router.post('/coordinator-override', async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        // Only coordinators and admins can use this endpoint
        if (!['admin', 'coordinator', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions. Coordinator role required.',
            });
        }
        const validatedData = coordinatorOverrideSchema.parse(req.body);
        const result = await PicketService.coordinatorOverride(tenantId, validatedData.strikeFundId, validatedData.memberId, validatedData.verifiedBy, validatedData.reason, validatedData.hours);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }
        res.json({
            success: true,
            data: {
                attendanceId: result.attendanceId,
                message: 'Manual attendance record created successfully',
            },
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors,
            });
        }
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create manual attendance',
        });
    }
});
/**
 * POST /api/picket/calculate-distance
 * Calculate distance between two GPS coordinates
 */
router.post('/calculate-distance', async (req, res) => {
    try {
        const { lat1, lon1, lat2, lon2 } = req.body;
        if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
            return res.status(400).json({
                success: false,
                error: 'lat1, lon1, lat2, and lon2 are required',
            });
        }
        const distance = PicketService.calculateDistance(Number(lat1), Number(lon1), Number(lat2), Number(lon2));
        res.json({
            success: true,
            data: {
                distanceMeters: Math.round(distance),
                distanceFeet: Math.round(distance * 3.28084),
                distanceMiles: (distance / 1609.34).toFixed(2),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to calculate distance',
        });
    }
});
exports.default = router;
//# sourceMappingURL=picket-tracking.js.map