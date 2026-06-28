import { Module } from '@nestjs/common';
import { Composer } from 'grammy';
import { BotContext } from '../../shared/bot-context.type';
import { NOTIFIER_COMPOSER } from '../../bot/bot.service';

// TODO: implement notifier feature (inbound HTTP webhooks push messages via bot.api)
@Module({
  providers: [
    {
      provide: NOTIFIER_COMPOSER,
      useFactory: (): Composer<BotContext> => new Composer<BotContext>(),
    },
  ],
  exports: [NOTIFIER_COMPOSER],
})
export class NotifierModule {}
