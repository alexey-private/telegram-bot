import { Composer } from 'grammy';
import { BotContext } from '../../shared/bot-context.type';
import { RemindersService } from './reminders.service';

const DURATION_RE = /^(\d+)(m|h|d)$/;

function parseDuration(str: string): number | null {
  const match = DURATION_RE.exec(str);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  return null;
}

export function createRemindersComposer(service: RemindersService): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.command('remind', async (ctx) => {
    const args = ctx.match?.trim();
    if (!args) {
      await ctx.reply('Usage: /remind <duration> <text>\nExamples: /remind 1m ping, /remind 2h meeting');
      return;
    }

    const spaceIdx = args.indexOf(' ');
    if (spaceIdx === -1) {
      await ctx.reply('Please provide reminder text after the duration.\nExample: /remind 1m ping');
      return;
    }

    const durationStr = args.slice(0, spaceIdx);
    const text = args.slice(spaceIdx + 1).trim();

    const ms = parseDuration(durationStr);
    if (ms === null) {
      await ctx.reply('Invalid duration. Use formats like 1m, 30m, 1h, 2h, 1d.');
      return;
    }

    if (!text) {
      await ctx.reply('Reminder text cannot be empty.');
      return;
    }

    const fireAt = new Date(Date.now() + ms);
    const chatId = BigInt(ctx.chat.id);
    const userId = BigInt(ctx.from?.id ?? ctx.chat.id);

    await service.create(chatId, userId, text, fireAt);
    await ctx.reply(`Reminder set for ${durationStr} from now: "${text}"`);
  });

  return composer;
}
