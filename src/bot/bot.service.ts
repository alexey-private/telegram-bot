import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Composer, session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { conversations } from '@grammyjs/conversations';
import Redis from 'ioredis';
import { BotContext, SessionData } from '../shared/bot-context.type';
import { RemindersService } from '../features/reminders/reminders.service';

export const REMINDERS_COMPOSER = 'REMINDERS_COMPOSER';
export const AI_COMPOSER = 'AI_COMPOSER';
export const FLASHCARD_COMPOSER = 'FLASHCARD_COMPOSER';
export const DOCUMENT_COMPOSER = 'DOCUMENT_COMPOSER';
export const EXPENSE_COMPOSER = 'EXPENSE_COMPOSER';
export const NOTIFIER_COMPOSER = 'NOTIFIER_COMPOSER';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot!: Bot<BotContext>;

  constructor(
    private readonly config: ConfigService,
    private readonly remindersService: RemindersService,
    @Inject(REMINDERS_COMPOSER) private readonly remindersComposer: Composer<BotContext>,
    @Inject(AI_COMPOSER) private readonly aiComposer: Composer<BotContext>,
    @Inject(FLASHCARD_COMPOSER) private readonly flashcardComposer: Composer<BotContext>,
    @Inject(DOCUMENT_COMPOSER) private readonly documentComposer: Composer<BotContext>,
    @Inject(EXPENSE_COMPOSER) private readonly expenseComposer: Composer<BotContext>,
    @Inject(NOTIFIER_COMPOSER) private readonly notifierComposer: Composer<BotContext>,
  ) {}

  async onModuleInit() {
    const token = this.config.get<string>('BOT_TOKEN')!;
    this.bot = new Bot<BotContext>(token);

    // 1. Session with Redis storage — persists across restarts
    const redisClient = new Redis(this.config.get<string>('REDIS_URL')!);
    this.bot.use(
      session({
        initial: (): SessionData => ({
          reminders: {},
          ai: { history: [] },
        }),
        storage: new RedisAdapter({ instance: redisClient }),
      }),
    );

    // 2. Conversations plugin
    this.bot.use(conversations());

    // Logging middleware — logs every incoming update
    this.bot.use(async (ctx, next) => {
      const from = ctx.from ? `@${ctx.from.username ?? ctx.from.id}` : 'unknown';
      const updateKey = Object.keys(ctx.update).find((k) => k !== 'update_id') ?? 'update';
      const text = ctx.message?.text ?? ctx.callbackQuery?.data ?? `[${updateKey}]`;
      this.logger.log(`${from}: ${text}`);
      await next();
    });

    // 3. /start command (core)
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        'Hello! I am your multi-feature assistant bot.\n\n' +
          'Commands:\n' +
          '/start — show this message\n' +
          '/remind <duration> <text> — set a reminder (e.g. /remind 1m ping)\n' +
          '/card add <question> | <answer> — add a flashcard\n' +
          '/card review — review due flashcards\n' +
          '/card list — list all your flashcards\n' +
          '/expense <amount> <desc> — record an expense (e.g. /expense 500 coffee)\n' +
          '/expense report — monthly spending report\n' +
          '/ai <text> — chat with Claude AI\n' +
          '/reset — clear AI conversation context\n\n' +
          'Just send a PDF or .txt file — get an AI summary.\n' +
          'In private chat, any plain text message is sent to the AI.',
      );
    });

    // 4. Feature composers — specific commands first
    this.bot.use(this.remindersComposer);
    this.bot.use(this.flashcardComposer);
    this.bot.use(this.documentComposer);
    this.bot.use(this.expenseComposer);
    this.bot.use(this.notifierComposer);

    // 5. AI composer LAST — contains the greedy catch-all text handler
    this.bot.use(this.aiComposer);

    // Error boundary
    this.bot.catch((err) => {
      this.logger.error(`Unhandled bot error: ${err.message}`, err.stack);
    });

    // Wire bot.api to services that need to push outbound messages
    this.remindersService.setBotApi(this.bot.api);

    this.bot.start({
      onStart: (info) => this.logger.log(`Bot started as @${info.username}`),
    });

    this.logger.log('Bot initializing...');
  }

  async onModuleDestroy() {
    await this.bot.stop();
  }

  get api() {
    return this.bot.api;
  }
}
