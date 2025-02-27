import { Controller, Post, Body, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registration endpoint
  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto.username, registerDto.password);
    const { password, ...result } = user;
    return result;
  }

  // Login endpoint
  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const user = await this.authService.login(loginDto.username, loginDto.password);
    req.session.userId = user.id;  // Session management
    const { password, ...result } = user;
    return result;
  }
}
