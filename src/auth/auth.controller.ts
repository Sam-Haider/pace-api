import { Controller, Post, Body, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string }) {
    const user = await this.authService.findUserByEmail(body.email);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = this.authService.generateToken(user.id, user.email);
    return { 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        weeklyGoalHours: user.weeklyGoalHours,
        createdAt: user.createdAt
      } 
    };
  }
}