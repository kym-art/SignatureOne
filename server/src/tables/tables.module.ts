import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { CoreModule } from '../common/core.module';

@Module({
  imports: [CoreModule],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}
