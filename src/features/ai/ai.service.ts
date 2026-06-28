import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY') ?? '';
    this.anthropic = new Anthropic({ apiKey: apiKey || 'not-set' });
    this.model = config.get<string>('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6';
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY is not set — AI feature will return an error when used');
    }
  }

  /**
   * Streams a response from Claude as an async generator of text chunks.
   * Reusable by other modules (e.g. DocumentModule for PDF summarization).
   */
  async *streamResponse(
    messages: MessageParam[],
    systemPrompt?: string,
  ): AsyncGenerator<string, void, unknown> {
    const stream = this.anthropic.messages.stream({
      model: this.model,
      max_tokens: 4096,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  /**
   * Collects the full streamed response into a single string.
   * Convenience method for non-streaming use cases (DocumentModule, etc.).
   */
  async complete(messages: MessageParam[], systemPrompt?: string): Promise<string> {
    let text = '';
    for await (const chunk of this.streamResponse(messages, systemPrompt)) {
      text += chunk;
    }
    return text;
  }
}
