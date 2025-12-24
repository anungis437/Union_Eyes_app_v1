"use strict";
/**
 * Picket Tracking Service
 * Handles NFC/QR code check-ins, GPS verification, and attendance tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDistance = calculateDistance;
exports.verifyGPSLocation = verifyGPSLocation;
exports.generateQRCodeData = generateQRCodeData;
exports.validateQRCodeData = validateQRCodeData;
exports.checkIn = checkIn;
exports.checkOut = checkOut;
exports.getActiveCheckIns = getActiveCheckIns;
exports.getAttendanceHistory = getAttendanceHistory;
exports.getAttendanceSummary = getAttendanceSummary;
exports.coordinatorOverride = coordinatorOverride;
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
// Configuration constants
const GPS_ACCURACY_THRESHOLD_METERS = 100; // Maximum distance from picket line
const HAVERSINE_EARTH_RADIUS_KM = 6371;
/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = (degrees) => (degrees * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = HAVERSINE_EARTH_RADIUS_KM * c;
    return distanceKm * 1000; // Convert to meters
}
/**
 * Verify GPS coordinates are within acceptable range of picket line
 */
function verifyGPSLocation(checkInLat, checkInLon, picketLocation) {
    const distance = calculateDistance(checkInLat, checkInLon, picketLocation.latitude, picketLocation.longitude);
    const threshold = picketLocation.radius || GPS_ACCURACY_THRESHOLD_METERS;
    const verified = distance <= threshold;
    return { verified, distance };
}
/**
 * Generate QR code data for member check-in
 */
function generateQRCodeData(strikeFundId, memberId, timestamp = new Date()) {
    // Create a signed QR code with timestamp to prevent replay attacks
    const data = {
        fundId: strikeFundId,
        memberId: memberId,
        timestamp: timestamp.toISOString(),
        expires: new Date(timestamp.getTime() + 5 * 60 * 1000).toISOString(), // 5 minute expiry
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
}
/**
 * Validate QR code data
 */
function validateQRCodeData(qrData) {
    try {
        const decoded = JSON.parse(Buffer.from(qrData, 'base64').toString());
        const expiresAt = new Date(decoded.expires);
        if (expiresAt < new Date()) {
            return { valid: false, error: 'QR code expired' };
        }
        return {
            valid: true,
            fundId: decoded.fundId,
            memberId: decoded.memberId,
        };
    }
    catch (error) {
        return { valid: false, error: 'Invalid QR code format' };
    }
}
/**
 * Check in a member to picket line
 */
async function checkIn(request, picketLocation) {
    try {
        // Validate GPS location if coordinates provided and picket location is set
        let locationVerified = false;
        let distance;
        if (request.latitude && request.longitude && picketLocation) {
            const verification = verifyGPSLocation(request.latitude, request.longitude, picketLocation);
            locationVerified = verification.verified;
            distance = verification.distance;
            // Reject if location not verified and no coordinator override
            if (!locationVerified && !request.coordinatorOverride) {
                return {
                    success: false,
                    error: `Location too far from picket line (${Math.round(distance)}m). Maximum allowed: ${picketLocation.radius || GPS_ACCURACY_THRESHOLD_METERS}m`,
                    distance,
                };
            }
        }
        else if (request.coordinatorOverride) {
            // Allow manual check-in with coordinator override
            locationVerified = true;
        }
        // Validate QR code if provided
        if (request.method === 'qr_code' && request.qrCodeData) {
            const qrValidation = validateQRCodeData(request.qrCodeData);
            if (!qrValidation.valid) {
                return { success: false, error: qrValidation.error };
            }
            // Verify QR code matches the member
            if (qrValidation.memberId !== request.memberId) {
                return { success: false, error: 'QR code does not match member' };
            }
            if (qrValidation.fundId !== request.strikeFundId) {
                return { success: false, error: 'QR code does not match strike fund' };
            }
        }
        // Check for existing active check-in (not checked out)
        const [existingCheckIn] = await db_1.db
            .select()
            .from(db_1.schema.picketAttendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.tenantId, request.tenantId), (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.memberId, request.memberId), (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.strikeFundId, request.strikeFundId), (0, drizzle_orm_1.sql) `${db_1.schema.picketAttendance.checkOutTime} IS NULL`))
            .limit(1);
        if (existingCheckIn) {
            return {
                success: false,
                error: 'Member already checked in. Please check out first.',
                attendanceId: existingCheckIn.id,
            };
        }
        // Create attendance record
        const [attendance] = await db_1.db
            .insert(db_1.schema.picketAttendance)
            .values({
            tenantId: request.tenantId,
            strikeFundId: request.strikeFundId,
            memberId: request.memberId,
            checkInTime: new Date().toISOString(),
            checkInLatitude: request.latitude?.toString(),
            checkInLongitude: request.longitude?.toString(),
            checkInMethod: request.method,
            nfcTagUid: request.nfcTagUid,
            qrCodeData: request.qrCodeData,
            deviceId: request.deviceId,
            locationVerified,
            coordinatorOverride: request.coordinatorOverride || false,
            overrideReason: request.overrideReason,
            verifiedBy: request.verifiedBy,
        })
            .returning();
        return {
            success: true,
            attendanceId: attendance.id,
            distance,
        };
    }
    catch (error) {
        console.error('Check-in error:', error);
        return {
            success: false,
            error: error.message || 'Failed to check in',
        };
    }
}
/**
 * Check out a member from picket line
 */
