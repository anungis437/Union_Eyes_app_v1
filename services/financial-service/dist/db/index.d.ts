import * as schema from './schema';
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export { schema };
export declare function checkDatabaseConnection(): Promise<boolean>;
export declare function closeDatabaseConnection(): Promise<void>;
//# sourceMappingURL=index.d.ts.map