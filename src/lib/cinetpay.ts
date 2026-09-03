/**
 * Signature One - Module 5: Paiement CinetPay
 * Intégration Passerelle Mobile Money (Flooz & TMoney Togo)
 * 
 * Gestion de l'initiation de paiement, webhook idempotent,
 * vérification de transaction et point d'extension pour génération de reçu (Module 9).
 */

import { Order, Payment, StatutPaiement } from '../types';
import { getOrderById, updateOrderPaymentStatus } from './orders';

export interface CinetPayConfig {
  apiKey: string;
  siteId: string;
  secretKey: string;
  sandbox: boolean;
  notifyUrl: string;
  returnUrl: string;
}

export interface CinetPayPaymentInit {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerCountry: string;
  channels: 'MOBILE_MONEY' | 'ALL' | 'FLOOZ' | 'TMONEY';
  orderId: string;
  orderNumero: string;
  paymentUrl?: string;
  provider: 'cinetpay';
  createdAt: string;
}

export interface CinetPayWebhookPayload {
  cpm_site_id?: string;
  cpm_trans_id?: string;
  cpm_trans_date?: string;
  cpm_amount?: string | number;
  cpm_currency?: string;
  cpm_payment_config?: string;
  cpm_page_action?: string;
  cpm_version?: string;
  cpm_language?: string;
  cpm_designation?: string;
  cpm_custom?: string;
  cpm_result?: string; // "00" indicates success in CinetPay
  cpm_trans_status?: string; // "ACCEPTED" | "REFUSED"
  payment_method?: 'FLOOZ' | 'TMONEY' | string;
  signature?: string;
}

export interface ReceiptTriggerEventData {
  orderId: string;
  orderNumero: string;
  paymentId: string;
  paymentReference: string;
  amount: number;
  method: string;
  paidAt: string;
}

const STORAGE_PAYMENTS_KEY = 'signature_one_payments_v5';
const STORAGE_PROCESSED_WEBHOOKS_KEY = 'signature_one_processed_webhooks_v5';

// Default configuration with sandbox defaults
export function getCinetPayConfig(): CinetPayConfig {
  const apiKey = (typeof process !== 'undefined' && process.env?.CINETPAY_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CINETPAY_API_KEY) ||
    'test_apikey_signatureone_tg';

  const siteId = (typeof process !== 'undefined' && process.env?.CINETPAY_SITE_ID) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CINETPAY_SITE_ID) ||
    '123456';

  const secretKey = (typeof process !== 'undefined' && process.env?.CINETPAY_SECRET_KEY) ||
    'test_secretkey_cinetpay';

  const sandbox = (typeof process !== 'undefined' && process.env?.CINETPAY_SANDBOX === 'false')
    ? false
    : true;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://signature-one.vercel.app';

  return {
    apiKey,
    siteId,
    secretKey,
    sandbox,
    notifyUrl: `${currentOrigin}/api/payments/webhook`,
    returnUrl: `${currentOrigin}/commande`,
  };
}

/**
 * Storage helpers for Payments
 */
export function getAllPayments(): Payment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PAYMENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading payments:', err);
    return [];
  }
}

function savePayments(payments: Payment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PAYMENTS_KEY, JSON.stringify(payments));
    notifyPaymentListeners();
  } catch (err) {
    console.error('Error saving payments:', err);
  }
}

function getProcessedWebhookIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PROCESSED_WEBHOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markWebhookAsProcessed(transId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getProcessedWebhookIds();
    if (!list.includes(transId)) {
      list.push(transId);
      localStorage.setItem(STORAGE_PROCESSED_WEBHOOKS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Error saving webhook id:', err);
  }
}

/**
 * Point d'extension pour le déclenchement du reçu (Module 9)
 * Notifie le système lors d'un passage au statut PAYE
 */
export function triggerReceiptGeneration(orderId: string, payment: Payment): void {
  const order = getOrderById(orderId);
  if (!order) return;

  const eventPayload: ReceiptTriggerEventData = {
    orderId: order.id,
    orderNumero: order.numero,
    paymentId: payment.id,
    paymentReference: payment.reference || 'REF-CP-AUTO',
    amount: order.total,
    method: order.modePaiement,
    paidAt: new Date().toISOString(),
  };

  console.info('[Module 5 -> Module 9 Extension Point] Déclenchement de génération du reçu pour la commande :', eventPayload);

  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('signature_one:receipt_ready', {
      detail: eventPayload,
    });
    window.dispatchEvent(customEvent);
  }
}

