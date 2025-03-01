import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LogRetentionTask {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('LogRetention');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runLogRetention() {
    try {
      await this.logger.performLogRetention();
      this.logger.info('Log retention task completed');
    } catch (error) {
      this.logger.error(
        'Log retention task failed',
        'LogRetention',
        error.stack,
      );
    }
  }
}
