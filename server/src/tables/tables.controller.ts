import { Body, Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { TablesService } from './tables.service';
import { Public } from '../common/auth/decorators/public.decorator';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { CreateTableDto } from './tables.dto';
import { TableQR } from '../types';

/**
 * Tables & QR : source de vérité = table Supabase `TableQR`.
 * Lecture publique (choix de table au QR) ; écriture admin (création/suppression).
 */
@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Public()
  @Get()
  findAll(): Promise<TableQR[]> {
    return this.tables.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string): Promise<TableQR> {
    return this.tables.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateTableDto): Promise<TableQR> {
    return this.tables.create(body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.tables.remove(id);
    return { success: true };
  }
}
