import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VotesService } from './votes.service';

@Controller('api/votes')
@UseGuards(JwtAuthGuard)
export class VotesController {
  constructor(private votesService: VotesService) {}

  @Post()
  async createVote(
    @Req() req: any,
    @Body() body: {
      userIdentityId?: number;
      date?: string;
      notes?: string;
    },
  ) {
    let userIdentityId = body.userIdentityId;

    // If no userIdentityId provided, use primary identity
    if (!userIdentityId) {
      const primaryIdentityId = await this.votesService.getUserPrimaryIdentity(req.user.userId);
      if (!primaryIdentityId) {
        throw new BadRequestException('No primary identity found. Please complete onboarding first.');
      }
      userIdentityId = primaryIdentityId;
    }

    // Verify user owns the userIdentityId
    const userOwnsIdentity = await this.votesService.verifyUserOwnsIdentity(
      req.user.userId,
      userIdentityId,
    );

    if (!userOwnsIdentity) {
      throw new ForbiddenException('You do not own this user identity');
    }

    const date = body.date ? new Date(body.date) : new Date();
    
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const result = await this.votesService.createVote({
      userIdentityId,
      date,
      notes: body.notes,
    });

    return result;
  }

  @Get()
  async getVotes(
    @Req() req: any,
    @Query() query: {
      userIdentityId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    let userIdentityId: number;

    // If no userIdentityId provided, use primary identity
    if (!query.userIdentityId) {
      const primaryIdentityId = await this.votesService.getUserPrimaryIdentity(req.user.userId);
      if (!primaryIdentityId) {
        throw new BadRequestException('No primary identity found. Please complete onboarding first.');
      }
      userIdentityId = primaryIdentityId;
    } else {
      userIdentityId = parseInt(query.userIdentityId);
      if (isNaN(userIdentityId)) {
        throw new BadRequestException('userIdentityId must be a number');
      }
    }

    // Verify user owns the userIdentityId
    const userOwnsIdentity = await this.votesService.verifyUserOwnsIdentity(
      req.user.userId,
      userIdentityId,
    );

    if (!userOwnsIdentity) {
      throw new ForbiddenException('You do not own this user identity');
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (query.startDate) {
      startDate = new Date(query.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    }

    if (query.endDate) {
      endDate = new Date(query.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    }

    const votes = await this.votesService.getVotes({
      userIdentityId,
      startDate,
      endDate,
    });

    return votes;
  }
}