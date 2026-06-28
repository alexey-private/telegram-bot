import { Bot } from 'grammy';

export type ApiCall = { method: string; payload: Record<string, unknown> };

export function createTestBot() {
  const calls: ApiCall[] = [];
  const replies: string[] = [];

  const bot = new Bot<any>('test:token', {
    botInfo: {
      id: 42,
      is_bot: true,
      first_name: 'TestBot',
      username: 'testbot',
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    } as any,
  });

  bot.api.config.use(async (_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    calls.push({ method, payload: p });
    if (method === 'sendMessage' && typeof p.text === 'string') {
      replies.push(p.text);
    }
    return { ok: true, result: { message_id: 1, chat: { id: p.chat_id }, date: 0 } } as any;
  });

  return { bot, calls, replies };
}

export function makeCommandUpdate(
  text: string,
  opts: { userId?: number; chatId?: number } = {},
): any {
  const userId = opts.userId ?? 100;
  const chatId = opts.chatId ?? 200;
  const spaceIdx = text.indexOf(' ');
  const commandLength = spaceIdx === -1 ? text.length : spaceIdx;

  return {
    update_id: 1,
    message: {
      message_id: 1,
      from: { id: userId, is_bot: false, first_name: 'User' },
      chat: { id: chatId, type: 'private', first_name: 'User' },
      date: 0,
      text,
      entities: [{ type: 'bot_command', offset: 0, length: commandLength }],
    },
  };
}
