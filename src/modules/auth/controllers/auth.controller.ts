import {
  Controller,
  Post,
  Body,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Request } from 'express';
import { promisify } from 'util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registration endpoint
  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(
      registerDto.username,
      registerDto.password,
    );
    const { password: _password, ...result } = user;
    return result;
  }

  // Login endpoint
  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const user = await this.authService.login(
      loginDto.username,
      loginDto.password,
    );
    req.session.userId = user.id; // Session management
    const { password: _password, ...result } = user;
    return result;
  }

  @Post('logout')
  async logout(@Req() req: Request): Promise<{ message: string }> {
    if (!req.session) {
      throw new Error('Session not found');
    }
    
    // Promisify the destroy function for async/await usage
    const destroyAsync = promisify(req.session.destroy).bind(req.session);
    
    await destroyAsync();
    return { message: 'Logout successful' };
  }
}
