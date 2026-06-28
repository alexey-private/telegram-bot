import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export interface AiSessionData {
  history: MessageParam[];
}

export interface RemindersSessionData {
  // reserved for future per-user state
}

export interface SessionData {
  reminders: RemindersSessionData;
  ai: AiSessionData;
}

type BaseContext = Context & SessionFlavor<SessionData>;

// ConversationFlavor<C> extends C, so BotContext already includes BaseContext members.
export type BotContext = ConversationFlavor<BaseContext>;
