/**
 * Insurance Integration Adapters
 * 
 * Export all insurance integration components.
 * 
 * Supported Providers:
 * - Sun Life Financial (Group Benefits)
 * - Manulife Financial (Insurance Claims)
 */

// Sun Life
export { SunLifeClient, type SunLifeConfig } from './sunlife-client';
export { SunLifeAdapter } from './sunlife-adapter';

// Manulife
export { ManulifeClient, type ManulifeConfig } from './manulife-client';
export { ManulifeAdapter } from './manulife-adapter';
