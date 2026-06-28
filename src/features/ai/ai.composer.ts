import { Composer } from 'grammy';
import { BotContext } from '../../shared/bot-context.type';
import { AiService } from './ai.service';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

const MAX_TG_LENGTH = 4096;
const EDIT_THROTTLE_MS = 1000;
const TYPING_INTERVAL_MS = 4000;

/**
 * Splits text into chunks no longer than MAX_TG_LENGTH.
 * Prefers splitting on double-newlines, then single newlines, then hard-cuts.
 */
function splitMessage(text: string): string[] {
  if (text.length <= MAX_TG_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_TG_LENGTH) {
    let cutAt = remaining.lastIndexOf('\n\n', MAX_TG_LENGTH);
    if (cutAt <= 0) cutAt = remaining.lastIndexOf('\n', MAX_TG_LENGTH);
    if (cutAt <= 0) cutAt = MAX_TG_LENGTH;

    chunks.push(remaining.slice(0, cutAt).trimEnd());
    remaining = remaining.slice(cutAt).trimStart();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

async function handleAiMessage(
  ctx: BotContext,
  userText: string,
  aiService: AiService,
  maxHistory: number,
) {
  // ctx.chat is always defined in message handlers; assert once for TS
  const chat = ctx.chat!;

  // Add user message to history
  ctx.session.ai.history.push({ role: 'user', content: userText } as MessageParam);

  // Trim oldest turns to stay under budget (keep pairs: trim 2 at a time)
  while (ctx.session.ai.history.length > maxHistory) {
    ctx.session.ai.history.splice(0, 2);
  }

  // Send placeholder and start typing
  const sent = await ctx.reply('...');
  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(chat.id, 'typing').catch(() => {});
  }, TYPING_INTERVAL_MS);
  await ctx.api.sendChatAction(chat.id, 'typing');

  let accumulated = '';
  let lastEdit = Date.now();

  try {
    for await (const chunk of aiService.streamResponse(ctx.session.ai.history)) {
      accumulated += chunk;

      const now = Date.now();
      if (now - lastEdit >= EDIT_THROTTLE_MS) {
        const preview = accumulated.slice(0, MAX_TG_LENGTH);
        await ctx.api
          .editMessageText(chat.id, sent.message_id, preview)
          .catch(() => {});
        lastEdit = now;
      }
    }

    clearInterval(typingInterval);

    // Save assistant reply to history before splitting
    ctx.session.ai.history.push({
      role: 'assistant',
      content: accumulated,
    } as MessageParam);

    // Finalize — split if long
    const chunks = splitMessage(accumulated);
    if (chunks.length === 0) {
      await ctx.api.editMessageText(chat.id, sent.message_id, '(no response)');
      return;
    }

    // First chunk replaces placeholder
    await ctx.api
      .editMessageText(chat.id, sent.message_id, chunks[0])
      .catch(() => {});

    // Remaining chunks as new messages
    for (let i = 1; i < chunks.length; i++) {
      await ctx.reply(chunks[i]);
    }
  } catch (err) {
    clearInterval(typingInterval);
    await ctx.api
      .editMessageText(
        chat.id,
        sent.message_id,
        'Sorry, I could not reach the AI. Please try again later.',
      )
      .catch(() => {});
    // Remove the user message we already pushed since we couldn't respond
    ctx.session.ai.history.pop();
    throw err; // re-throw so bot.catch can log it with context
  }
}

export function createAiComposer(
  aiService: AiService,
  maxHistory: number,
): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // /reset — clear conversation history
  composer.command('reset', async (ctx) => {
    ctx.session.ai.history = [];
    await ctx.reply('Conversation cleared.');
  });

  // /ai <text> — explicit AI invocation (works in any chat type)
  composer.command('ai', async (ctx) => {
    const text = ctx.match?.trim();
    if (!text) {
      await ctx.reply('Usage: /ai <your message>\nExample: /ai explain quantum computing');
      return;
    }
    await handleAiMessage(ctx, text, aiService, maxHistory);
  });

  // Catch-all text handler — mounted LAST per mount-order rule
  composer.on('message:text', async (ctx) => {
    if (!ctx.chat) return;
    const chatType = ctx.chat.type;

    if (chatType === 'private') {
      // Private chat: respond to every text message
      await handleAiMessage(ctx, ctx.message.text, aiService, maxHistory);
      return;
    }

    // Group / supergroup / channel: only respond when addressed
    const botUsername = ctx.me.username;
    const text = ctx.message.text;
    const isReplyToBot =
      ctx.message.reply_to_message?.from?.id === ctx.me.id;
    const isMention = !!botUsername && text.includes(`@${botUsername}`);

    if (!isReplyToBot && !isMention) return;

    // Strip the @mention from the text before sending to Claude
    const cleanText = botUsername
      ? text.replace(new RegExp(`@${botUsername}`, 'g'), '').trim()
      : text.trim();

    if (!cleanText) {
      await ctx.reply('Yes? Ask me something!');
      return;
    }

    await handleAiMessage(ctx, cleanText, aiService, maxHistory);
  });

  return composer;
}
