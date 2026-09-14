import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import { Public } from '../common/auth/decorators/public.decorator';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { StoreSettingsDto } from './settings.dto';

/**
 * Paramètres magasin : horaires d'ouverture + fermeture exceptionnelle.
 *
 * GET /api/store/settings   — public (client lit l'état ouvert/fermé)
 * PATCH /api/store/settings — ADMIN uniquement (modifie horaires + closure)
 */
@Controller('store')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('settings')
  async getStatus() {
    return this.settings.getStoreStatus();
  }

  @Roles('ADMIN')
  @Patch('settings')
  async update(@Body() body: StoreSettingsDto) {
    return this.settings.updateSettings(body);
  }
}