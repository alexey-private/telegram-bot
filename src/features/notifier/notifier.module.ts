import { Module } from '@nestjs/common';
import { Composer } from 'grammy';
import { NotifierService } from './notifier.service';
import { NotifierController } from './notifier.controller';
import { NOTIFIER_COMPOSER } from '../../bot/bot.service';
import { BotContext } from '../../shared/bot-context.type';

@Module({
  controllers: [NotifierController],
  providers: [
    NotifierService,
    {
      provide: NOTIFIER_COMPOSER,
      useFactory: (): Composer<BotContext> => new Composer<BotContext>(),
    },
  ],
  exports: [NotifierService, NOTIFIER_COMPOSER],
})
export class NotifierModule {}
