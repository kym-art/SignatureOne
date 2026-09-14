import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
} from '@nestjs/common';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto, ResetVendorPasswordDto } from './vendors.dto';

/**
 * Gestion des vendeurs — source de vérité serveur.
 *
 * Toutes les opérations de création / modification / réinitialisation de
 * mot de passe de vendeurs passent par Supabase Auth. Le mot de passe est
 * hashé par Supabase : jamais stocké en clair dans notre application.
 *
 * Routes ADMIN only (sauf GET qui liste pour l'UI admin).
 */
@Roles('ADMIN')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  /** Liste tous les vendeurs (ADMIN) */
  @Get()
  findAll() {
    return this.vendors.findAll();
  }

  /** Détails d'un vendeur (ADMIN) */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendors.findOne(id);
  }

  /** Crée un nouveau vendeur avec mot de passe (ADMIN) */
  @Post()
  create(@Body() body: CreateVendorDto) {
    return this.vendors.create(body);
  }

  /** Met à jour un vendeur (nom, tel, actif, rôle, mot de passe) (ADMIN) */
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateVendorDto) {
    return this.vendors.update(id, body);
  }

  /** Active/désactive un vendeur (ADMIN) */
  @Patch(':id/toggle')
  toggleStatus(@Param('id') id: string) {
    return this.vendors.toggleStatus(id);
  }

  /** Réinitialise le mot de passe (ADMIN) — génère un nouveau mot de passe aléatoire */
  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body?: ResetVendorPasswordDto) {
    return this.vendors.resetPassword(id, body);
  }

  /** Soft-delete : désactive le vendeur et son compte Auth (ADMIN) */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vendors.remove(id);
  }
}