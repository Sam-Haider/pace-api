import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class VotesService {
  constructor(private prisma: PrismaService) {}

  async verifyUserOwnsIdentity(userId: number, userIdentityId: number): Promise<boolean> {
    const userIdentity = await this.prisma.userIdentity.findFirst({
      where: {
        id: userIdentityId,
        userId: userId,
      },
    });

    return !!userIdentity;
  }

  async getUserPrimaryIdentity(userId: number): Promise<number | null> {
    const userIdentity = await this.prisma.userIdentity.findFirst({
      where: {
        userId: userId,
        isPrimary: true,
      },
    });

    return userIdentity?.id || null;
  }

  async createVote(data: {
    userIdentityId: number;
    date: Date;
    notes?: string;
  }) {
    const vote = await this.prisma.vote.create({
      data: {
        userIdentityId: data.userIdentityId,
        date: data.date,
        notes: data.notes,
      },
    });

    const stats = await this.calculateStats(data.userIdentityId);

    return {
      vote,
      stats,
    };
  }

  async getVotes(filters: {
    userIdentityId: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {
      userIdentityId: filters.userIdentityId,
    };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    return this.prisma.vote.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async updateVote(voteId: number, userId: number, data: {
    date?: Date;
    notes?: string;
  }) {
    // First verify the vote exists and belongs to user
    const vote = await this.prisma.vote.findFirst({
      where: {
        id: voteId,
        userIdentity: {
          userId: userId,
        },
      },
    });

    if (!vote) {
      return null;
    }

    const updatedVote = await this.prisma.vote.update({
      where: { id: voteId },
      data,
    });

    const stats = await this.calculateStats(vote.userIdentityId);

    return {
      vote: updatedVote,
      stats,
    };
  }

  async deleteVote(voteId: number, userId: number) {
    // First verify the vote exists and belongs to user
    const vote = await this.prisma.vote.findFirst({
      where: {
        id: voteId,
        userIdentity: {
          userId: userId,
        },
      },
    });

    if (!vote) {
      return null;
    }

    await this.prisma.vote.delete({
      where: { id: voteId },
    });

    const stats = await this.calculateStats(vote.userIdentityId);

    return {
      deletedVoteId: voteId,
      stats,
    };
  }

  private async calculateStats(userIdentityId: number) {
    // Total votes
    const totalVotes = await this.prisma.vote.count({
      where: { userIdentityId },
    });

    // Current streak
    const currentStreak = await this.calculateCurrentStreak(userIdentityId);

    // Votes this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const votesThisMonth = await this.prisma.vote.count({
      where: {
        userIdentityId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    return {
      totalVotes,
      currentStreak,
      votesThisMonth,
    };
  }

  private async calculateCurrentStreak(userIdentityId: number): Promise<number> {
    // Get all unique dates with votes, ordered by date desc
    const voteDates = await this.prisma.vote.findMany({
      where: { userIdentityId },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
    });

    if (voteDates.length === 0) {
      return 0;
    }

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's a vote today or yesterday to start the streak
    const latestVoteDate = new Date(voteDates[0].date);
    latestVoteDate.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // If latest vote is not today or yesterday, streak is 0
    if (latestVoteDate.getTime() !== today.getTime() && latestVoteDate.getTime() !== yesterday.getTime()) {
      return 0;
    }

    // Start counting consecutive days
    let expectedDate = latestVoteDate;
    
    for (const voteDate of voteDates) {
      const currentVoteDate = new Date(voteDate.date);
      currentVoteDate.setHours(0, 0, 0, 0);

      if (currentVoteDate.getTime() === expectedDate.getTime()) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }
}