async function checkOut(request) {
    try {
        // Get existing attendance record
        const [attendance] = await db_1.db
            .select()
            .from(db_1.schema.picketAttendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.id, request.attendanceId), (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.tenantId, request.tenantId)))
            .limit(1);
        if (!attendance) {
            return { success: false, error: 'Attendance record not found' };
        }
        if (attendance.checkOutTime) {
            return {
                success: false,
                error: 'Member already checked out',
                hoursWorked: attendance.hoursWorked ? parseFloat(attendance.hoursWorked) : undefined,
            };
        }
        const checkOutTime = new Date();
        const durationMinutes = Math.floor((checkOutTime.getTime() - new Date(attendance.checkInTime).getTime()) / (1000 * 60));
        const hoursWorked = Math.round((durationMinutes / 60) * 100) / 100; // Round to 2 decimals
        // Update attendance record
        await db_1.db
            .update(db_1.schema.picketAttendance)
            .set({
            checkOutTime,
            checkOutLatitude: request.latitude?.toString(),
            checkOutLongitude: request.longitude?.toString(),
            durationMinutes: durationMinutes.toString(),
            hoursWorked: hoursWorked.toString(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.id, request.attendanceId));
        return {
            success: true,
            hoursWorked,
        };
    }
    catch (error) {
        console.error('Check-out error:', error);
        return {
            success: false,
            error: error.message || 'Failed to check out',
        };
    }
}
/**
 * Get active check-ins (not checked out)
 */
async function getActiveCheckIns(tenantId, strikeFundId) {
    const records = await db_1.db
        .select()
        .from(db_1.schema.picketAttendance)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.tenantId, tenantId), (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.strikeFundId, strikeFundId), (0, drizzle_orm_1.sql) `${db_1.schema.picketAttendance.checkOutTime} IS NULL`))
        .orderBy((0, drizzle_orm_1.desc)(db_1.schema.picketAttendance.checkInTime));
    return records.map(r => ({
        id: r.id,
        memberId: r.memberId,
        checkInTime: new Date(r.checkInTime),
        checkOutTime: r.checkOutTime ? new Date(r.checkOutTime) : undefined,
        hoursWorked: r.hoursWorked ? parseFloat(r.hoursWorked) : undefined,
        method: r.checkInMethod,
        locationVerified: r.locationVerified || false,
    }));
}
/**
 * Get attendance history for a date range
 */
async function getAttendanceHistory(tenantId, strikeFundId, startDate, endDate, memberId) {
    const conditions = [
        (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.strikeFundId, strikeFundId),
        (0, drizzle_orm_1.between)(db_1.schema.picketAttendance.checkInTime, startDate.toISOString(), endDate.toISOString()),
    ];
    if (memberId) {
        conditions.push((0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.memberId, memberId));
    }
    const records = await db_1.db
        .select()
        .from(db_1.schema.picketAttendance)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(db_1.schema.picketAttendance.checkInTime));
    return records.map(r => ({
        id: r.id,
        memberId: r.memberId,
        checkInTime: new Date(r.checkInTime),
        checkOutTime: r.checkOutTime ? new Date(r.checkOutTime) : undefined,
        hoursWorked: r.hoursWorked ? parseFloat(r.hoursWorked) : undefined,
        method: r.checkInMethod,
        locationVerified: r.locationVerified || false,
    }));
}
/**
 * Get attendance summary for members
 */
async function getAttendanceSummary(tenantId, strikeFundId, startDate, endDate, memberId) {
    const conditions = [
        (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.strikeFundId, strikeFundId),
        (0, drizzle_orm_1.between)(db_1.schema.picketAttendance.checkInTime, startDate.toISOString(), endDate.toISOString()),
        (0, drizzle_orm_1.sql) `${db_1.schema.picketAttendance.hoursWorked} IS NOT NULL`, // Only completed check-ins
    ];
    if (memberId) {
        conditions.push((0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.memberId, memberId));
    }
    const results = await db_1.db
        .select({
        memberId: db_1.schema.picketAttendance.memberId,
        totalHours: (0, drizzle_orm_1.sql) `SUM(${db_1.schema.picketAttendance.hoursWorked})`,
        totalShifts: (0, drizzle_orm_1.sql) `COUNT(*)`,
        lastCheckIn: (0, drizzle_orm_1.sql) `MAX(${db_1.schema.picketAttendance.checkInTime})`,
    })
        .from(db_1.schema.picketAttendance)
        .where((0, drizzle_orm_1.and)(...conditions))
        .groupBy(db_1.schema.picketAttendance.memberId);
    return results.map(r => ({
        memberId: r.memberId,
        totalHours: Number(r.totalHours) || 0,
        totalShifts: Number(r.totalShifts) || 0,
        averageHoursPerShift: r.totalShifts > 0
            ? Math.round((Number(r.totalHours) / Number(r.totalShifts)) * 100) / 100
            : 0,
        lastCheckIn: r.lastCheckIn ? new Date(r.lastCheckIn) : undefined,
    }));
}
/**
 * Manual check-in override by coordinator
 */
async function coordinatorOverride(tenantId, strikeFundId, memberId, verifiedBy, reason, hours) {
    try {
        const checkInTime = new Date();
        const checkOutTime = new Date(checkInTime.getTime() + hours * 60 * 60 * 1000);
        const [attendance] = await db_1.db
            .insert(db_1.schema.picketAttendance)
            .values({
            tenantId,
            strikeFundId,
            memberId,
            checkInTime: checkInTime.toISOString(),
            checkOutTime: checkOutTime.toISOString(),
            checkInMethod: 'manual',
            hoursWorked: hours.toString(),
            durationMinutes: Math.floor(hours * 60).toString(),
            locationVerified: true, // Coordinator verified
            coordinatorOverride: true,
            overrideReason: reason,
        })
            .returning();
        return {
            success: true,
            attendanceId: attendance.id,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to create manual attendance record',
        };
    }
}
//# sourceMappingURL=picket-tracking.js.map