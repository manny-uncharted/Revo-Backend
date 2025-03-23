/* eslint-disable prettier/prettier */
import { EntityRepository, Repository } from 'typeorm';
import { Order } from '../entities/order.entity';

@EntityRepository(Order)
export class OrderRepository extends Repository<Order> {
  createQueryBuilder: any;
  create: any;
  save: any;
  findOne: any;
  find: any;
  softDelete: any;
  async getSalesReport(startDate: string, endDate: string): Promise<any> {
    return this.createQueryBuilder('order')
      .select('SUM(order.amount)', 'totalSales')
      .where('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();
  }

  async getOrderMetrics(startDate: string, endDate: string): Promise<any> {
    return this.createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect('AVG(order.amount)', 'averageOrderAmount')
      .where('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();
  }
}
