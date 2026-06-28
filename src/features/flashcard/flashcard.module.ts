import { Module } from '@nestjs/common';
import { Composer } from 'grammy';
import { SharedModule } from '../../shared/shared.module';
import { FlashcardService } from './flashcard.service';
import { createFlashcardComposer } from './flashcard.composer';
import { FLASHCARD_COMPOSER } from '../../bot/bot.service';
import { BotContext } from '../../shared/bot-context.type';

@Module({
  imports: [SharedModule],
  providers: [
    FlashcardService,
    {
      provide: FLASHCARD_COMPOSER,
      useFactory: (service: FlashcardService): Composer<BotContext> =>
        createFlashcardComposer(service),
      inject: [FlashcardService],
    },
  ],
  exports: [FlashcardService, FLASHCARD_COMPOSER],
})
export class FlashcardModule {}
