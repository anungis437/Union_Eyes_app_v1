/**
 * Picket Tracking Service
 * Handles NFC/QR code check-ins, GPS verification, and attendance tracking
 */
export interface CheckInRequest {
    tenantId: string;
    strikeFundId: string;
    memberId: string;
    method: 'nfc' | 'qr_code' | 'gps' | 'manual';
    latitude?: number;
    longitude?: number;
    nfcTagUid?: string;
    qrCodeData?: string;
    deviceId?: string;
    coordinatorOverride?: boolean;
    overrideReason?: string;
    verifiedBy?: string;
}
export interface CheckOutRequest {
    tenantId: string;
    attendanceId: string;
    latitude?: number;
    longitude?: number;
}
export interface PicketLocation {
    latitude: number;
    longitude: number;
    radius?: number;
}
export interface AttendanceRecord {
    id: string;
    memberId: string;
    checkInTime: Date;
    checkOutTime?: Date;
    hoursWorked?: number;
    method: string;
    locationVerified: boolean;
}
export interface AttendanceSummary {
    memberId: string;
    totalHours: number;
    totalShifts: number;
    averageHoursPerShift: number;
    lastCheckIn?: Date;
}
/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export declare function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Verify GPS coordinates are within acceptable range of picket line
 */
export declare function verifyGPSLocation(checkInLat: number, checkInLon: number, picketLocation: PicketLocation): {
    verified: boolean;
    distance: number;
};
/**
 * Generate QR code data for member check-in
 */
export declare function generateQRCodeData(strikeFundId: string, memberId: string, timestamp?: Date): string;
/**
 * Validate QR code data
 */
export declare function validateQRCodeData(qrData: string): {
    valid: boolean;
    fundId?: string;
    memberId?: string;
    error?: string;
};
/**
 * Check in a member to picket line
 */
export declare function checkIn(request: CheckInRequest, picketLocation?: PicketLocation): Promise<{
    success: boolean;
    attendanceId?: string;
    error?: string;
    distance?: number;
}>;
/**
 * Check out a member from picket line
 */
export declare function checkOut(request: CheckOutRequest): Promise<{
    success: boolean;
    hoursWorked?: number;
    error?: string;
}>;
/**
 * Get active check-ins (not checked out)
 */
export declare function getActiveCheckIns(tenantId: string, strikeFundId: string): Promise<AttendanceRecord[]>;
/**
 * Get attendance history for a date range
 */
export declare function getAttendanceHistory(tenantId: string, strikeFundId: string, startDate: Date, endDate: Date, memberId?: string): Promise<AttendanceRecord[]>;
/**
 * Get attendance summary for members
 */
export declare function getAttendanceSummary(tenantId: string, strikeFundId: string, startDate: Date, endDate: Date, memberId?: string): Promise<AttendanceSummary[]>;
/**
 * Manual check-in override by coordinator
 */
export declare function coordinatorOverride(tenantId: string, strikeFundId: string, memberId: string, verifiedBy: string, reason: string, hours: number): Promise<{
    success: boolean;
    attendanceId?: string;
    error?: string;
}>;
//# sourceMappingURL=picket-tracking.d.ts.map