import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CoreModule } from '../common/core.module';

@Module({
  imports: [CoreModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
