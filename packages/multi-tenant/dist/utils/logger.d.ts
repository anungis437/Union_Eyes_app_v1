export interface ILogger {
    info: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
}
export declare class SimpleLogger implements ILogger {
    private component;
    private logger;
    constructor(component: string);
    private format;
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}
//# sourceMappingURL=logger.d.ts.map