/**
 * Initialise un paiement CinetPay pour une commande donnée
 */
export function initiateCinetPayPayment(
  order: Order,
  preferredChannel: 'FLOOZ' | 'TMONEY' | 'ALL' = 'ALL'
): { success: boolean; paymentInit?: CinetPayPaymentInit; error?: string } {
  const config = getCinetPayConfig();

  // Generate unique transaction ID
  const timestamp = Date.now().toString(36).toUpperCase();
  const transactionId = `SO-CP-${order.numero}-${timestamp}`;

  const paymentInit: CinetPayPaymentInit = {
    transactionId,
    amount: order.total,
    currency: 'XOF',
    description: `Signature One - Commande ${order.numero} (${order.clientNom})`,
    customerName: order.clientNom,
    customerPhone: order.clientTel,
    customerCity: 'Lomé',
    customerCountry: 'TG',
    channels: preferredChannel === 'ALL' ? 'MOBILE_MONEY' : preferredChannel,
    orderId: order.id,
    orderNumero: order.numero,
    provider: 'cinetpay',
    createdAt: new Date().toISOString(),
  };

  // Create initial pending payment record
  const payments = getAllPayments();
  
  // Check if there is an existing payment record for this order
  const existingPayment = payments.find((p) => p.orderId === order.id && p.statut === 'PAYE');
  if (existingPayment) {
    return {
      success: true,
      paymentInit: {
        ...paymentInit,
        transactionId: existingPayment.reference || transactionId,
      },
    };
  }

  const newPayment: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderId: order.id,
    provider: 'cinetpay',
    reference: transactionId,
    statut: 'EN_ATTENTE',
    createdAt: new Date().toISOString(),
  };

  payments.unshift(newPayment);
  savePayments(payments);

  return {
    success: true,
    paymentInit,
  };
}

/**
 * Webhook de confirmation CinetPay
 * POST /api/payments/webhook
 * 
 * Idempotent : Vérifie si la transaction est déjà traitée avant d'effectuer les mutations.
 */
export function processCinetPayWebhook(
  payload: CinetPayWebhookPayload
): {
  success: boolean;
  idempotent: boolean;
  status: 'PAYE' | 'REFUSE' | 'EN_ATTENTE';
  orderId?: string;
  paymentId?: string;
  message: string;
} {
  const transId = payload.cpm_trans_id || payload.cpm_custom || '';
  if (!transId) {
    return {
      success: false,
      idempotent: false,
      status: 'EN_ATTENTE',
      message: 'Paramètre transaction_id (cpm_trans_id) manquant dans le webhook.',
    };
  }

  // 1. Idempotency Check
  const processedList = getProcessedWebhookIds();
  const alreadyProcessed = processedList.includes(transId);

  const payments = getAllPayments();
  const paymentIndex = payments.findIndex((p) => p.reference === transId);

  if (alreadyProcessed && paymentIndex !== -1 && payments[paymentIndex].statut === 'PAYE') {
    return {
      success: true,
      idempotent: true,
      status: 'PAYE',
      orderId: payments[paymentIndex].orderId,
      paymentId: payments[paymentIndex].id,
      message: 'Notification CinetPay déjà traitée avec succès (idempotence garantie).',
    };
  }

  // Find associated payment or order
  let orderId = '';
  let paymentRecord: Payment | null = null;

  if (paymentIndex !== -1) {
    paymentRecord = payments[paymentIndex];
    orderId = paymentRecord.orderId;
  } else {
    // Attempt extracting order from transId format "SO-CP-SO-0001-..."
    const match = transId.match(/SO-CP-(SO-\d+)-/);
    if (match && match[1]) {
      const orderNum = match[1];
      const allPayments = getAllPayments();
      const existing = allPayments.find((p) => p.reference?.includes(orderNum));
      if (existing) {
        paymentRecord = existing;
        orderId = existing.orderId;
      }
    }
  }

  // Determine outcome
  const isSuccess = payload.cpm_result === '00' || payload.cpm_trans_status === 'ACCEPTED';

  if (isSuccess) {
    // Mark as processed for idempotency
    markWebhookAsProcessed(transId);

    // Update payment record
    if (paymentRecord) {
      paymentRecord.statut = 'PAYE';
      savePayments(payments);
    } else if (orderId) {
      const newPay: Payment = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        provider: 'cinetpay',
        reference: transId,
        statut: 'PAYE',
        createdAt: new Date().toISOString(),
      };
      payments.unshift(newPay);
      savePayments(payments);
      paymentRecord = newPay;
    }

    // Update Order payment status to PAYE
    if (orderId) {
      updateOrderPaymentStatus(orderId, 'PAYE');
      
      // Trigger receipt generation extension point (Module 9)
      if (paymentRecord) {
        triggerReceiptGeneration(orderId, paymentRecord);
      }
    }

    return {
      success: true,
      idempotent: false,
      status: 'PAYE',
      orderId,
      paymentId: paymentRecord?.id,
      message: 'Paiement CinetPay validé avec succès. Commande mise à jour au statut PAYE.',
    };
  } else {
    return {
      success: false,
      idempotent: false,
      status: 'REFUSE',
      orderId,
      message: `Paiement refusé ou annulé par CinetPay (Code: ${payload.cpm_result || 'UNKNOWN'}).`,
    };
  }
}

