import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class FlashcardService {
  constructor(private readonly prisma: PrismaService) {}

  createCard(userId: bigint, chatId: bigint, front: string, back: string) {
    return this.prisma.flashcard.create({
      data: { userId, chatId, front, back },
    });
  }

  getDueCards(userId: bigint) {
    return this.prisma.flashcard.findMany({
      where: { userId, nextReviewAt: { lte: new Date() } },
      orderBy: { nextReviewAt: 'asc' },
    });
  }

  getCards(userId: bigint) {
    return this.prisma.flashcard.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateCard(cardId: string, knew: boolean) {
    const card = await this.prisma.flashcard.findUniqueOrThrow({ where: { id: cardId } });

    let newInterval: number;
    let newEaseFactor: number;

    if (knew) {
      newInterval = Math.max(1, Math.round(card.interval * card.easeFactor));
      newEaseFactor = Math.min(2.5, card.easeFactor + 0.1);
    } else {
      newInterval = 1;
      newEaseFactor = Math.max(1.3, card.easeFactor - 0.2);
    }

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    return this.prisma.flashcard.update({
      where: { id: cardId },
      data: { interval: newInterval, easeFactor: newEaseFactor, nextReviewAt },
    });
  }
}
