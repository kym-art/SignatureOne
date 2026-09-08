import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../common/auth/decorators/public.decorator';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { CreateProductDto, UpdateProductDto } from './products.dto';

// Guards globaux via APP_GUARD (app.module).
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Public : catalogue en ligne pour les clients. */
  @Public()
  @Get()
  findAll() {
    return this.products.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  /** Admin : création/modif/suppression de produits. */
  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateProductDto) {
    return this.products.create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.products.update(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
