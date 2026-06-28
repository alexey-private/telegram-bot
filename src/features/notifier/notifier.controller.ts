import { Body, Controller, HttpCode, HttpStatus, Post, BadRequestException } from '@nestjs/common';
import { NotifierService } from './notifier.service';

interface NotifyDto {
  chatId: string;
  text: string;
}

@Controller('notify')
export class NotifierController {
  constructor(private readonly notifierService: NotifierService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async notify(@Body() body: NotifyDto) {
    if (!body?.chatId || !body?.text) {
      throw new BadRequestException('chatId and text are required');
    }

    await this.notifierService.sendMessage(String(body.chatId), body.text);
    return { ok: true };
  }
}
