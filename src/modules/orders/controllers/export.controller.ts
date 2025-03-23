/* eslint-disable prettier/prettier */
import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('orders/export')
export class ExportController {
  constructor(
    @InjectQueue('exportQueue') private readonly exportQueue: Queue,
  ) {}

  @Get()
  async exportOrders() {
    const orders = [
      { id: 1, customerName: 'John Doe', amount: 100 },
      { id: 2, customerName: 'Jane Smith', amount: 200 },
    ];

    await this.exportQueue.add(
      'export-job',
      { orders, filename: `sales-report-${Date.now()}` },
      {
        priority: 1,
        attempts: 3,
      },
    );

    return { message: 'Export is being processed in the background.' };
  }
}
