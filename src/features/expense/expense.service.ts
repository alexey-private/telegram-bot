import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  add(userId: bigint, chatId: bigint, amount: number, description: string) {
    return this.prisma.expense.create({
      data: { userId, chatId, amount, description },
    });
  }

  getMonthlyExpenses(userId: bigint) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return this.prisma.expense.findMany({
      where: { userId, createdAt: { gte: from, lt: to } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getMonthlyTotal(userId: bigint) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return this.prisma.expense.aggregate({
      where: { userId, createdAt: { gte: from, lt: to } },
      _sum: { amount: true },
      _count: true,
    });
  }
}
