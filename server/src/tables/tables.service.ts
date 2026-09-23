import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { TableQR } from '../types';
import { CreateTableDto } from './tables.dto';

@Injectable()
export class TablesService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Public : liste des tables (read-only). Source de vérité = TableQR. */
  async findAll(): Promise<TableQR[]> {
    const { data, error } = await this.supabase.admin
      .from('TableQR')
      .select('*')
      .order('numero', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as TableQR[];
  }

  /** Public : table par id. */
  async findOne(id: string): Promise<TableQR> {
    const { data, error } = await this.supabase.admin
      .from('TableQR')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Table introuvable');
    return data as TableQR;
  }

  /** Admin : crée une table (numero unique — violation = 409). */
  async create(body: CreateTableDto): Promise<TableQR> {
    const id = `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await this.supabase.admin
      .from('TableQR')
      .insert({ id, numero: body.numero })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(`La table #${body.numero} existe déjà.`);
      }
      throw new BadRequestException(error.message);
    }
    return data as TableQR;
  }

  /** Admin : supprime une table. */
  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.admin.from('TableQR').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
