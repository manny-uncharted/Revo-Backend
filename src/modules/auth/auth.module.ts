import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { HashingService } from './services/hashing.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, HashingService],
})
export class AuthModule {}
