import { Composer } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { createConversation, type Conversation } from '@grammyjs/conversations';
import { BotContext } from '../../shared/bot-context.type';
import { FlashcardService } from './flashcard.service';

const showAnswerKeyboard = new InlineKeyboard().text('👁 Показать ответ', 'fc_show');
const ratingKeyboard = new InlineKeyboard()
  .text('✅ Знал', 'fc_good')
  .text('❌ Не знал', 'fc_bad');

function buildReviewConversation(service: FlashcardService) {
  return async function flashcardReview(
    conversation: Conversation<BotContext, BotContext>,
    ctx: BotContext,
  ) {
    const userId = BigInt(ctx.from!.id);
    const cards = await conversation.external(() => service.getDueCards(userId));

    if (cards.length === 0) {
      await ctx.reply('Нет карточек для повторения сегодня!');
      return;
    }

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];

      await ctx.reply(`Карточка ${i + 1}/${cards.length}\n\n${card.front}`, {
        reply_markup: showAnswerKeyboard,
      });

      await conversation.waitForCallbackQuery('fc_show', {
        otherwise: (c) => c.reply('Нажми кнопку "Показать ответ"'),
      });

      await ctx.reply(card.back, { reply_markup: ratingKeyboard });

      const rateCtx = await conversation.waitForCallbackQuery(['fc_good', 'fc_bad'], {
        otherwise: (c) => c.reply('Оцени карточку кнопкой'),
      });
      await rateCtx.answerCallbackQuery();

      const knew = rateCtx.callbackQuery.data === 'fc_good';
      await conversation.external(() => service.updateCard(card.id, knew));
    }

    await ctx.reply(`Готово! Повторено ${cards.length} карточек.`);
  };
}

export function createFlashcardComposer(service: FlashcardService): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.use(createConversation(buildReviewConversation(service), 'flashcardReview'));

  composer.command('card', async (ctx) => {
    const input = ctx.match?.trim() ?? '';
    const spaceIdx = input.indexOf(' ');
    const sub = spaceIdx === -1 ? input : input.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? '' : input.slice(spaceIdx + 1).trim();

    if (sub === 'add') {
      const pipeIdx = rest.indexOf('|');
      if (pipeIdx === -1) {
        await ctx.reply('Использование: /card add Вопрос | Ответ');
        return;
      }
      const front = rest.slice(0, pipeIdx).trim();
      const back = rest.slice(pipeIdx + 1).trim();
      if (!front || !back) {
        await ctx.reply('Вопрос и ответ не могут быть пустыми.');
        return;
      }
      const userId = BigInt(ctx.from?.id ?? ctx.chat.id);
      const chatId = BigInt(ctx.chat.id);
      await service.createCard(userId, chatId, front, back);
      await ctx.reply(`Карточка добавлена!\n\n❓ ${front}\n💡 ${back}`);

    } else if (sub === 'review') {
      await ctx.conversation.enter('flashcardReview');

    } else if (sub === 'list') {
      const userId = BigInt(ctx.from?.id ?? ctx.chat.id);
      const cards = await service.getCards(userId);
      if (cards.length === 0) {
        await ctx.reply('У вас нет карточек. Добавьте: /card add Вопрос | Ответ');
        return;
      }
      const now = new Date();
      const lines = cards.map((c, i) => {
        const due = c.nextReviewAt <= now ? '🔴 сейчас' : `🟢 ${c.nextReviewAt.toLocaleDateString('ru-RU')}`;
        return `${i + 1}. ${c.front} — ${due}`;
      });
      await ctx.reply(`Ваши карточки (${cards.length}):\n\n${lines.join('\n')}`);

    } else {
      await ctx.reply(
        'Команды:\n' +
        '/card add Вопрос | Ответ — добавить карточку\n' +
        '/card review — начать повторение\n' +
        '/card list — список всех карточек',
      );
    }
  });

  return composer;
}
