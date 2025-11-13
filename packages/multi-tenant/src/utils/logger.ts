// Temporary logger utility to work around SecurityLogger import issues
// This provides a simple console-based logger interface

export interface ILogger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

export class SimpleLogger implements ILogger {
  constructor(private component: string) {}
  
  info(message: string, meta?: any) {
    console.log(`[${this.component}] INFO: ${message}`, meta || '');
  }
  
  error(message: string, meta?: any) {
    console.error(`[${this.component}] ERROR: ${message}`, meta || '');
  }
  
  warn(message: string, meta?: any) {
    console.warn(`[${this.component}] WARN: ${message}`, meta || '');
  }
  
  debug(message: string, meta?: any) {
    console.debug(`[${this.component}] DEBUG: ${message}`, meta || '');
  }
}
