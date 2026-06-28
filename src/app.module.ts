import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    BotModule,
  ],
})
export class AppModule {}
