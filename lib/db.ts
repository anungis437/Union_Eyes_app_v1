// Re-export database module to support @/lib/db imports
export * from '@/db';

// Re-export sql helper from drizzle-orm for convenience
export { sql } from 'drizzle-orm';
