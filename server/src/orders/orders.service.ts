import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateOrderDto, DirectSaleDto } from './orders.dto';
import { JwtUserPayload } from '../common/auth/jwt.service';
import {
  Order,
  StatutCommande,
  StatutPaiement,
  ModePaiement,
  TypeCommande,
  OrderItem,
} from '../types';

function padNum(n: number): string {
  return `SO-${String(n).padStart(4, '0')}`;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findAll(): Promise<Order[]> {
    const { data, error } = await this.supabase.admin
      .from('Order')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    const orders = (data || []) as Order[];
    // Les lignes Order n'embarquent pas les items : on les joint explicitement.
    if (orders.length > 0) {
      const { data: items, error: itemsErr } = await this.supabase.admin
        .from('OrderItem')
        .select('*')
        .in('orderId', orders.map((o) => o.id));
      if (!itemsErr && items) {
        const byOrder = new Map<string, OrderItem[]>();
        for (const it of (items || []) as OrderItem[]) {
          const list = byOrder.get(it.orderId) ?? [];
          list.push(it);
          byOrder.set(it.orderId, list);
        }
        for (const o of orders) {
          o.items = byOrder.get(o.id) ?? [];
        }
      }
    }
    return orders;
  }

  async findOne(id: string): Promise<Order> {
    const { data, error } = await this.supabase.admin
      .from('Order')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Commande introuvable');
    const { data: items, error: itemsErr } = await this.supabase.admin
      .from('OrderItem')
      .select('*')
      .eq('orderId', id);
    if (itemsErr) throw new BadRequestException(itemsErr.message);
    return { ...(data as Order), items: (items || []) as Order['items'] };
  }

    private paymentStatusForMode(mode: ModePaiement): StatutPaiement {
    if (mode === 'LIVRAISON') return 'PAIEMENT_LIVRAISON';
    if (mode === 'SUR_PLACE') return 'PAIEMENT_SUR_PLACE';
    return 'EN_ATTENTE';
  }

  async create(input: CreateOrderDto): Promise<Order> {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('Aucun article dans la commande.');
    }
    if (!input.clientNom || !input.clientTel || !input.typeCommande || !input.modePaiement) {
      throw new BadRequestException('Champs obligatoires manquants.');
    }

    // Le total est RÉCALCULÉ serveur (pas de confiance dans la valeur client).
    let total = 0;
    const rows = input.items.map((it) => {
      const subtotal = it.prixUnitaire * it.quantite;
      total += subtotal;
      return {
        id: `it_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        productId: it.productId,
        quantite: it.quantite,
        prixUnitaire: it.prixUnitaire,
      };
    });

    const numero = await this.getNextOrderNumber();
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const { error: orderErr } = await this.supabase.admin
      .from('Order')
      .insert({
        id: orderId,
        numero,
        clientNom: input.clientNom,
        clientTel: input.clientTel,
        typeCommande: input.typeCommande as TypeCommande,
        tableId: input.tableId ?? null,
        adresseLivraison: input.adresseLivraison ?? null,
        statut: 'NOUVELLE',
        statutPaiement: this.paymentStatusForMode(input.modePaiement),
        modePaiement: input.modePaiement as ModePaiement,
        total,
        payment_reference: input.payment_reference ?? null,
        payment_amount_expected: total,
        recuNumero: input.recuNumero ?? null,
        recuUrl: input.recuUrl ?? null,
        vendeurId: null,
      });
    if (orderErr) throw new BadRequestException(orderErr.message);

    const { error: itemsErr } = await this.supabase.admin.from('OrderItem').insert(
      rows.map((r) => ({ ...r, orderId }))
    );
    if (itemsErr) this.logger.warn(`Insertion OrderItem échec: ${itemsErr.message}`);

    const created = await this.findOne(orderId);
    this.logger.log(`✅ Commande créée ${numero} (${total} FCFA)`);
    return created;
  }

  async updateStatus(orderId: string, statut: string, user: JwtUserPayload): Promise<Order> {
    const valid: StatutCommande[] = ['NOUVELLE', 'ACCEPTEE', 'EN_PREPARATION', 'PRETE', 'TERMINEE'];
    if (!valid.includes(statut as StatutCommande)) {
      throw new BadRequestException('Statut invalide');
    }
    if (user.role === 'VENDEUR') {
      const order = await this.findOne(orderId);
      if (order.vendeurId !== user.sub) {
        throw new ForbiddenException('Cette commande n’est pas assignée à ce vendeur.');
      }
    }
    const { error } = await this.supabase.admin
      .from('Order')
      .update({ statut })
      .eq('id', orderId);
    if (error) throw new BadRequestException(error.message);
    return this.findOne(orderId);
  }

  /** Validation manuelle d’un paiement (admin uniquement). */
  async confirmPayment(orderId: string): Promise<Order> {
    const { data, error } = await this.supabase.admin
      .from('Order')
      .update({
        statutPaiement: 'PAYE',
        statut: 'ACCEPTEE',
        datePaiement: new Date().toISOString(),
      })
      .eq('id', orderId)
      // ⚠️ `.is()` de PostgREST n'accepte que null/booleen (is.EN_ATTENTE -> 400).
      // `.eq()` + `.single()` : 0 ligne mise à jour => PGRST116 (voir ci-dessous).
      .eq('statutPaiement', 'EN_ATTENTE')
      .select('*')
      .single();
    if (error && error.code !== 'PGRST116') {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      // Aucune ligne EN_ATTENTE : paiement déjà validé ou commande inexistante.
      const order = await this.findOne(orderId).catch(() => null);
      if (!order) throw new NotFoundException('Commande introuvable');
      throw new ConflictException('Le paiement est déjà validé.');
    }
    return data as Order;
  }

  /**
   * Prendre en charge une commande : first-come-first-served.
   * L'UPDATE ciblé sur `vendeurId IS NULL AND statut = NOUVELLE` garantit
   * l'atomicité — si une autre transaction l'a déjà revendiquée, 0 ligne change.
   */
  async claimOrder(orderId: string, user: JwtUserPayload): Promise<Order> {
    if (user.role !== 'VENDEUR') {
      throw new ForbiddenException('Réservé aux vendeurs.');
    }
    const { data, error } = await this.supabase.admin
      .from('Order')
      .update({ vendeurId: user.sub, statut: 'ACCEPTEE' })
      .eq('id', orderId)
      .is('vendeurId', null)
      .eq('statut', 'NOUVELLE')
      .select('*')
      .single();
    // PGRST116 = aucune ligne mise à jour (transaction déjà prise ou commande absente).
    if (error && error.code !== 'PGRST116') {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      const existing = await this.findOne(orderId).catch(() => null);
      if (!existing) throw new NotFoundException('Commande introuvable');
      throw new ConflictException(
        existing.vendeurId
          ? 'Cette commande est déjà prise en charge.'
          : "Cette commande n'est plus au statut NOUVELLE."
      );
    }
    return data as Order;
  }

  /** Admin : revert d'un paiement validé (PAYE → EN_ATTENTE), persisté serveur. */
  async unpayPayment(orderId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    if (order.statutPaiement !== 'PAYE') {
      throw new ConflictException('Ce paiement n’est pas au statut PAYE.');
    }
    const { error } = await this.supabase.admin
      .from('Order')
      .update({ statutPaiement: 'EN_ATTENTE', datePaiement: null })
      .eq('id', orderId)
      .eq('statutPaiement', 'PAYE');
    if (error) throw new BadRequestException(error.message);
    return this.findOne(orderId);
  }

  /** Admin : assigner/réassigner un vendeur (ou null pour désassigner). */
  async assignVendor(orderId: string, vendeurId: string | null): Promise<Order> {
    await this.findOne(orderId);
    if (vendeurId) {
      const { data: vendor, error } = await this.supabase.admin
        .from('User')
        .select('id, role, actif')
        .eq('id', vendeurId)
        .maybeSingle();
      if (error) throw new BadRequestException(error.message);
      if (!vendor || vendor.role !== 'VENDEUR' || !vendor.actif) {
        throw new BadRequestException('Vendeur cible invalide, inexistant ou désactivé.');
      }
    }
    const { error: upErr } = await this.supabase.admin
      .from('Order')
      .update({ vendeurId: vendeurId ?? null })
      .eq('id', orderId);
    if (upErr) throw new BadRequestException(upErr.message);
    return this.findOne(orderId);
  }

  /**
   * Vente directe comptoir : commande immédiatement TERMINEE + PAYE, assignée
   * à l'utilisateur authentifié (vendeur ou admin), avec numéro de reçu.
   */
  async createDirectSale(input: DirectSaleDto, user: JwtUserPayload): Promise<Order> {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('Aucun article dans la vente.');
    }
    if (!input.modePaiement) {
      throw new BadRequestException('Mode de paiement manquant.');
    }

    // Total recalculé serveur (pas de confiance dans la valeur client).
    let total = 0;
    const rows = input.items.map((it) => {
      const prix = it.prixUnitaire ?? 0;
      total += prix * it.quantite;
      return {
        id: `it_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        productId: it.productId,
        quantite: it.quantite,
        prixUnitaire: prix,
      };
    });

    const numero = await this.getNextOrderNumber();
    const orderId = `ord_direct_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const { error: orderErr } = await this.supabase.admin
      .from('Order')
      .insert({
        id: orderId,
        numero,
        clientNom: input.clientNom?.trim() || 'Client Comptoir',
        clientTel: input.clientTel?.trim() || '+228 90 00 00 00',
        typeCommande: (input.typeCommande ?? 'RETRAIT') as TypeCommande,
        tableId: input.tableId ?? null,
        adresseLivraison: null,
        statut: 'TERMINEE',
        statutPaiement: 'PAYE',
        modePaiement: input.modePaiement as ModePaiement,
        total,
        vendeurId: user.sub,
        recuNumero: `REC-${numero.replace('SO-', '')}`,
        recuUrl: `/recu/${numero}`,
        datePaiement: now,
        payment_amount_expected: total,
      });
    if (orderErr) throw new BadRequestException(orderErr.message);

    const { error: itemsErr } = await this.supabase.admin
      .from('OrderItem')
      .insert(rows.map((r) => ({ ...r, orderId })));
    if (itemsErr) this.logger.warn(`Insertion OrderItem (vente directe) échec: ${itemsErr.message}`);

    const created = await this.findOne(orderId);
    this.logger.log(`✅ Vente directe ${numero} (${total} FCFA) par ${user.sub}`);
    return created;
  }

  private async getNextOrderNumber(): Promise<string> {
    const { data, error } = await this.supabase.admin
      .from('Order')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1);
    if (error) {
      this.logger.warn(`getNextOrderNumber fallback: ${error.message}`);
      return padNum(Date.now());
    }
    const last = (data && data.length > 0 ? data[0].numero : null) as string | null;
    if (!last || !/^SO-\d+$/.test(last)) return padNum(1);
    const n = parseInt(last.replace('SO-', ''), 10) + 1;
    return padNum(n);
  }
}

