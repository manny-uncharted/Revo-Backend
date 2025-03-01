import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { HashingService } from './hashing.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
  ) {}

  async register(username: string, password: string): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { username },
    });
    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }


    const hashedPassword = await this.hashingService.hashPassword(password);
    const newUser = this.usersRepository.create({
      username,
      password: hashedPassword,
    });
    return this.usersRepository.save(newUser);
  }

  

  async login(username: string, password: string): Promise<{ user: Partial<User>; accessToken: string }> {
    // Use usersRepository to find the user
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }



    // Use the HashingService to compare the password
    const isValid = await this.hashingService.comparePasswords(
      password,
      user.password,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

       // Generate JWT token (ADDED)
       const payload = { sub: user.id, username: user.username };
       const accessToken = this.jwtService.sign(payload);
   


  // Exclude the password field before returning
  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    accessToken,
  };
}

async findById(id: number): Promise<User | undefined> {
  // Use usersRepository to find the user by ID
  const user = await this.usersRepository.findOne({ where: { id } });
  if (!user) return undefined;

   
    
   // Exclude the password field before returning
   const { password, ...userWithoutPassword } = user;
   return userWithoutPassword as User;
 }
  

}
