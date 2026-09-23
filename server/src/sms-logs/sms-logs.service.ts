import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { SmsLog, SmsStatus } from '../types';

@Injectable()
export class SmsLogsService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Admin/Vendeur : historique des SMS de paiement (source = table SmsLog). */
  async findAll(): Promise<SmsLog[]> {
    const { data, error } = await this.supabase.admin
      .from('SmsLog')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as SmsLog[];
  }

  async findOne(id: string): Promise<SmsLog> {
    const { data, error } = await this.supabase.admin
      .from('SmsLog')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('SMS log introuvable');
    return data as SmsLog;
  }

  /** Marque un log comme rapproché (status + matchedOrderId). */
  async setStatus(id: string, status: SmsStatus, matchedOrderId?: string | null): Promise<SmsLog> {
    const { data, error } = await this.supabase.admin
      .from('SmsLog')
      .update({
        status,
        matchedOrderId: matchedOrderId ?? null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new NotFoundException(error.message);
    return data as SmsLog;
  }
}
