import { Composer } from 'grammy';
import { BotContext } from '../../shared/bot-context.type';
import { ExpenseService } from './expense.service';

const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

export function createExpenseComposer(service: ExpenseService): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.command('expense', async (ctx) => {
    const input = ctx.match?.trim() ?? '';
    const spaceIdx = input.indexOf(' ');
    const first = spaceIdx === -1 ? input : input.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? '' : input.slice(spaceIdx + 1).trim();

    const userId = BigInt(ctx.from?.id ?? ctx.chat.id);
    const chatId = BigInt(ctx.chat.id);

    // /expense report
    if (first === 'report') {
      const [expenses, agg] = await Promise.all([
        service.getMonthlyExpenses(userId),
        service.getMonthlyTotal(userId),
      ]);

      if (expenses.length === 0) {
        await ctx.reply('В этом месяце расходов нет. Добавь: /expense 500 кофе');
        return;
      }

      const month = MONTH_NAMES[new Date().getMonth()];
      const total = agg._sum.amount ?? 0;
      const lines = expenses.map((e) => `• ${e.amount} — ${e.description}`);

      await ctx.reply(
        `Расходы за ${month} (${agg._count} записей):\n\n${lines.join('\n')}\n\nИтого: ${total.toFixed(2)}`,
      );
      return;
    }

    // /expense <amount> <description>
    const amount = parseFloat(first);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        'Команды:\n' +
        '/expense <сумма> <описание> — записать расход (например: /expense 500 кофе)\n' +
        '/expense report — отчёт за текущий месяц',
      );
      return;
    }

    if (!rest) {
      await ctx.reply('Укажи описание. Пример: /expense 500 кофе');
      return;
    }

    await service.add(userId, chatId, amount, rest);
    await ctx.reply(`Записано: ${amount} — ${rest}`);
  });

  return composer;
}
