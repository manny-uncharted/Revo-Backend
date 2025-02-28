import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LogFormatService } from './formatters/log-format.service';
import { LoggerService } from './services/logger.service';
import { LogRetentionTask } from './tasks/log-retention.task';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [LogFormatService, LoggerService, LogRetentionTask],
  exports: [LoggerService],
})
export class LoggingModule {}
