import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { Expense } from '../types';

@Injectable()
export class ExpensesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(): Promise<Expense[]> {
    const { data, error } = await this.supabase.admin
      .from('Expense')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as Expense[];
  }

  async create(libelle: string, montant: number, dateIso?: string): Promise<Expense> {
    const { data, error } = await this.supabase.admin
      .from('Expense')
      .insert({
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        libelle: libelle.trim(),
        montant: Math.round(montant),
        createdAt: dateIso || new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data as Expense;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.admin.from('Expense').delete().eq('id', id);
    if (error) throw new NotFoundException(error.message);
  }
}