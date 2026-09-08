import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateReviewDto } from './reviews.dto';
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

  async create(body: CreateReviewDto): Promise<Review> {
    // Endpoint public : validation stricte des champs (anti-spam / anti-abus),
    // puis insertion TOUJOURS non validée — la modération est a posteriori.
    const commentaire = body?.commentaire ?? null;
    const prenom = body?.prenom ?? null;

    // Anti-spam serveur : la commande doit exister ET être TERMINEE, et un avis
    // ne peut être soumis qu'une seule fois (le check frontend ne suffit pas).
    const { data: order, error: orderErr } = await this.supabase.admin
      .from('Order')
      .select('id, statut')
      .eq('id', body.orderId)
      .maybeSingle();
    if (orderErr) throw new BadRequestException(orderErr.message);
    if (!order) throw new BadRequestException('Commande introuvable.');
    if (order.statut !== 'TERMINEE') {
      throw new BadRequestException("L'avis ne peut être soumis qu'après une commande terminée.");
    }
    const { data: existing } = await this.supabase.admin
      .from('Review')
      .select('id')
      .eq('orderId', body.orderId)
      .maybeSingle();
    if (existing) {
      throw new BadRequestException('Un avis a déjà été soumis pour cette commande.');
    }

    const { data, error } = await this.supabase.admin
      .from('Review')
      .insert({
        // Id généré serveur : @default(cuid()) du schéma Prisma n'existe pas
        // au niveau SQL (défaut applicatif du client Prisma uniquement).
        id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orderId: body.orderId,
        note: body.note,
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
