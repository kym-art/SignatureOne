import { Module } from '@nestjs/common';
import { SmsLogsController } from './sms-logs.controller';
import { SmsLogsService } from './sms-logs.service';
import { CoreModule } from '../common/core.module';

@Module({
  imports: [CoreModule],
  controllers: [SmsLogsController],
  providers: [SmsLogsService],
  exports: [SmsLogsService],
})
export class SmsLogsModule {}
