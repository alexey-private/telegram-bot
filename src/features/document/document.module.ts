import { Module } from '@nestjs/common';
import { Composer } from 'grammy';
import { AiModule } from '../ai/ai.module';
import { DocumentService } from './document.service';
import { createDocumentComposer } from './document.composer';
import { DOCUMENT_COMPOSER } from '../../bot/bot.service';
import { BotContext } from '../../shared/bot-context.type';

@Module({
  imports: [AiModule],
  providers: [
    DocumentService,
    {
      provide: DOCUMENT_COMPOSER,
      useFactory: (service: DocumentService): Composer<BotContext> =>
        createDocumentComposer(service),
      inject: [DocumentService],
    },
  ],
  exports: [DOCUMENT_COMPOSER],
})
export class DocumentModule {}
