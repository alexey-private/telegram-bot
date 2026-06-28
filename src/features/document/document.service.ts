import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';

const SYSTEM_PROMPT =
  'You are a document summarization assistant. ' +
  'The user will send you the text content of a document. ' +
  'Provide a clear, concise summary in the same language as the document. ' +
  'Structure it with: main topic, key points (3-5 bullets), and conclusion.';

const MAX_CHARS = 50_000;

@Injectable()
export class DocumentService {
  private readonly botToken: string;

  constructor(
    private readonly aiService: AiService,
    config: ConfigService,
  ) {
    this.botToken = config.get<string>('BOT_TOKEN')!;
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    const url = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Telegram file download failed: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async summarize(text: string): Promise<string> {
    const truncated =
      text.length > MAX_CHARS
        ? text.slice(0, MAX_CHARS) + '\n\n[...document truncated...]'
        : text;

    return this.aiService.complete(
      [{ role: 'user', content: truncated }],
      SYSTEM_PROMPT,
    );
  }
}
