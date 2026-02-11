/**
 * Data Domain
 * 
 * External data integration schemas.
 * 
 * This domain consolidates:
 * - wage-benchmarks-schema.ts
 * - lrb-agreements-schema.ts
 * - arbitration-precedents-schema.ts
 * - congress-memberships-schema.ts
 * 
 * Priority: 10
 */

// Export all data integration schemas from consolidated domain location
export * from './benchmarks';
export * from './lrb';
export * from './precedents';
export * from './congress';
