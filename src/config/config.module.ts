import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { z } from 'zod';

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  AI_MAX_HISTORY_MESSAGES: z.coerce.number().int().positive().default(20),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;

function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${result.error.toString()}`);
  }
  return result.data;
}

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
  ],
})
export class ConfigModule {}
