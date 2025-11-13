/**
 * @fileoverview Time entry utility functions
 */
/**
 * Parse time entry input in various formats
 * Supports: "1.5h", "90m", "1h 30m", "1:30", "90", etc.
 */
export function parseTimeEntry(input) {
    if (!input || typeof input !== 'string') {
        throw new Error('Time input is required');
    }
    const cleanInput = input.trim().toLowerCase();
    // Handle empty input
    if (!cleanInput) {
        throw new Error('Time input cannot be empty');
    }
    // Pattern 1: Hours with decimal (1.5h, 2.25h)
    const hourDecimalMatch = cleanInput.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/);
    if (hourDecimalMatch) {
        const hours = parseFloat(hourDecimalMatch[1]);
        return Math.round(hours * 60);
    }
    // Pattern 2: Minutes only (90m, 90 minutes)
    const minutesMatch = cleanInput.match(/^(\d+)\s*m(?:inutes?)?$/);
    if (minutesMatch) {
        return parseInt(minutesMatch[1], 10);
    }
    // Pattern 3: Hours and minutes (1h 30m, 1 hour 30 minutes)
    const hoursMinutesMatch = cleanInput.match(/^(\d+)\s*h(?:ours?)?\s+(\d+)\s*m(?:inutes?)?$/);
    if (hoursMinutesMatch) {
        const hours = parseInt(hoursMinutesMatch[1], 10);
        const minutes = parseInt(hoursMinutesMatch[2], 10);
        return hours * 60 + minutes;
    }
    // Pattern 4: Time format (1:30, 2:45)
    const timeFormatMatch = cleanInput.match(/^(\d+):(\d+)$/);
    if (timeFormatMatch) {
        const hours = parseInt(timeFormatMatch[1], 10);
        const minutes = parseInt(timeFormatMatch[2], 10);
        if (minutes >= 60) {
            throw new Error('Minutes cannot be 60 or greater in time format');
        }
        return hours * 60 + minutes;
    }
    // Pattern 5: Plain number (assume minutes)
    const plainNumberMatch = cleanInput.match(/^(\d+)$/);
    if (plainNumberMatch) {
        return parseInt(plainNumberMatch[1], 10);
    }
    // Pattern 6: Hours only (1h, 2 hours)
    const hoursOnlyMatch = cleanInput.match(/^(\d+)\s*h(?:ours?)?$/);
    if (hoursOnlyMatch) {
        const hours = parseInt(hoursOnlyMatch[1], 10);
        return hours * 60;
    }
    throw new Error('Invalid time format. Use formats like: 1.5h, 90m, 1h 30m, 1:30, or 90');
}
/**
 * Calculate billable amount based on minutes and hourly rate
 */
export function calculateBillableAmount(minutes, hourlyRate) {
    if (minutes < 0 || hourlyRate < 0) {
        return 0;
    }
    const hours = minutes / 60;
    return hours * hourlyRate;
}
/**
 * Format currency amount
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(amount);
}
/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes, format = 'short') {
    if (minutes < 60) {
        return format === 'short' ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const hourText = format === 'short' ? `${hours}h` : `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (remainingMinutes === 0) {
        return hourText;
    }
    if (format === 'short') {
        return `${hours}h ${remainingMinutes}m`;
    }
    const minuteText = `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    return `${hourText} ${minuteText}`;
}
//# sourceMappingURL=timeUtils.js.map