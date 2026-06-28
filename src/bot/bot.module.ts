import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { SharedModule } from '../shared/shared.module';
import { RemindersModule } from '../features/reminders/reminders.module';
import { AiModule } from '../features/ai/ai.module';
import { FlashcardModule } from '../features/flashcard/flashcard.module';
import { DocumentModule } from '../features/document/document.module';
import { ExpenseModule } from '../features/expense/expense.module';
import { NotifierModule } from '../features/notifier/notifier.module';

@Module({
  imports: [
    SharedModule,
    RemindersModule,
    AiModule,
    FlashcardModule,
    DocumentModule,
    ExpenseModule,
    NotifierModule,
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
