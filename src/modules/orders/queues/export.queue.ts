/* eslint-disable prettier/prettier */
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ExportService } from '../services/export.service';

@Processor('exportQueue')
export class ExportQueue {
  constructor(private readonly exportService: ExportService) {}

  @Process()
  async handleExport(job: Job) {
    await this.exportService.exportToCSV(job.data.orders, job.data.filename);
  }
}
