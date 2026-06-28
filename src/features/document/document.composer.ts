import { Composer } from 'grammy';
import { BotContext } from '../../shared/bot-context.type';
import { DocumentService } from './document.service';

const SUPPORTED_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

export function createDocumentComposer(service: DocumentService): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.on('message:document', async (ctx) => {
    const doc = ctx.message.document;

    if (!SUPPORTED_MIME.has(doc.mime_type ?? '')) {
      await ctx.reply(
        'Поддерживаются только PDF и текстовые файлы (.txt, .md, .csv).\n' +
        'Отправь файл без сжатия (как документ, не фото).',
      );
      return;
    }

    if (doc.file_size && doc.file_size > 20 * 1024 * 1024) {
      await ctx.reply('Файл слишком большой (максимум 20 МБ).');
      return;
    }

    const statusMsg = await ctx.reply('Читаю файл...');

    try {
      const tgFile = await ctx.getFile();
      if (!tgFile.file_path) {
        throw new Error('file_path missing from Telegram response');
      }
      const buffer = await service.downloadFile(tgFile.file_path);
      const text = buffer.toString('utf-8');

      if (!text.trim()) {
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 'Файл пустой или не содержит текста.');
        return;
      }

      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, 'Анализирую...');

      const summary = await service.summarize(text);

      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, summary);
    } catch {
      await ctx.api
        .editMessageText(ctx.chat.id, statusMsg.message_id, 'Не удалось обработать файл. Попробуй ещё раз.')
        .catch(() => {});
    }
  });

  return composer;
}
