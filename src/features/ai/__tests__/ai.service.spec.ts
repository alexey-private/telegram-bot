// jest.mock is hoisted above imports by babel-jest / ts-jest.
// The inner streamFn is created inside the factory and exposed as a static
// property so tests can configure return values without hoisting issues.
jest.mock('@anthropic-ai/sdk', () => {
  const streamFn = jest.fn();
  class MockAnthropic {
    static streamFn = streamFn;
    messages = { stream: streamFn };
  }
  return { __esModule: true, default: MockAnthropic };
});

import Anthropic from '@anthropic-ai/sdk';
import { AiService } from '../ai.service';
import { ConfigService } from '@nestjs/config';

const streamFn = (Anthropic as any).streamFn as jest.Mock;

function makeStream(events: object[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
    },
  };
}

function textDelta(text: string) {
  return { type: 'content_block_delta', delta: { type: 'text_delta', text } };
}

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = { get: (key: string) => (key === 'ANTHROPIC_API_KEY' ? 'test-key' : undefined) } as unknown as ConfigService;
    service = new AiService(config);
  });

  describe('complete', () => {
    it('collects all text delta chunks into a single string', async () => {
      streamFn.mockReturnValue(makeStream([textDelta('Hello'), textDelta(' world')]));
      const result = await service.complete([{ role: 'user', content: 'hi' }]);
      expect(result).toBe('Hello world');
    });

    it('ignores non-text-delta events', async () => {
      streamFn.mockReturnValue(makeStream([
        { type: 'message_start', message: {} },
        textDelta('OK'),
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{}' } },
        { type: 'message_stop' },
      ]));
      const result = await service.complete([{ role: 'user', content: 'hi' }]);
      expect(result).toBe('OK');
    });

    it('returns empty string when stream has no text deltas', async () => {
      streamFn.mockReturnValue(makeStream([{ type: 'message_stop' }]));
      const result = await service.complete([{ role: 'user', content: 'hi' }]);
      expect(result).toBe('');
    });

    it('passes a system prompt when provided', async () => {
      streamFn.mockReturnValue(makeStream([]));
      await service.complete([{ role: 'user', content: 'hi' }], 'You are helpful');
      expect(streamFn).toHaveBeenCalledWith(expect.objectContaining({ system: 'You are helpful' }));
    });

    it('omits system key entirely when no system prompt given', async () => {
      streamFn.mockReturnValue(makeStream([]));
      await service.complete([{ role: 'user', content: 'hi' }]);
      const callArg = streamFn.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('system');
    });
  });

  describe('streamResponse', () => {
    it('yields text chunks individually', async () => {
      streamFn.mockReturnValue(makeStream([textDelta('chunk1'), textDelta('chunk2')]));
      const chunks: string[] = [];
      for await (const c of service.streamResponse([{ role: 'user', content: 'hi' }])) {
        chunks.push(c);
      }
      expect(chunks).toEqual(['chunk1', 'chunk2']);
    });
  });
});