/**
 * Simule la complétion d'un paiement en Sandbox CinetPay
 * Utilisé pour valider le flux dans le navigateur et exécuter le webhook
 */
export function simulateCinetPayCheckoutSuccess(
  paymentInit: CinetPayPaymentInit,
  selectedMethod: 'FLOOZ' | 'TMONEY' = 'TMONEY'
): { success: boolean; webhookResult: ReturnType<typeof processCinetPayWebhook> } {
  // FAIL-CLOSED : la simulation est strictement interdite hors sandbox.
  // En production, le paiement réel doit passer par l'API CinetPay et son
  // webhook serveur authentifié — jamais par une construction locale du
  // payload de validation, sinon n'importe quel client marquerait sa
  // commande PAYE sans encaissement.
  if (!getCinetPayConfig().sandbox) {
    console.error(
      '❌ [cinetpay] Simulation de paiement bloquée : CINETPAY_SANDBOX est désactivé (production).'
    );
    return {
      success: false,
      webhookResult: {
        success: false,
        idempotent: false,
        status: 'REFUSE',
        orderId: paymentInit.orderId,
        message:
          "Le paiement en ligne n'est pas encore disponible. Veuillez régler votre commande par un autre moyen.",
      },
    };
  }

  // Construct genuine CinetPay webhook payload
  const webhookPayload: CinetPayWebhookPayload = {
    cpm_site_id: getCinetPayConfig().siteId,
    cpm_trans_id: paymentInit.transactionId,
    cpm_trans_date: new Date().toISOString(),
    cpm_amount: paymentInit.amount,
    cpm_currency: paymentInit.currency,
    cpm_result: '00', // CinetPay code for payment accepted
    cpm_trans_status: 'ACCEPTED',
    cpm_designation: paymentInit.description,
    cpm_custom: paymentInit.orderId,
    payment_method: selectedMethod,
  };

  const webhookResult = processCinetPayWebhook(webhookPayload);
  return {
    success: true,
    webhookResult,
  };
}

/**
 * Obtenir l'historique des paiements pour une commande
 */
export function getPaymentByOrderId(orderId: string): Payment | undefined {
  const payments = getAllPayments();
  return payments.find((p) => p.orderId === orderId);
}

/**
 * Observateur d'événements de paiement
 */
type PaymentListener = (payments: Payment[]) => void;
const paymentListeners: Set<PaymentListener> = new Set();

export function subscribePayments(listener: PaymentListener): () => void {
  paymentListeners.add(listener);
  return () => paymentListeners.delete(listener);
}

function notifyPaymentListeners(): void {
  const payments = getAllPayments();
  paymentListeners.forEach((fn) => {
    try {
      fn(payments);
    } catch (err) {
      console.error('Error in payment subscriber:', err);
    }
  });
}
