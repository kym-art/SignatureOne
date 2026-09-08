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
        // Id généré serveur : @default(cuid()) du schéma Prisma n'existe pas
        // au niveau SQL (défaut applicatif du client Prisma uniquement).
        id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orderId: body.orderId,
        note,
        commentaire,
        prenom,
        valide: false,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data as Review;
  }

  async validate(id: string): Promise<Review> {
    const { data, error } = await this.supabase.admin.from('Review').update({ valide: true }).eq('id', id).select('*').single();
    if (error) throw new NotFoundException(error.message);
    return data as Review;
  }

  async feature(id: string, patch: { misEnAvant?: boolean; valide?: boolean } = {}): Promise<Review> {
    // ⚠️ La colonne Review.misEnAvant n'existe ni dans le schéma Prisma ni en
    // base (résidu retiré des migrations) : elle n'est PAS persistable.
    // Seul `valide` est persistant ; `misEnAvant` est ignoré (compat anciens clients).
    const update: { valide?: boolean } = {};
    if (patch.valide !== undefined) update.valide = patch.valide;
    if (Object.keys(update).length === 0) {
      // Cas par défaut historique (« mettre en avant ») → rend l'avis validé.
      update.valide = true;
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
