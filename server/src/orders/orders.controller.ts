import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Public } from '../common/auth/decorators/public.decorator';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/auth/guards/roles.guard';
import { CreateOrderDto, DirectSaleDto } from './orders.dto';
import { JwtUserPayload } from '../common/auth/jwt.service';

interface AuthedRequest {
  user: JwtUserPayload;
}

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Public : un client anonyme peut créer sa commande (checkout). */
  @Public()
  @Post()
  create(@Body() body: CreateOrderDto) {
    return this.orders.create(body);
  }

  /** Admin/Vendeur : lecture complète (source de vérité serveur). */
  @Roles('ADMIN', 'VENDEUR')
  @Get()
  findAll() {
    return this.orders.findAll();
  }

  @Roles('ADMIN', 'VENDEUR')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  /** Admin/Vendeur : changement de statut de la commande. */
  @Roles('ADMIN', 'VENDEUR')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { statut: string },
    @Req() req: AuthedRequest,
  ) {
    return this.orders.updateStatus(id, body.statut, req.user);
  }

  /** Admin/Vendeur : validation manuelle d'un paiement (encaissement comptoir). */
  @Roles('ADMIN', 'VENDEUR')
  @Patch(':id/pay')
  confirmPayment(@Param('id') id: string) {
    return this.orders.confirmPayment(id);
  }

  /** Admin uniquement : revert d'un paiement (PAYE → EN_ATTENTE), persisté serveur. */
  @Roles('ADMIN')
  @Patch(':id/unpay')
  unpay(@Param('id') id: string) {
    return this.orders.unpayPayment(id);
  }

  /** Admin uniquement : assigner/réassigner un vendeur (body { vendeurId } ou { vendeurId: null }). */
  @Roles('ADMIN')
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() body: { vendeurId?: string | null }) {
    return this.orders.assignVendor(id, body?.vendeurId ?? null);
  }

  /** Admin/Vendeur : vente directe comptoir (immédiatement TERMINEE + PAYE). */
  @Roles('ADMIN', 'VENDEUR')
  @Post('direct-sale')
  createDirectSale(@Body() body: DirectSaleDto, @Req() req: AuthedRequest) {
    return this.orders.createDirectSale(body, req.user);
  }

  /** Vendeur uniquement : prendre en charge une commande (premier arrivé). */
  @Roles('VENDEUR')
  @Post(':id/claim')
  claim(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.orders.claimOrder(id, req.user);
  }
}

