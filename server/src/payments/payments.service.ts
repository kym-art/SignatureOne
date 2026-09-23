import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SupabaseService } from '../common/supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';
import { CinetPayWebhookDto, InitiatePaymentDto, ReconcilePaymentDto } from './payments.dto';
import { config } from '../config/configuration';
import { Payment } from '../types';

/** Résultat normalisé d'un webhook passerelle. */
export interface WebhookResult {
  success: boolean;
  idempotent: boolean;
  status: 'PAYE' | 'REFUSE' | 'EN_ATTENTE';
  orderId?: string;
  paymentId?: string;
  message: string;
}

/**
 * Payments — source de vérité = table Supabase `Payment`.
 *
 * Le traitement du webhook passerelle est serveur (service_role), avec :
 *   - vérification de signature HMAC quand le secret CinetPay est configuré
 *     (fail-closed en production : sans secret réel, un webhook est refusé) ;
 *   - contrôle du montant encaissé vs `Order.total` ;
 *   - idempotence par `Payment.orderId` (UNIQUE en base) + statut PAYE ;
 *   - mise à jour de la commande via l'UNIQUE chemin de validation existant
 *     (`OrdersService.confirmPayment`), qui minte aussi le numéro de reçu.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly orders: OrdersService,
  ) {}

  /** Admin/Vendeur : historique complet des transactions passerelle. */
  async findAll(): Promise<Payment[]> {
    const { data, error } = await this.supabase.admin
      .from('Payment')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as Payment[];
  }

  /** Transaction associée à une commande (au plus une : orderId est UNIQUE). */
  async findByOrderId(orderId: string): Promise<Payment | null> {
    const { data, error } = await this.supabase.admin
      .from('Payment')
      .select('*')
      .eq('orderId', orderId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return (data as Payment) ?? null;
  }

  /**
   * Initiation : enregistre (ou rafraîchit) la transaction EN_ATTENTE de la
   * commande. Idempotent — une commande déjà payée renvoie sa transaction
   * existante sans en créer de nouvelle.
   */
  async initiate(dto: InitiatePaymentDto): Promise<Payment> {
    const { data: order, error: orderErr } = await this.supabase.admin
      .from('Order')
      .select('id, numero, statutPaiement')
      .eq('id', dto.orderId)
      .maybeSingle();
    if (orderErr) throw new BadRequestException(orderErr.message);
    if (!order) throw new NotFoundException('Commande introuvable.');

    const existing = await this.findByOrderId(dto.orderId);
    if (existing) {
      // Déjà payée : ne jamais rétrograder ni recréer (idempotence).
      if (existing.statut === 'PAYE') return existing;
      const { data, error } = await this.supabase.admin
        .from('Payment')
        .update({ reference: dto.reference, provider: dto.provider ?? 'cinetpay' })
        .eq('orderId', dto.orderId)
        .select('*')
        .single();
      if (error && error.code !== 'PGRST116') throw new BadRequestException(error.message);
      return (data as Payment) ?? existing;
    }

    const { data, error } = await this.supabase.admin
      .from('Payment')
      .insert({
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orderId: dto.orderId,
        provider: dto.provider ?? 'cinetpay',
        reference: dto.reference,
        statut: 'EN_ATTENTE',
      })
      .select('*')
      .single();
    if (error) {
      // Course concurrente : une autre initiation a déjà créé la ligne.
      if (error.code === '23505') {
        const raced = await this.findByOrderId(dto.orderId);
        if (raced) return raced;
      }
      throw new BadRequestException(error.message);
    }
    return data as Payment;
  }

  /**
   * Webhook passerelle (public, fail-closed) :
   *  - refuse tout payload non signé quand le secret est configuré ;
   *  - en sandbox SANS secret configuré, accepte (dév uniquement) ;
   *  - en production SANS secret configuré, refuse (pas d'encaissement aveugle).
   */
  async handleWebhook(dto: CinetPayWebhookDto): Promise<WebhookResult> {
    const reference = dto.cpm_trans_id?.trim();
    if (!reference) throw new BadRequestException('Référence de transaction manquante.');

    const signatureOk = this.verifySignature(dto);
    if (!signatureOk) {
      // Sandbox + aucun secret configuré = environnement de dev : on accepte.
      const devOpen = config.cinetpaySandbox && !config.cinetpaySecretKey;
      if (!devOpen) {
        throw new ConflictException(
          'Signature du webhook invalide ou absente — transaction refusée.',
        );
      }
      this.logger.warn(
        '[payments] webhook accepté SANS signature (sandbox dev, aucun secret configuré).',
      );
    }

    // Retrouve la commande via cpm_custom (orderId) puis via la référence.
    const custom = dto.cpm_custom?.trim();
    let orderId: string | undefined;
    if (custom) {
      const byId = await this.supabase.admin
        .from('Order')
        .select('id')
        .eq('id', custom)
        .maybeSingle();
      if (!byId.error && byId.data) orderId = (byId.data as { id: string }).id;
      if (!orderId) {
        const byNum = await this.supabase.admin
          .from('Order')
          .select('id')
          .eq('numero', custom)
          .maybeSingle();
        if (!byNum.error && byNum.data) orderId = (byNum.data as { id: string }).id;
      }
    }
    if (!orderId) {
      const pay = await this.supabase.admin
        .from('Payment')
        .select('orderId')
        .eq('reference', reference)
        .maybeSingle();
      if (!pay.error && pay.data) orderId = (pay.data as { orderId: string }).orderId;
    }
    if (!orderId) throw new NotFoundException('Commande introuvable pour cette transaction.');

    const order = await this.orders.findOne(orderId);

    // Idempotence : commande déjà PAYE → succès sans réécrire.
    if (order.statutPaiement === 'PAYE') {
      const existing = await this.findByOrderId(orderId);
      return {
        success: true,
        idempotent: true,
        status: 'PAYE',
        orderId,
        paymentId: existing?.id,
        message: 'Paiement déjà confirmé (idempotent).',
      };
    }

    const accepted = dto.cpm_result === '00' || dto.cpm_trans_status === 'ACCEPTED';
    if (!accepted) {
      await this.markPayment(orderId, reference, 'REFUSE');
      return {
        success: false,
        idempotent: false,
        status: 'REFUSE',
        orderId,
        message: 'Paiement refusé par la passerelle.',
      };
    }

    // Contrôle du montant encaissé vs total de la commande.
    const amount = Number(dto.cpm_amount);
    if (Number.isFinite(amount) && amount > 0 && Math.round(amount) < order.total) {
      await this.markPayment(orderId, reference, 'REFUSE');
      throw new ConflictException(
        `Montant encaissé (${amount}) inférieur au total de la commande (${order.total}).`,
      );
    }

    const payment = await this.markPayment(orderId, reference, 'PAYE');
    const updated = await this.orders.confirmPayment(orderId);
    this.logger.log(`✅ [payments] webhook ${reference} → commande ${updated.numero} PAYE.`);
    return {
      success: true,
      idempotent: false,
      status: 'PAYE',
      orderId,
      paymentId: payment?.id,
      message: 'Paiement confirmé, commande marquée PAYE.',
    };
  }

  /**
   * Rapprochement manuel (admin) : confirme l'encaissement constaté
   * (relevé Mobile Money) puis valide la commande via le chemin unique.
   */
  async reconcile(orderId: string, dto: ReconcilePaymentDto): Promise<Payment> {
    await this.orders.findOne(orderId); // 404 si inconnue
    const existing = await this.findByOrderId(orderId);
    if (existing?.statut === 'PAYE') return existing;
    const payment = await this.markPayment(
      orderId,
      dto.reference ?? `manuel_${Date.now()}`,
      'PAYE',
    );
    await this.orders.confirmPayment(orderId);
    return payment;
  }

  /** Vérifie la signature HMAC du payload (si un secret est configuré). */
  private verifySignature(dto: CinetPayWebhookDto): boolean {
    const secret = config.cinetpaySecretKey;
    if (!secret) return false;
    const provided = dto.signature;
    if (!provided) return false;
    try {
      const raw = `${dto.cpm_site_id ?? ''}|${dto.cpm_trans_id ?? ''}|${dto.cpm_amount ?? ''}|${dto.cpm_trans_status ?? ''}`;
      const expected = createHmac('sha256', secret).update(raw).digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(provided);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /** Crée ou met à jour la trace de transaction d'une commande. */
  private async markPayment(
    orderId: string,
    reference: string,
    statut: 'PAYE' | 'REFUSE' | 'EN_ATTENTE',
  ): Promise<Payment> {
    const existing = await this.findByOrderId(orderId);
    if (existing) {
      const { data, error } = await this.supabase.admin
        .from('Payment')
        .update({ reference, statut })
        .eq('orderId', orderId)
        .select('*')
        .single();
      if (error) throw new BadRequestException(error.message);
      return data as Payment;
    }
    const { data, error } = await this.supabase.admin
      .from('Payment')
      .insert({
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orderId,
        provider: 'cinetpay',
        reference,
        statut,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data as Payment;
  }
}
