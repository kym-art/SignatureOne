import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Public } from '../common/auth/decorators/public.decorator';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { CreateReviewDto, FeatureReviewDto } from './reviews.dto';

/**
 * Les avis clients sont modérés par l'admin via le backend (service_role).
 * L'écriture depuis le navigateur anonyme est bloquée par RLS (voir migration).
 * Une ouverture en INSERT public pourra être ajoutée sur arbitrage.
 */
@Controller('reviews')
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
  create(@Body() body: CreateReviewDto) {
    return this.reviews.create(body);
  }

  @Roles('ADMIN')
  @Patch(':id/validate')
  validate(@Param('id') id: string) {
    return this.reviews.validate(id);
  }

  /** Body optionnel : { valide } — publication ou masquage. */
  @Roles('ADMIN')
  @Patch(':id/feature')
  feature(@Param('id') id: string, @Body() body: FeatureReviewDto) {
    return this.reviews.feature(id, body ?? {});
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviews.remove(id);
  }
}
