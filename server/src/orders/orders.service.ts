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

    // ✅ Le total est recalculé FROM SCRATCH depuis la table Product : le prix
    // unitaire envoyé par le client est IGNORÉ (faille de sécurité sinon).
    const { rows, total } = await this.resolvePricedItems(input.items);

    const { orderId, numero } = await this.insertOrderWithRetry('ord', (id, num) => ({
      id,
      numero: num,
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
    }));

    // Atomicité : si l'insertion des items échoue, on ROLLBACK la commande
    // (pas d'ordre orphelin sans articles).
    const { error: itemsErr } = await this.supabase.admin.from('OrderItem').insert(
      rows.map((r) => ({ ...r, orderId }))
    );
    if (itemsErr) {
      await this.supabase.admin.from('Order').delete().eq('id', orderId);
      throw new BadRequestException(`Impossible d'enregistrer les articles: ${itemsErr.message}`);
    }

    // Décrémente le stock des produits vendus (une seule fois par produit).
    const qtyByProduct = new Map<string, number>();
    for (const r of rows) {
      qtyByProduct.set(r.productId, (qtyByProduct.get(r.productId) ?? 0) + r.quantite);
    }
    for (const [productId, qte] of qtyByProduct) {
      await this.decrementStock(productId, qte);
    }

    const created = await this.findOne(orderId);
    this.logger.log(`✅ Commande créée ${numero} (${total} FCFA)`);
    return created;
  }

  async updateStatus(orderId: string, statut: string, user: JwtUserPayload): Promise<Order> {
    const valid: StatutCommande[] = ['NOUVELLE', 'ACCEPTEE', 'EN_PREPARATION', 'PRETE', 'TERMINEE'];
    if (!valid.includes(statut as StatutCommande)) {
      throw new BadRequestException('Statut invalide');
    }
    const order = await this.findOne(orderId);
    if (user.role === 'VENDEUR' && order.vendeurId !== user.sub) {
      throw new ForbiddenException('Cette commande n’est pas assignée à ce vendeur.');
    }

    // Idempotence : statut identique → rien à faire (permet les retries clients).
    if (order.statut === statut) return order;

    // Machine à états : seules les transitions « en avant » sont autorisées
    // (pas de retour en arrière = pas d'incohérence de workflow).
    const allowed = this.TRANSITIONS[order.statut] ?? [];
    if (!allowed.includes(statut as StatutCommande)) {
      throw new BadRequestException(`Transition invalide: ${order.statut} → ${statut}`);
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
    const current = await this.findOne(orderId);
    if (current.statutPaiement === 'PAYE') {
      throw new ConflictException('Le paiement est déjà validé.');
    }
    // Le statut de commande n'est avancé que s'il est encore NOUVELLE
    // (évite de faire reculer une commande déjà plus avancée).
    const nextStatut = current.statut === 'NOUVELLE' ? 'ACCEPTEE' : current.statut;
    const { data, error } = await this.supabase.admin
      .from('Order')
      .update({
        statutPaiement: 'PAYE',
        statut: nextStatut,
        datePaiement: new Date().toISOString(),
      })
      .eq('id', orderId)
      // ⚠️ Les commandes LIVRAISON/SUR_PLACE démarrent à PAIEMENT_LIVRAISON /
      // PAIEMENT_SUR_PLACE (voir paymentStatusForMode), PAS à EN_ATTENTE :
      // un `.eq('statutPaiement', 'EN_ATTENTE')` matcherait 0 ligne et refuserait
      // à tort leur confirmation. Verrou optimiste : « pas encore PAYE ».
      .not('statutPaiement', 'eq', 'PAYE')
      .select('*')
      .single();
    if (error && error.code !== 'PGRST116') {
      throw new BadRequestException(error.message);
    }
    if (!data) {
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

    // ✅ Prix et disponibilité recalculés depuis la table Product.
    const { rows, total } = await this.resolvePricedItems(input.items);
    const now = new Date().toISOString();

    const { orderId, numero } = await this.insertOrderWithRetry('ord_direct', (id, num) => ({
      id,
      numero: num,
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
      recuNumero: `REC-${num.replace('SO-', '')}`,
      recuUrl: `/recu/${num}`,
      datePaiement: now,
      payment_amount_expected: total,
    }));

    // Atomicité : échec d'insertion des items → rollback de la vente.
    const { error: itemsErr } = await this.supabase.admin
      .from('OrderItem')
      .insert(rows.map((r) => ({ ...r, orderId })));
    if (itemsErr) {
      await this.supabase.admin.from('Order').delete().eq('id', orderId);
      throw new BadRequestException(`Impossible d'enregistrer les articles: ${itemsErr.message}`);
    }

    // Décrémente le stock des produits vendus (une seule fois par produit).
    const qtyByProduct = new Map<string, number>();
    for (const r of rows) {
      qtyByProduct.set(r.productId, (qtyByProduct.get(r.productId) ?? 0) + r.quantite);
    }
    for (const [productId, qte] of qtyByProduct) {
      await this.decrementStock(productId, qte);
    }

    const created = await this.findOne(orderId);
    this.logger.log(`✅ Vente directe ${numero} (${total} FCFA) par ${user.sub}`);
    return created;
  }

  /**
   * Recalcule le prix de chaque ligne depuis la table Product (source de
   * vérité). Vérifie l'existence, l'activité et la disponibilité du produit.
   * Le prix unitaire client est ignoré.
   */
  private async resolvePricedItems(
    items: { productId: string; quantite: number }[]
  ): Promise<{ rows: Omit<OrderItem, 'orderId'>[]; total: number }> {
    const ids = [...new Set(items.map((it) => it.productId))];
    const { data, error } = await this.supabase.admin
      .from('Product')
      .select('id, prix, disponible, actif, quantiteRestante')
      .in('id', ids);
    if (error) {
      throw new BadRequestException(`Erreur lecture produits: ${error.message}`);
    }
    const byId = new Map<
      string,
      { prix: number; disponible: boolean; actif: boolean; quantiteRestante: number | null }
    >(
      (
        (data ?? []) as {
          id: string;
          prix: number;
          disponible: boolean;
          actif: boolean;
          quantiteRestante: number | null;
        }[]
      ).map((p) => [p.id, p])
    );

    const rows: Omit<OrderItem, 'orderId'>[] = [];
    let total = 0;
    for (const it of items) {
      const prod = byId.get(it.productId);
      if (!prod) throw new BadRequestException(`Produit introuvable: ${it.productId}`);
      if (!prod.actif || !prod.disponible) {
        throw new BadRequestException(`Produit indisponible: ${it.productId}`);
      }
      // Stock suivi et épuisé → refuser (évite une survente silencieuse).
      if (prod.quantiteRestante !== null && prod.quantiteRestante <= 0) {
        throw new BadRequestException(`Produit épuisé: ${it.productId}`);
      }
      if (typeof prod.prix !== 'number' || prod.prix <= 0) {
        throw new BadRequestException(`Prix invalide pour le produit ${it.productId}`);
      }
      total += prod.prix * it.quantite;
      rows.push({
        id: `it_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        productId: it.productId,
        quantite: it.quantite,
        prixUnitaire: prod.prix,
      });
    }
    return { rows, total };
  }

  /**
   * Décrémente le stock (quantiteRestante) après une vente confirmée.
   * - stock non suivi (null) → rien à faire (vente illimitée).
   * - décrément contraint par `.gte('quantiteRestante', qte)` : si le stock a
   *   bougé entre-temps (0 ligne), on log un avertissement sans casser l'ordre.
   * À 0 → le produit passe indisponible dans le catalogue.
   */
  private async decrementStock(productId: string, quantite: number): Promise<void> {
    const { data: prod, error: readErr } = await this.supabase.admin
      .from('Product')
      .select('quantiteRestante')
      .eq('id', productId)
      .maybeSingle();
    if (readErr || !prod) {
      if (readErr) this.logger.warn(`decrementStock lecture ${productId}: ${readErr.message}`);
      return;
    }
    const current = (prod as { quantiteRestante: number | null }).quantiteRestante;
    if (current === null || current === undefined) return; // stock non suivi
    const next = Math.max(0, current - quantite);
    const { error: upErr } = await this.supabase.admin
      .from('Product')
      .update({ quantiteRestante: next, disponible: next > 0 })
      .eq('id', productId)
      .gte('quantiteRestante', quantite);
    if (upErr) this.logger.warn(`decrementStock ${productId}: ${upErr.message}`);
  }

  /**
   * Insère une commande avec numéro SO-XXXX. En cas de violation d'unicité du
   * numéro (concurrence), re-génère un numéro et re-tente (max 3 essais).
   */
  private async insertOrderWithRetry(
    prefix: 'ord' | 'ord_direct',
    buildPayload: (orderId: string, numero: string) => Record<string, unknown>
  ): Promise<{ orderId: string; numero: string }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const numero = await this.getNextOrderNumber();
      const orderId = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const { error } = await this.supabase.admin.from('Order').insert(buildPayload(orderId, numero));
      if (!error) return { orderId, numero };
      // Code 23505 = unique_violation : un autre process a pris le même numéro.
      if (error.code === '23505' && /numero/i.test(error.message)) continue;
      throw new BadRequestException(error.message);
    }
    throw new ConflictException('Conflit de numéro de commande. Veuillez réessayer.');
  }

  /** Transitions de statut autorisées (machine à états, sens avant uniquement). */
  private readonly TRANSITIONS: Record<StatutCommande, StatutCommande[]> = {
    NOUVELLE: ['ACCEPTEE', 'EN_PREPARATION'],
    ACCEPTEE: ['EN_PREPARATION', 'PRETE', 'TERMINEE'],
    EN_PREPARATION: ['PRETE', 'TERMINEE'],
    PRETE: ['TERMINEE'],
    TERMINEE: [],
  };

  /**
   * Numéro SO-XXXX : calculé par PostgreSQL (fonction next_order_number(), voir
   * prisma/migrations/..._secure_orders) → O(1) au lieu de scanner des milliers
   * de lignes. Repli automatique sur un scan mémoire si le RPC n'est pas encore
   * déployé en base (ex. environnement non migré).
   */
  private async getNextOrderNumber(): Promise<string> {
    try {
      const { data, error } = await this.supabase.admin.rpc('next_order_number');
      if (!error && typeof data === 'string' && /^SO-\d+$/.test(data)) {
        return data;
      }
      this.logger.warn(
        `getNextOrderNumber RPC indisponible (${error?.message ?? 'réponse invalide'}) — fallback scan.`
      );
    } catch (e) {
      this.logger.warn(`getNextOrderNumber RPC erreur: ${(e as Error)?.message} — fallback scan.`);
    }
    // Fallback : max numérique sur tous les numéros (rendu robuste au-delà de 9999).
    const { data, error } = await this.supabase.admin.from('Order').select('numero').limit(100000);
    if (error) {
      this.logger.warn(`getNextOrderNumber fallback: ${error.message}`);
      return padNum(1);
    }
    let max = 0;
    for (const row of (data ?? []) as { numero?: string | null }[]) {
      const m = /^SO-(\d+)$/.exec(row.numero ?? '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return padNum(max + 1);
  }
}

