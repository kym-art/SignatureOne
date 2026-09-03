import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { Review } from '../types';

@Injectable()
export class ReviewsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(): Promise<Review[]> {
    const { data, error } = await this.supabase.admin.from('Review').select('*').order('createdAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as Review[];
  }

  async findPending(): Promise<Review[]> {
    const { data, error } = await this.supabase.admin
      .from('Review')
      .select('*')
      .eq('valide', false)
      .order('createdAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as Review[];
  }

  async create(body: Partial<Review>): Promise<Review> {
    // Endpoint public : validation stricte des champs (anti-spam / anti-abus),
    // puis insertion TOUJOURS non validée et non mise en avant — la modération
    // est a posteriori.
    const note = Number(body?.note);
    if (!Number.isInteger(note) || note < 1 || note > 5) {
      throw new BadRequestException('La note doit être un entier entre 1 et 5.');
    }
    const commentaire = body?.commentaire != null ? String(body.commentaire) : null;
    if (commentaire !== null && commentaire.length > 1000) {
      throw new BadRequestException('Le commentaire ne doit pas dépasser 1000 caractères.');
    }
    const prenom = body?.prenom != null ? String(body.prenom) : null;
    if (prenom !== null && (prenom.length === 0 || prenom.length > 100)) {
      throw new BadRequestException('Le prénom doit contenir entre 1 et 100 caractères.');
    }
    if (!body?.orderId || typeof body.orderId !== 'string') {
      throw new BadRequestException('La commande concernée (orderId) est requise.');
    }
    const { data, error } = await this.supabase.admin
      .from('Review')
      .insert({
        orderId: body.orderId,
        note,
        commentaire,
        prenom,
        valide: false,
        misEnAvant: false,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data as Review;
  }

  async validate(id: string): Promise<Review> {
    const { data, error } = await this.supabase.admin.from('Review').update({ valide: true, misEnAvant: false }).eq('id', id).select('*').single();
    if (error) throw new NotFoundException(error.message);
    return data as Review;
  }

  async feature(id: string, patch: { misEnAvant?: boolean; valide?: boolean } = {}): Promise<Review> {
    // Permet : mise en avant (misEnAvant: true), retrait (misEnAvant: false),
    // ou masquage complet (misEnAvant: false + valide: false).
    const update: { valide?: boolean; misEnAvant?: boolean } = {};
    if (patch.misEnAvant !== undefined) update.misEnAvant = patch.misEnAvant;
    if (patch.valide !== undefined) update.valide = patch.valide;
    if (Object.keys(update).length === 0) {
      update.valide = true;
      update.misEnAvant = true;
    }
    const { data, error } = await this.supabase.admin.from('Review').update(update).eq('id', id).select('*').single();
    if (error) throw new NotFoundException(error.message);
    return data as Review;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.admin.from('Review').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
