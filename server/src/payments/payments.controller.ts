import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../common/auth/decorators/public.decorator';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { CinetPayWebhookDto, InitiatePaymentDto, ReconcilePaymentDto } from './payments.dto';

/**
 * Paiements passerelle (Mobile Money Flooz / TMoney).
 * - POST /payments/initiate (staff) : trace EN_ATTENTE pour une commande.
 * - POST /payments/webhook (public, HMAC fail-closed) : confirmation passerelle.
 * - GET /payments (staff) : historique.
 * - PATCH /payments/:orderId/reconcile (admin) : rapprochement manuel.
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles('ADMIN', 'VENDEUR')
  @Post('initiate')
  initiate(@Body() body: InitiatePaymentDto) {
    return this.payments.initiate(body);
  }

  @Public()
  @Post('webhook')
  webhook(@Body() body: CinetPayWebhookDto) {
    return this.payments.handleWebhook(body);
  }

  @Roles('ADMIN', 'VENDEUR')
  @Get()
  findAll() {
    return this.payments.findAll();
  }

  @Roles('ADMIN', 'VENDEUR')
  @Get('order/:orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.payments.findByOrderId(orderId);
  }

  @Roles('ADMIN')
  @Patch(':orderId/reconcile')
  reconcile(@Param('orderId') orderId: string, @Body() body: ReconcilePaymentDto) {
    return this.payments.reconcile(orderId, body ?? {});
  }
}
