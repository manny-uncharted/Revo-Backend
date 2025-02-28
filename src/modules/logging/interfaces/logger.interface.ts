export interface ILogger {
  error(message: string, context?: string, trace?: string): void;
  warn(message: string, context?: string): void;
  info(message: string, context?: string): void;
  debug(message: string, context?: string): void;
  verbose(message: string, context?: string): void;
}

export interface LoggerOptions {
  environment: string;
  level: LogLevel;
  logDir?: string;
  maxSize?: string;
  maxFiles?: number;
  shipLogs?: boolean;
  logServiceUrl?: string;
  retentionPeriod?: number;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}
