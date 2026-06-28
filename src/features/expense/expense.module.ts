import { Module } from '@nestjs/common';
import { Composer } from 'grammy';
import { BotContext } from '../../shared/bot-context.type';
import { EXPENSE_COMPOSER } from '../../bot/bot.service';

// TODO: implement expense tracking feature
@Module({
  providers: [
    {
      provide: EXPENSE_COMPOSER,
      useFactory: (): Composer<BotContext> => new Composer<BotContext>(),
    },
  ],
  exports: [EXPENSE_COMPOSER],
})
export class ExpenseModule {}
