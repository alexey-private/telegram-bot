# Telegram Bot

A multi-feature Telegram bot built with NestJS + grammY + Claude AI.

## Features

- `/start` — welcome message + command list
- `/remind <duration> <text>` — set a reminder (e.g. `/remind 1m ping`, `/remind 2h meeting`)
- `/ai <text>` — chat with Claude AI (multi-turn, with memory)
- Plain text in **private chat** → answered by Claude AI
- `/reset` — clear AI conversation history
- Group chats — AI responds only to `@mentions` or replies to the bot

## Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Docker + Docker Compose (for local Postgres)

## Local Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd telegram-bot
pnpm install

# 2. Start Postgres
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env — fill in BOT_TOKEN and ANTHROPIC_API_KEY

# 4. Run database migration
pnpm prisma:migrate
# (enter a migration name when prompted, e.g. "init")

# 5. Start the bot
pnpm start:dev
```

The bot uses long polling — no public URL needed for local dev.

## Environment Variables

See `.env.example` for all variables and their descriptions.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the full architecture guide, including how to add new feature modules.
