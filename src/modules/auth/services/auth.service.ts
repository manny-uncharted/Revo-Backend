import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HashingService } from './hashing.service';

interface User {
  id: number;
  username: string;
  password: string; // stored as hashed password
}

@Injectable()
export class AuthService {
  private users: User[] = [];
  private nextId = 1;

  constructor(private readonly hashingService: HashingService) {}

  async register(username: string, password: string): Promise<User> {
    // Check for duplicate username
    if (this.users.find(user => user.username === username)) {
      throw new BadRequestException('Username already exists');
    }

    // Hash the password using the HashingService
    const hashedPassword = await this.hashingService.hashPassword(password);
    const newUser: User = {
      id: this.nextId++,
      username,
      password: hashedPassword,
    };

    this.users.push(newUser);
    return newUser;
  }

  async login(username: string, password: string): Promise<User> {
    const user = this.users.find(user => user.username === username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Use the HashingService to compare the password
    const isValid = await this.hashingService.comparePasswords(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
