import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Composer } from 'grammy';
import { AiService } from './ai.service';
import { createAiComposer } from './ai.composer';
import { AI_COMPOSER } from '../../bot/bot.service';
import { BotContext } from '../../shared/bot-context.type';

@Module({
  providers: [
    AiService,
    {
      provide: AI_COMPOSER,
      useFactory: (
        aiService: AiService,
        config: ConfigService,
      ): Composer<BotContext> => {
        const maxHistory = config.get<number>('AI_MAX_HISTORY_MESSAGES') ?? 20;
        return createAiComposer(aiService, maxHistory);
      },
      inject: [AiService, ConfigService],
    },
  ],
  // Export AiService so DocumentModule can inject it for PDF summarization
  exports: [AiService, AI_COMPOSER],
})
export class AiModule {}
