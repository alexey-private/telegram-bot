import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { RemindersService } from './reminders.service';
import { createRemindersComposer } from './reminders.composer';
import { REMINDERS_COMPOSER } from '../../bot/bot.service';
import { BotContext } from '../../shared/bot-context.type';
import { Composer } from 'grammy';

@Module({
  imports: [SharedModule],
  providers: [
    RemindersService,
    {
      provide: REMINDERS_COMPOSER,
      useFactory: (service: RemindersService): Composer<BotContext> =>
        createRemindersComposer(service),
      inject: [RemindersService],
    },
  ],
  exports: [RemindersService, REMINDERS_COMPOSER],
})
export class RemindersModule {}
