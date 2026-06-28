import { Module } from '@nestjs/common';
import { Composer } from 'grammy';
import { SharedModule } from '../../shared/shared.module';
import { ExpenseService } from './expense.service';
import { createExpenseComposer } from './expense.composer';
import { EXPENSE_COMPOSER } from '../../bot/bot.service';
import { BotContext } from '../../shared/bot-context.type';

@Module({
  imports: [SharedModule],
  providers: [
    ExpenseService,
    {
      provide: EXPENSE_COMPOSER,
      useFactory: (service: ExpenseService): Composer<BotContext> =>
        createExpenseComposer(service),
      inject: [ExpenseService],
    },
  ],
  exports: [EXPENSE_COMPOSER],
})
export class ExpenseModule {}
