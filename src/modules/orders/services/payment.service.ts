import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { PaymentDto } from '../dtos/payment.dto';
import { Payment } from '../entities/payment.entity';

console.log(process.env.STRIPE_SECRET_KEY);

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2025-02-24.acacia',
      },
    );
  }

  async processPayment(paymentDto: PaymentDto) {
    const maxRetries = 3;
    let attempt = 0;
    let paymentIntent: Stripe.PaymentIntent | null = null;

    while (attempt < maxRetries) {
        try {
            paymentIntent = await this.stripe.paymentIntents.create({
                amount: paymentDto.amount * 100, 
                currency: paymentDto.currency,
                metadata: { userId: paymentDto.userId, orderId: paymentDto.orderId },
            });
            break; 
        } catch (error) {
            attempt++;
            this.logger.warn(`Payment attempt ${attempt} failed: ${error.message}`);
            if (attempt >= maxRetries) {
                this.logger.error('Payment processing failed after multiple attempts', error);
                throw new HttpException('Payment processing failed', HttpStatus.BAD_REQUEST);
            }
        }
    }

    const trackingId = generateUniqueCode(6)  ;

    const payment = this.paymentRepository.create({
      userId: paymentDto.userId,
      orderId: paymentDto.orderId,
      amount: paymentDto.amount,
      currency: paymentDto.currency,
      transactionId: paymentIntent.id,
      trackingId: trackingId
  });
    return await this.paymentRepository.save(payment);
}

  async refundPayment(transactionId: string) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: transactionId,
      });

      await this.paymentRepository.update({ transactionId }, { status: 'refunded' });
      return refund;
    } catch (error) {
      this.logger.error('Refund processing failed', error);
      throw new HttpException('Refund processing failed', HttpStatus.BAD_REQUEST);
    }
  }

  async getPaymentStatus(transactionId: string) {
    return await this.paymentRepository.findOne({ where: { transactionId } });
  }

  async getPaymentByTrackingId(trackingId: string) {
    return await this.paymentRepository.findOne({ where: { trackingId } });
  }

  async getPaymentsByUserId(userId: number) {
    return await this.paymentRepository.find({ where: { userId } });
  }

  async handleWebhook(event: Stripe.Event) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await this.paymentRepository.update({ transactionId: paymentIntent.id }, { status: 'completed' });
    }
  }
}
function uuidv4() {
  throw new Error('Function not implemented.');
}

export function generateUniqueCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
  }
  return result;
}
