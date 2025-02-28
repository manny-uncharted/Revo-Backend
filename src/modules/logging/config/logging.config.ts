import { LogLevel, LoggerOptions } from '../interfaces/logger.interface';
import * as path from 'path';

const defaultConfig: LoggerOptions = {
  environment: process.env.NODE_ENV || 'development',
  level: LogLevel.INFO,
  logDir: path.join(process.cwd(), 'logs'),
  maxSize: '20m',
  maxFiles: 14,
  shipLogs: false,
  retentionPeriod: 30,
};

const environmentConfigs: Record<string, Partial<LoggerOptions>> = {
  development: {
    level: LogLevel.DEBUG,
    shipLogs: false,
  },
  test: {
    level: LogLevel.DEBUG,
    shipLogs: false,
  },
  staging: {
    level: LogLevel.INFO,
    shipLogs: true,
    logServiceUrl: process.env.LOG_SERVICE_URL,
  },
  production: {
    level: LogLevel.WARN,
    shipLogs: true,
    logServiceUrl: process.env.LOG_SERVICE_URL,
    retentionPeriod: 90,
  },
};

export function getLoggerConfig(): LoggerOptions {
  const environment = process.env.NODE_ENV || 'development';
  const envConfig = environmentConfigs[environment] || {};

  return {
    ...defaultConfig,
    ...envConfig,
    environment,
  };
}

export function getLogLevels() {
  return {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4,
  };
}
