import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Public } from '../common/auth/decorators/public.decorator';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/auth/guards/roles.guard';
import { Review } from '../types';

/**
 * Les avis clients sont modérés par l'admin via le backend (service_role).
 * L'écriture depuis le navigateur anonyme est bloquée par RLS (voir migration).
 * Une ouverture en INSERT public pourra être ajoutée sur arbitrage.
 */
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.reviews.findAll();
  }

  @Roles('ADMIN')
  @Get('pending')
  findPending() {
    return this.reviews.findPending();
  }

  /** Public : soumission d'un avis client (créé non validé, modération a posteriori). */
  @Public()
  @Post()
  create(@Body() body: Partial<Review>) {
    return this.reviews.create(body);
  }

  @Roles('ADMIN')
  @Patch(':id/validate')
  validate(@Param('id') id: string) {
    return this.reviews.validate(id);
  }

  /** Body optionnel : { misEnAvant, valide } — toggle ou masquage. */
  @Roles('ADMIN')
  @Patch(':id/feature')
  feature(@Param('id') id: string, @Body() body: { misEnAvant?: boolean; valide?: boolean }) {
    return this.reviews.feature(id, body ?? {});
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviews.remove(id);
  }
}
