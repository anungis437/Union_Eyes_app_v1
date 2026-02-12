// Temporary logger utility to work around SecurityLogger import issues
// Uses an injected global logger when available to avoid direct console usage.
export class SimpleLogger {
    constructor(component) {
        this.component = component;
        this.logger = globalThis?.__UNION_EYES_LOGGER__ || null;
    }
    format(message) {
        return `[${this.component}] ${message}`;
    }
    info(message, meta) {
        this.logger?.info?.(this.format(message), meta);
    }
    error(message, meta) {
        this.logger?.error?.(this.format(message), meta);
    }
    warn(message, meta) {
        this.logger?.warn?.(this.format(message), meta);
    }
    debug(message, meta) {
        this.logger?.debug?.(this.format(message), meta);
    }
}
//# sourceMappingURL=logger.js.map