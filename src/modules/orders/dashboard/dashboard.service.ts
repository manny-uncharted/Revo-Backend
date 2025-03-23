/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DashboardService {
  constructor(private readonly httpService: HttpService) {}

  async fetchDashboardData(startDate: string, endDate: string) {
    const salesReport = await firstValueFrom(
      this.httpService.get<{ data: any }>(
        `/orders/sales-report?startDate=${startDate}&endDate=${endDate}`,
      ),
    ).then((response: { data: any }) => response.data);

    const orderMetrics = await firstValueFrom(
      this.httpService.get<{ data: any }>(
        `/orders/order-metrics?startDate=${startDate}&endDate=${endDate}`,
      ),
    ).then((response: { data: any }) => response.data);

    return {
      salesReport: salesReport.data,
      orderMetrics: orderMetrics.data,
    };
  }
}
