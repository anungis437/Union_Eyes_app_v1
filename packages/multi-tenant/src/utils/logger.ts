// Temporary logger utility to work around SecurityLogger import issues
// Uses an injected global logger when available to avoid direct console usage.

export interface ILogger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

export class SimpleLogger implements ILogger {
  private logger: Partial<ILogger> | null;

  constructor(private component: string) {
    this.logger = (globalThis as any)?.__UNION_EYES_LOGGER__ || null;
  }

  private format(message: string): string {
    return `[${this.component}] ${message}`;
  }

  info(message: string, meta?: any) {
    this.logger?.info?.(this.format(message), meta);
  }

  error(message: string, meta?: any) {
    this.logger?.error?.(this.format(message), meta);
  }

  warn(message: string, meta?: any) {
    this.logger?.warn?.(this.format(message), meta);
  }

  debug(message: string, meta?: any) {
    this.logger?.debug?.(this.format(message), meta);
  }
}
