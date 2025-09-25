import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      weeklyGoalHours?: number;
    },
  ) {
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      throw new BadRequestException(
        'Email, password, first name, and last name are required',
      );
    }

    if (body.password.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    const user = await this.authService.createUser(body);
    const token = this.authService.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        weeklyGoalHours: user.weeklyGoalHours,
        createdAt: user.createdAt,
      },
    };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.authService.findUserByEmail(body.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Please set up your password by signing up again',
      );
    }

    const isPasswordValid = await this.authService.comparePasswords(
      body.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.authService.generateToken(user.id, user.email);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        weeklyGoalHours: user.weeklyGoalHours,
        createdAt: user.createdAt,
      },
    };
  }
}
