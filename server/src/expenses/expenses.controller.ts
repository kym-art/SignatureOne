import { Body, Controller, Get, Post, Delete, Param, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { Expense } from '../types';

/**
 * Expenses : source de vérité = table Supabase `Expense`. ACL admin/vendeur.
 */
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Roles('ADMIN', 'VENDEUR')
  @Get()
  findAll(): Promise<Expense[]> {
    return this.expenses.findAll();
  }

  @Roles('ADMIN', 'VENDEUR')
  @Post()
  create(@Body('libelle') libelle: string, @Body('montant') montant: number, @Body('dateIso') dateIso?: string): Promise<Expense> {
    return this.expenses.create(libelle, montant, dateIso);
  }

  @Roles('ADMIN', 'VENDEUR')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.expenses.remove(id);
    return { success: true };
  }
}