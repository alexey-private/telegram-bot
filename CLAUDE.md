# Telegram Bot — Architecture Guide

## Stack
- **TypeScript + NestJS** (modular monolith)
- **grammY** — Telegram bot framework, wired manually (no @grammyjs/nestjs)
- **@grammyjs/conversations v2** — multi-step flows (installed; use for wizard-style features)
- **@anthropic-ai/sdk** — Claude AI client
- **Prisma + Postgres** — persistence
- **@nestjs/schedule** — cron jobs
- **pnpm** — package manager

---

## Directory Structure

```
src/
  config/           # Zod-validated env vars → ConfigModule (isGlobal: true)
  shared/           # PrismaService, BotContext type, SessionData type
  bot/              # BotService (owns the single Bot instance)
  features/
    reminders/      # /remind command + cron firing
    ai/             # /ai, /reset, catch-all chat + AiService (reusable)
    flashcard/      # stub
    document/       # stub (will import AiService for PDF summarization)
    expense/        # stub
    notifier/       # stub
```

---

## Core Architecture: Composer-per-Module Pattern

Each feature module provides a `Composer<BotContext>` via a factory provider using a string injection token defined in `bot.service.ts`.

**Example — feature module wiring:**
```typescript
// In features/my-feature/my-feature.module.ts
import { MY_FEATURE_COMPOSER } from '../../bot/bot.service';

@Module({
  providers: [
    MyFeatureService,
    {
      provide: MY_FEATURE_COMPOSER,
      useFactory: (service: MyFeatureService): Composer<BotContext> =>
        createMyFeatureComposer(service),
      inject: [MyFeatureService],
    },
  ],
  exports: [MyFeatureService, MY_FEATURE_COMPOSER],
})
export class MyFeatureModule {}
```

The composer factory receives services through NestJS DI — handlers can call service methods directly.

---

## Mount Order Rule (CRITICAL)

**Mount order is enforced in `BotService.onModuleInit`, not in individual modules.**

The order is:
1. `session` plugin
2. `conversations` plugin
3. Specific feature commands (reminders, flashcard, document, expense, notifier)
4. AI composer commands (`/ai`, `/reset`)
5. **AI catch-all text handler — MUST BE LAST**

The catch-all `message:text` handler in AiComposer will intercept every text message not claimed by an earlier handler. Any handler mounted after it will never fire for text messages. Never mount a greedy handler before a specific one.

---

## How to Add a New Feature Module

1. **Add the composer token** to `src/bot/bot.service.ts`:
   ```typescript
   export const MY_FEATURE_COMPOSER = 'MY_FEATURE_COMPOSER';
   ```

2. **Inject the composer** in `BotService` constructor:
   ```typescript
   @Inject(MY_FEATURE_COMPOSER) private readonly myFeatureComposer: Composer<BotContext>,
   ```

3. **Mount it** in `BotService.onModuleInit` — before the AI composer line:
   ```typescript
   this.bot.use(this.myFeatureComposer); // add here
   this.bot.use(this.aiComposer);        // AI stays last
   ```

4. **Create `src/features/my-feature/`** with:
   - `my-feature.service.ts` — business logic (`@Injectable()`)
   - `my-feature.composer.ts` — `createMyFeatureComposer(service)` function returning `Composer<BotContext>`
   - `my-feature.module.ts` — NestJS module wiring service + factory provider

5. **Import the module** in `src/bot/bot.module.ts`.

6. **Add session namespace** (if the feature needs per-user state): add a field to `SessionData` in `src/shared/bot-context.type.ts` and update the `initial` factory in `BotService`.

---

## Session Namespacing

All session state lives in `src/shared/bot-context.type.ts` under `SessionData`.  
Each feature owns its own slice and must not read/write other feature slices.

```typescript
export interface SessionData {
  reminders: RemindersSessionData;
  ai: AiSessionData;           // { history: MessageParam[] }
  // myFeature: MyFeatureSessionData;  ← add here when implementing
}
```

Session uses in-memory storage by default. To swap to Redis:
```typescript
// In BotService.onModuleInit:
import { RedisAdapter } from '@grammyjs/storage-redis';
const storage = new RedisAdapter({ instance: redisClient });
bot.use(session({ initial: ..., storage }));
```

---

## AI Module Notes

- **No `@grammyjs/conversations`** — the AI chat is a continuous session, not a fixed flow.
- **Plain text output** — Claude responses are sent as plain text, not MarkdownV2, to avoid escaping issues.
- **`AiService` is reusable** — import `AiModule` and inject `AiService` for non-chat uses (e.g. DocumentModule PDF summarization via `aiService.complete(messages)`).
- **Streaming UX** — sends a placeholder, streams from Claude, throttles Telegram edits to ≤1/sec, splits responses >4096 chars.
- **Group chat policy** — catch-all only fires on replies-to-bot or @mentions; `/ai` command always works.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOT_TOKEN` | yes | — | Telegram bot token from BotFather |
| `DATABASE_URL` | yes | — | Postgres connection string |
| `ANTHROPIC_API_KEY` | yes | — | Anthropic API key |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-4-6` | Claude model ID |
| `AI_MAX_HISTORY_MESSAGES` | no | `20` | Max messages kept in AI session history |
| `PORT` | no | `3000` | HTTP port (reserved for future webhook use) |

---

## Two Entry Points

The bot has two ways to send messages:

1. **grammY updates** — inbound Telegram updates processed by composers
2. **Outbound via `bot.api`** — cron jobs or HTTP controllers call `botService.api.sendMessage(chatId, text)` directly

`BotService` exposes a `get api()` getter. Services that need to push outbound messages receive it via a `setBotApi(api)` setter call in `BotService.onModuleInit`, which avoids circular DI.
