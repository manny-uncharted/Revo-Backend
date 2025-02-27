import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse<Response>();
          const statusCode = response.statusCode;
          const responseTime = Date.now() - startTime;

          const message = `${method} ${url} ${statusCode} ${responseTime}ms`;

          if (statusCode >= 500) {
            this.logger.error(message, 'HTTP');
          } else if (statusCode >= 400) {
            this.logger.warn(message, 'HTTP');
          } else {
            this.logger.info(message, 'HTTP');
          }
        },
        error: (err: Error) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} 500 ${responseTime}ms - ${err.message}`,
            'HTTP',
            err.stack,
          );
        },
      }),
    );
  }
}
