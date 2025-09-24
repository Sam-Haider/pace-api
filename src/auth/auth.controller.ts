import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string }) {
    // For now, just return a token for any email
    // TODO: Add proper user validation
    const userId = 1; // Hardcoded for testing
    const token = this.authService.generateToken(userId, body.email);
    return { token, user: { id: userId, email: body.email } };
  }
}