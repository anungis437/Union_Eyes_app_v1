// Temporary logger utility to work around SecurityLogger import issues
// This provides a simple console-based logger interface
export class SimpleLogger {
    constructor(component) {
        this.component = component;
    }
    info(message, meta) {
        console.log(`[${this.component}] INFO: ${message}`, meta || '');
    }
    error(message, meta) {
        console.error(`[${this.component}] ERROR: ${message}`, meta || '');
    }
    warn(message, meta) {
        console.warn(`[${this.component}] WARN: ${message}`, meta || '');
    }
    debug(message, meta) {
        console.debug(`[${this.component}] DEBUG: ${message}`, meta || '');
    }
}
//# sourceMappingURL=logger.js.map