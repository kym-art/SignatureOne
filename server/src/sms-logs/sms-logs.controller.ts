import { Controller, Get, Param } from '@nestjs/common';
import { SmsLogsService } from './sms-logs.service';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { SmsLog } from '../types';

/**
 * SMS logs : historique serveur de la réconciliation mobile-money.
 * RLS = aucun accès anon → uniquement staff authentifié (ADMIN/VENDEUR).
 */
@Controller('sms-logs')
export class SmsLogsController {
  constructor(private readonly logs: SmsLogsService) {}

  @Roles('ADMIN', 'VENDEUR')
  @Get()
  findAll(): Promise<SmsLog[]> {
    return this.logs.findAll();
  }

  @Roles('ADMIN', 'VENDEUR')
  @Get(':id')
  findOne(@Param('id') id: string): Promise<SmsLog> {
    return this.logs.findOne(id);
  }
}
