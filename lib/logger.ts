/**
 * Production Logging Utility
 * Structured logging with levels, context, and proper formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const CURRENT_LEVEL = process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;

interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] ${entry.level}: ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    const contextStr = Object.entries(entry.context)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    return `${base} ${contextStr}`;
  }

  return base;
}

function shouldLog(level: LogLevel): boolean {
  return level >= CURRENT_LEVEL;
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "DEBUG",
      message,
      context,
    };
    console.debug(formatLog(entry));
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.INFO)) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "INFO",
      message,
      context,
    };
    console.info(formatLog(entry));
  },

  warn(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.WARN)) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "WARN",
      message,
      context,
    };
    console.warn(formatLog(entry));
  },

  error(message: string, error?: Error, context?: LogContext): void {
    if (!shouldLog(LogLevel.ERROR)) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message,
      context,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    };
    console.error(formatLog(entry));
  },

  // Child logger with persistent context
  withContext(baseContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...baseContext, ...context }),
      error: (message: string, error?: Error, context?: LogContext) =>
        logger.error(message, error, { ...baseContext, ...context }),
    };
  },
};
