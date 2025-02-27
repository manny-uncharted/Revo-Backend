import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as Transport from 'winston-transport';
import * as fs from 'fs';
import * as path from 'path';

import { ILogger } from '../interfaces/logger.interface';
import { getLoggerConfig, getLogLevels } from '../config/logging.config';
import { LogFormatService } from '../formatters/log-format.service';

@Injectable()
export class LoggerService implements ILogger, NestLoggerService {
  private logger: winston.Logger;
  private context: string;

  constructor(private readonly formatService: LogFormatService) {
    this.initializeLogger();
  }

  private initializeLogger(): void {
    const config = getLoggerConfig();

    if (!fs.existsSync(config.logDir)) {
      fs.mkdirSync(config.logDir, { recursive: true });
    }

    const transports: Transport[] = [
      new winston.transports.Console({
        level: config.level,
        format: this.formatService.createConsoleFormat(),
      }),

      new winston.transports.DailyRotateFile({
        level: config.level,
        dirname: config.logDir,
        filename: 'application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: config.maxSize,
        maxFiles: config.maxFiles,
        format: this.formatService.createFileFormat(),
      }),

      new winston.transports.DailyRotateFile({
        level: 'error',
        dirname: config.logDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: config.maxSize,
        maxFiles: config.maxFiles,
        format: this.formatService.createFileFormat(),
      }),
    ];

    // Add HTTP transport for log shipping if configured
    if (config.shipLogs && config.logServiceUrl) {
      transports.push(
        new winston.transports.Http({
          host: new URL(config.logServiceUrl).hostname,
          port: Number(new URL(config.logServiceUrl).port) || 80,
          path: new URL(config.logServiceUrl).pathname,
          ssl: new URL(config.logServiceUrl).protocol === 'https:',
          format: this.formatService.createFileFormat(),
        }),
      );
    }

    this.logger = winston.createLogger({
      levels: getLogLevels(),
      transports,
    });
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  error(message: string, context?: string, trace?: string): void {
    this.logger.error(message, {
      context: context || this.context,
      trace,
    });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, {
      context: context || this.context,
    });
  }

  info(message: string, context?: string): void {
    this.logger.info(message, {
      context: context || this.context,
    });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, {
      context: context || this.context,
    });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, {
      context: context || this.context,
    });
  }

  log(message: string, context?: string): void {
    this.info(message, context);
  }

  async performLogRetention(): Promise<void> {
    const config = getLoggerConfig();
    if (!config.retentionPeriod) return;

    const logDir = config.logDir;
    const files = fs.readdirSync(logDir);
    const now = new Date();

    for (const file of files) {
      if (file.includes('audit')) continue;

      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);

      const fileDate = new Date(stats.mtime);
      const ageInDays =
        (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays > config.retentionPeriod) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
