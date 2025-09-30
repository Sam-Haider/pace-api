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

    // Set secure cookie
    res.cookie('auth-token', token, {
      httpOnly: false,         // Allow JavaScript access for client-side middleware
      secure: false,           // Set to true in production (HTTPS)
      sameSite: 'lax',        // CSRF protection (lax for cross-origin redirects)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend dashboard
    res.redirect('http://localhost:3001/dashboard');
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
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Current password and new password are required');
    }

    if (body.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    const user = await this.authService.findUserByEmail(req.user.email);
    
    if (!user || !user.password) {
      throw new UnauthorizedException('User not found or password not set');
    }

    const isCurrentPasswordValid = await this.authService.comparePasswords(
      body.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.authService.updatePassword(user.id, body.newPassword);

    return { message: 'Password changed successfully' };
  }

  @Post('complete-onboarding')
  @UseGuards(JwtAuthGuard)
  async completeOnboarding(
    @Req() req: any,
    @Body() body: { firstName: string; lastName: string; identityId: number },
  ) {
    if (!body.firstName || !body.lastName || !body.identityId) {
      throw new BadRequestException('First name, last name, and identity are required');
    }

    const user = await this.authService.findUserByEmail(req.user.email);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.authService.completeOnboarding(user.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      identityId: body.identityId,
    });

    return { message: 'Onboarding completed successfully' };
  }

  @Get('identities')
  @UseGuards(JwtAuthGuard)
  async getUserIdentities(@Req() req: any) {
    const user = await this.authService.findUserByEmail(req.user.email);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const identities = await this.authService.getUserIdentities(user.id);
    return identities;
  }
}
