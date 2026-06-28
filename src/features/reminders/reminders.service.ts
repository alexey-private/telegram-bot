import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private botApi: { sendMessage: (chatId: number | string, text: string) => Promise<unknown> } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  setBotApi(api: { sendMessage: (chatId: number | string, text: string) => Promise<unknown> }) {
    this.botApi = api;
  }

  async create(chatId: bigint, userId: bigint, text: string, fireAt: Date) {
    return this.prisma.reminder.create({
      data: { chatId, userId, text, fireAt },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async fireReminders() {
    if (!this.botApi) return;

    const pending = await this.prisma.reminder.findMany({
      where: { fireAt: { lte: new Date() }, fired: false },
    });

    for (const reminder of pending) {
      try {
        await this.botApi.sendMessage(reminder.chatId.toString(), `Reminder: ${reminder.text}`);
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { fired: true },
        });
      } catch (err) {
        this.logger.error(`Failed to send reminder ${reminder.id}: ${(err as Error).message}`);
      }
    }
  }
}
