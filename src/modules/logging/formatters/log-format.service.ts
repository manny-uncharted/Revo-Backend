import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import { getLoggerConfig } from '../config/logging.config';

@Injectable()
export class LogFormatService {
  createConsoleFormat(): winston.Logform.Format {
    const { format } = winston;

    return format.combine(
      format.timestamp(),
      format.colorize(),
      format.printf(({ level, message, timestamp, context, trace }) => {
        const contextString = context ? `[${context}] ` : '';
        let logMessage = `${timestamp} ${level}: ${contextString}${message}`;

        if (trace) {
          logMessage += `\n${trace}`;
        }

        return logMessage;
      }),
    );
  }

  createFileFormat(): winston.Logform.Format {
    const { format } = winston;
    const config = getLoggerConfig();

    return format.combine(
      format.timestamp(),
      format.json(),
      format((info) => {
        info.environment = config.environment;
        info.service = process.env.SERVICE_NAME || 'revo-backend';
        return info;
      })(),
    );
  }
}
