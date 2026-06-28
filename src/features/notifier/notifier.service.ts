import { Injectable, Logger } from '@nestjs/common';

type BotApi = { sendMessage: (chatId: number | string, text: string) => Promise<unknown> };

@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);
  private botApi: BotApi | null = null;

  setBotApi(api: BotApi) {
    this.botApi = api;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.botApi) {
      throw new Error('Bot API not initialized yet');
    }
    await this.botApi.sendMessage(chatId, text);
    this.logger.log(`Notifier sent message to ${chatId}`);
  }
}
