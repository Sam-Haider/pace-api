import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Response } from 'express';

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

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google OAuth
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const token = this.authService.generateToken(user.id, user.email);

    // For development, redirect to a success page with token in query params
    // In production, you'd want to redirect to your frontend with the token
    res.redirect(`http://localhost:3000/auth/success?token=${token}`);
  }

  @Get('success')
  authSuccess() {
    return {
      message: 'Google OAuth successful!',
      instructions:
        'In a real app, this would redirect to your frontend with the JWT token.',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    const user = await this.authService.findUserByEmail(req.user.email);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      weeklyGoalHours: user.weeklyGoalHours,
      createdAt: user.createdAt,
    };
  }
}
