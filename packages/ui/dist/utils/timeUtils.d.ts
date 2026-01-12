/**
 * @fileoverview Time entry utility functions
 */
/**
 * Parse time entry input in various formats
 * Supports: "1.5h", "90m", "1h 30m", "1:30", "90", etc.
 */
export declare function parseTimeEntry(input: string): number;
/**
 * Calculate billable amount based on minutes and hourly rate
 */
export declare function calculateBillableAmount(minutes: number, hourlyRate: number): number;
/**
 * Format currency amount
 */
export declare function formatCurrency(amount: number): string;
/**
 * Format duration in minutes to human readable format
 */
export declare function formatDuration(minutes: number, format?: 'short' | 'long'): string;
//# sourceMappingURL=timeUtils.d.ts.map