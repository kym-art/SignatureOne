import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CoreModule } from '../common/core.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CoreModule, SettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  // Exporté pour PaymentsModule : le webhook passerelle doit passer par
  // l'UNIQUE chemin de validation des paiements (OrdersService.confirmPayment),
  // sinon le statut PAYE serait écrit par un second chemin non audité.
  exports: [OrdersService],
})
export class OrdersModule {}
