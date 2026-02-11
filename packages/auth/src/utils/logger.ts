export interface ILogger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

const globalLogger: Partial<ILogger> | null = (globalThis as any)?.__UNION_EYES_LOGGER__ || null;

export const logger: ILogger = {
  info: (message: string, meta?: any) => {
    globalLogger?.info?.(message, meta);
  },
  error: (message: string, meta?: any) => {
    globalLogger?.error?.(message, meta);
  },
  warn: (message: string, meta?: any) => {
    globalLogger?.warn?.(message, meta);
  },
  debug: (message: string, meta?: any) => {
    globalLogger?.debug?.(message, meta);
  },
};
