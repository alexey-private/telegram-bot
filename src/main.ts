import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  const port = process.env.PORT ?? 3000;
  // HTTP server for inbound webhooks (e.g. POST /notify).
  // Bot long polling starts in BotService.onModuleInit via bot.start().
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
