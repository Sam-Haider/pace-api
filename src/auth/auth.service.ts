import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existingUser = await this.findUserByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(userData.password);

    return this.prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });
  }

  async findOrCreateGoogleUser(googleProfile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    // First, try to find by Google ID
    let user = await this.prisma.user.findUnique({
      where: { googleId: googleProfile.googleId },
    });

    if (user) {
      return user;
    }

    // If not found by Google ID, try by email
    user = await this.findUserByEmail(googleProfile.email);

    if (user) {
      // User exists with this email but no Google ID, link the accounts
      return this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleProfile.googleId },
      });
    }

    // Create new user with Google data
    return this.prisma.user.create({
      data: {
        email: googleProfile.email,
        googleId: googleProfile.googleId,
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
      },
    });
  }

  async findUserByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  generateToken(userId: number, email: string) {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string) {
    return this.jwtService.verify(token);
  }

  async updatePassword(userId: number, newPassword: string) {
    const hashedPassword = await this.hashPassword(newPassword);
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async completeOnboarding(userId: number, data: { firstName: string; lastName: string; identityId: number }) {
    // Update user with onboarding data
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        onboardingCompleted: true,
      },
    });

    // Create user identity relationship
    await this.prisma.userIdentity.create({
      data: {
        userId: userId,
        identityId: data.identityId,
        isPrimary: true,
      },
    });

    return updatedUser;
  }
}
