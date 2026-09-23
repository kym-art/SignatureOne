/**
 * Signature One - Orders Service (Module 4)
 * Handles Order Creation, Sequential Numbering, Status Tracking & Persistence
 */

import { Order, OrderItem, CreateOrderInput, SmsLog, SmsStatus, StatutCommande, StatutPaiement, ModePaiement, TypeCommande } from '../types';
import { getProductById } from './products';
import { apiFetch, ApiError, getApiToken } from './api';

// ─── Cache en mémoire (remplace localStorage) ──────────────────────────
// Source de vérité : la DB via le backend (GET /orders pour les staff,
// GET /orders/track/:numero pour le suivi public). Aucun localStorage n'est
// plus utilisé pour stocker les commandes → plus de désynchronisation
// inter-onglets et plus de page admin blanche sur cache corrompu.
let ORDERS_CACHE: Order[] = [];
let MY_ORDER_NUMEROS: string[] = [];
let ORDER_COUNTER = 0;

/**
 * Normalise une commande brute (ligne Supabase / réponse backend / cache
 * localStorage) en un objet `Order` sûr pour l'UI :
 *  - `items` TOUJOURS un tableau. La table `Order` n'a PAS de colonne items :
 *    les lignes hydratées depuis Supabase anon (ou un vieux cache localStorage)
 *    n'en ont pas, et `o.items.map(...)` levait alors un TypeError →
 *    PAGE ADMIN BLANCHE. On accepte aussi les items sérialisés en string JSON.
 *  - `total` toujours un nombre (colonne numeric / null-safe).
 *  - `createdAt` toujours une chaîne ISO.
 */
export function normalizeOrder(raw: unknown): Order {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Order> & Record<string, unknown>;
  // `items` lu via unknown : le typage nominal de Order (OrderItem[]) réduirait
  // sinon le reste à `never` après le test Array.isArray.
  const rawItems: unknown = o.items;
  let items: OrderItem[] = [];
  if (Array.isArray(rawItems)) {
    items = rawItems as OrderItem[];
  } else if (typeof rawItems === 'string' && rawItems.trim()) {
    try {
      const parsed: unknown = JSON.parse(rawItems);
      if (Array.isArray(parsed)) items = parsed as OrderItem[];
    } catch {
      items = [];
    }
  }
  const totalNum = Number(o.total);
  return {
    ...(o as unknown as Order),
    items,
    total: Number.isFinite(totalNum) ? totalNum : 0,
    createdAt:
      typeof o.createdAt === 'string' && o.createdAt
        ? o.createdAt
        : new Date().toISOString(),
  };
}

/** Normalise une liste de commandes (les non-tableaux sont ignorés). */
function normalizeOrders(list: unknown): Order[] {
  return (Array.isArray(list) ? list : []).map(normalizeOrder);
}

// Order Reactivity Subscription
type OrderChangeListener = (orders: Order[]) => void;
const listeners: Set<OrderChangeListener> = new Set();

export function subscribeOrders(listener: OrderChangeListener): () => void {
  listeners.add(listener);
  // Envoie l'état courant immédiatement : un composant monté après une
  // hydrate voit les données sans attendre le prochain poke/polling.
  try {
    listener(getAllOrders());
  } catch {
    // Un listener ne doit jamais casser le store.
  }
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(): void {
  const current = getAllOrders();
  listeners.forEach((fn) => fn(current));
}

// Compteur séquentiel SO-xxxx en mémoire (le numéro définitif provient du
// backend dès que la commande est réellement créée en DB).
function getNextOrderNumber(): string {
  if (typeof window === 'undefined') return `SO-000${Date.now().toString().slice(-4)}`;
  ORDER_COUNTER += 1;
  const padded = String(ORDER_COUNTER).padStart(4, '0');
  return `SO-${padded}`;
}

// Retourne les commandes depuis le cache en mémoire (source: backend).
export function getAllOrders(): Order[] {
  return ORDERS_CACHE;
}

// Remplace le cache en mémoire (jamais localStorage) et notifie les abonnés.
function saveOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  ORDERS_CACHE = (orders || []).slice();
  notifySubscribers();
}

/**
 * Fusion vendeur : le serveur est la vérité quand il fournit `vendeur` ou
 * `vendeurId`. Si la réponse serveur ne contient NI l'un NI l'autre
 * (partielle / vieux payload), on conserve le `vendeur` déjà en cache pour
 * ne pas faire retomber la pastille à "Non assigné" à tort.
 */
function mergeVendorInfo(cached: Order[], fresh: Order[]): Order[] {
  if (cached.length === 0) return fresh;
  const byId = new Map(cached.map((o) => [o.id, o]));
  return fresh.map((o) => {
    const prev = byId.get(o.id);
    if (!prev) return o;
    const serverSpeaks = o.vendeur !== undefined || o.vendeurId !== undefined;
    if (serverSpeaks) return o;
    return { ...o, vendeur: prev.vendeur, vendeurId: prev.vendeurId };
  });
}

/** Met à jour (ou ajoute) une commande dans le cache en mémoire. */
function upsertOrder(order: Order): void {
  const orders = getAllOrders();
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.unshift(order);
  saveOrders(orders);
}

// Get order by ID
export function getOrderById(id: string): Order | undefined {
  const orders = getAllOrders();
  return orders.find((o) => o.id === id);
}

// Get order by human readable Numero (e.g. "SO-0001" or "so-0001")
export function getOrderByNumero(numero: string): Order | undefined {
  if (!numero) return undefined;
  const clean = numero.trim().toUpperCase();
  const orders = getAllOrders();
  return orders.find((o) => o.numero.toUpperCase() === clean);
}

// ---------------------------------------------------------------------------
// "Mes commandes" — numéros suivis par la session courante en mémoire.
// Le localStorage est supprimé : la source de vérité est la DB. Un client
// anonyme suit ses commandes par numéro via fetchOrderByNumero (GET public),
// un staff via hydrateOrdersFromBackend (GET /orders, JWT).
// ---------------------------------------------------------------------------
export function getMyOrderNumeros(): string[] {
  if (typeof window === 'undefined') return [];
  return [...MY_ORDER_NUMEROS];
}

export function recordMyOrder(numero: string): void {
  if (typeof window === 'undefined') return;
  if (!MY_ORDER_NUMEROS.includes(numero)) {
    MY_ORDER_NUMEROS.push(numero);
  }
}

/**
 * Récupère une commande publique par son numéro : cache d'abord, sinon
 * GET /api/orders/track/:numero (anonyme autorisé avec le numéro).
 */
export async function fetchOrderByNumero(numero: string): Promise<Order | undefined> {
  const clean = (numero || '').trim().toUpperCase();
  if (!clean) return undefined;
  const cached = getOrderByNumero(clean);
  if (cached) return cached;
  return refreshOrderByNumero(clean);
}

/**
 * Re-fetch FORCÉ d'une commande par son numéro depuis le serveur
 * (GET /api/orders/track/:numero), même si le cache en a déjà une copie.
 * Utilisé par le polling du suivi client : sans force, le client garderait
 * indéfiniment le vieux statut lu au premier chargement.
 */
export async function refreshOrderByNumero(numero: string): Promise<Order | undefined> {
  const clean = (numero || '').trim().toUpperCase();
  if (!clean) return undefined;
  try {
    const order = await apiFetch<Order>(`/orders/track/${encodeURIComponent(clean)}`);
    const normalized = normalizeOrder(order);
    upsertOrder(normalized);
    recordMyOrder(normalized.numero);
    return normalized;
  } catch (e) {
    console.warn('[orders] refreshOrderByNumero:', e instanceof ApiError ? e.message : e);
    return getOrderByNumero(clean);
  }
}

// Retourne vrai si la session courante a déjà suivi cette commande.
export function isMyOrder(numero: string): boolean {
  const clean = numero.trim().toUpperCase();
  return getMyOrderNumeros().some((n) => n.toUpperCase() === clean);
}

/**
 * Determine initial payment status based on chosen payment mode (Module 4 spec)
 * - Flooz / TMoney -> EN_ATTENTE
 * - Livraison (Paiement à la livraison) -> PAIEMENT_LIVRAISON
 * - Sur place / Retrait (Paiement sur place) -> PAIEMENT_SUR_PLACE
 */
export function getInitialPaymentStatus(modePaiement: ModePaiement): StatutPaiement {
  switch (modePaiement) {
    case 'FLOOZ':
    case 'TMONEY':
      return 'EN_ATTENTE';
    case 'LIVRAISON':
      return 'PAIEMENT_LIVRAISON';
    case 'SUR_PLACE':
      return 'PAIEMENT_SUR_PLACE';
    default:
      return 'EN_ATTENTE';
  }
}

/**
 * Create a new Order (Module 4 main function)
 */
export async function createOrder(input: CreateOrderInput): Promise<{ success: boolean; order?: Order; error?: string }> {
  // 1. Validation
  const nomClean = input.clientNom?.trim() || '';
  const prenomClean = input.clientPrenom?.trim() || '';
  const fullName = prenomClean ? `${prenomClean} ${nomClean}`.trim() : nomClean;
  const telClean = input.clientTel?.trim() || '';

  if (!fullName) {
    return { success: false, error: 'Le nom du client est requis.' };
  }
  if (!telClean) {
    return { success: false, error: 'Le numéro de téléphone est obligatoire pour le suivi de la commande.' };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'Le panier est vide. Veuillez sélectionner au moins un produit.' };
  }

  // Address validation for delivery
  let fullAddress: string | null = null;
  if (input.typeCommande === 'LIVRAISON') {
    const quartier = input.quartier?.trim() || '';
    const adresse = input.adresseLivraison?.trim() || '';
    const indications = input.indications?.trim() || '';

    if (!quartier && !adresse) {
      return { success: false, error: 'Veuillez préciser votre quartier ou adresse pour la livraison.' };
    }

    const parts = [];
    if (quartier) parts.push(`Quartier: ${quartier}`);
    if (adresse) parts.push(`Adresse/Repère: ${adresse}`);
    if (indications) parts.push(`Indications: ${indications}`);
    fullAddress = parts.join(' • ');
  }

  // Table validation for Sur place
  if (input.typeCommande === 'SUR_PLACE' && !input.tableId) {
    // If not provided, default or ask
    input.tableId = 'Table';
  }

  // Calculate items and total
  let total = 0;
  const orderItems: OrderItem[] = input.items.map((item, index) => {
    const product = getProductById(item.productId);
    const unitPrice = item.prixUnitaire || (product ? product.prix : 0);
    const subtotal = unitPrice * item.quantite;
    total += subtotal;

    return {
      id: `item_${Date.now()}_${index}`,
      orderId: '',
      productId: item.productId,
      product: product || undefined,
      quantite: item.quantite,
      prixUnitaire: unitPrice,
    };
  });

  // 3. Création via le BACKEND (source de vérité unique). Plus AUCUNE écriture
  // Supabase directe depuis le navigateur : le numéro (SO-xxxx), le total et le
  // statut de paiement sont recalculés/décidés côté serveur.
  let serverOrder: Order;
  try {
    serverOrder = await apiFetch<Order>('/orders', {
      method: 'POST',
      body: {
        clientNom: fullName,
        clientTel: telClean,
        typeCommande: input.typeCommande,
        tableId: input.typeCommande === 'SUR_PLACE' ? input.tableId : null,
        adresseLivraison: fullAddress,
        modePaiement: input.modePaiement,
        items: input.items.map((it) => ({
          productId: it.productId,
          quantite: it.quantite,
          prixUnitaire: it.prixUnitaire || (getProductById(it.productId)?.prix ?? 0),
        })),
      },
    });
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la création de la commande.';
    return { success: false, error: message };
  }

  // 4. Cache local : construit à partir de la RÉPONSE du backend (jamais d'une
  // écriture Supabase séparée). Les items enrichis côté client (objets produit)
  // sont rattachés à l'id de commande serveur pour l'affichage et le reçu.
  const newOrder: Order = {
    ...serverOrder,
    vendeurId: serverOrder.vendeurId ?? null,
    items: orderItems.map((it) => ({ ...it, orderId: serverOrder.id })),
  };

  const orders = getAllOrders();
  const existingIdx = orders.findIndex((o) => o.id === newOrder.id);
  if (existingIdx >= 0) {
    orders[existingIdx] = newOrder;
  } else {
    orders.unshift(newOrder);
  }
  saveOrders(orders);

  // Allow the customer who placed the order (on this device) to follow it later.
  recordMyOrder(newOrder.numero);

  // Dispatch browser custom event for Realtime Toast & Sound Notification (Module 7)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('signature_one:new_order', {
          detail: newOrder,
        })
      );
    } catch {
      // ignore
    }
  }

  return { success: true, order: newOrder };
}

/**
 * Update order status (used by seller, admin, or tracking simulation)
 */
export async function updateOrderStatus(orderId: string, newStatus: StatutCommande): Promise<{ success: boolean; order?: Order; error?: string }> {
  const orders = getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { success: false, error: 'Commande introuvable.' };
  }

  // Source de vérité : le backend (JWT + service_role). Aucune écriture
  // Supabase directe depuis le navigateur (RLS anon la bloque désormais).
  try {
    const updated = await apiFetch<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { statut: newStatus },
    });
    orders[index] = { ...orders[index], ...updated };
    saveOrders(orders);
    return { success: true, order: orders[index] };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la mise à jour du statut.';
    return { success: false, error: message };
  }
}

/**
 * Revert d'un paiement validé (PAYE → EN_ATTENTE) : persisté via le BACKEND
 * (PATCH /api/orders/:id/unpay, réservé ADMIN), puis cache local synchronisé.
 */
export async function unpayOrderPayment(orderId: string): Promise<{ success: boolean; order?: Order; error?: string }> {
  const orders = getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { success: false, error: 'Commande introuvable.' };
  }

  try {
    const updated = await apiFetch<Order>(`/orders/${orderId}/unpay`, { method: 'PATCH' });
    orders[index] = { ...orders[index], ...updated };
    saveOrders(orders);
    return { success: true, order: orders[index] };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de l’annulation du paiement.';
    return { success: false, error: message };
  }
}

/**
 * Module 7: Vendor Order Claiming ("Prendre en charge")
 * Uses first-come-first-served check. If already claimed by another vendor, returns error.
 */
export async function claimOrder(
  orderId: string,
  vendor: { id: string; nom: string; telephone?: string }
): Promise<{ success: boolean; order?: Order; error?: string }> {
  const orders = getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { success: false, error: 'Commande introuvable.' };
  }

  try {
    const updated = await apiFetch<Order>(`/orders/${orderId}/claim`, { method: 'POST' });
    // Le serveur retourne désormais `vendeur` (nom/tél) + `vendeurId` :
    // on écrase l'ancien pour que la pastille reflète la réalité, même si
    // la fusion locale conservait un vendeur périmé.
    orders[index] = { ...orders[index], ...updated };
    saveOrders(orders);
    return { success: true, order: orders[index] };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la prise en charge.';
    return { success: false, error: message };
  }
}

/**
 * Module 7: Vendor-restricted status advancement
 * Verifies that the order belongs to the connected vendor or user is admin
 */
export async function updateOrderStatusByVendor(
  orderId: string,
  newStatus: StatutCommande,
  vendorId: string,
  isAdmin = false
): Promise<{ success: boolean; order?: Order; error?: string }> {
  const orders = getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { success: false, error: 'Commande introuvable.' };
  }

  // La vérification de propriété (vendeur responsable ou admin) est faite
  // côté serveur (OrdersService.updateStatus) — non contournable côté client.
  try {
    const updated = await apiFetch<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { statut: newStatus, vendorId },
    });
    orders[index] = { ...orders[index], ...updated };
    saveOrders(orders);
    return { success: true, order: orders[index] };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la mise à jour du statut.';
    return { success: false, error: message };
  }
}

/**
 * Module 8: Admin Vendor Reassignment
 * Admin can reassign any order to another vendor or unassign it
 */
export async function reassignOrder(
  orderId: string,
  newVendor: { id: string; nom: string; telephone?: string } | null
): Promise<{ success: boolean; order?: Order; error?: string }> {
  const orders = getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { success: false, error: 'Commande introuvable.' };
  }

  // Persistance via le BACKEND (PATCH /api/orders/:id/assign, réservé ADMIN).
  // Le serveur vérifie que le vendeur cible existe et est actif.
  try {
    const updated = await apiFetch<Order>(`/orders/${orderId}/assign`, {
      method: 'PATCH',
      body: { vendeurId: newVendor?.id ?? null },
    });
    orders[index] = { ...orders[index], ...updated };
    // Le nom du vendeur n'est pas stocké en base (seul vendeurId l'est) :
    // on met à jour la représentation locale pour l'affichage.
    orders[index].vendeur = newVendor
      ? {
          id: newVendor.id,
          nom: newVendor.nom,
          telephone: newVendor.telephone || '',
          role: 'VENDEUR',
          actif: true,
          createdAt: orders[index].vendeur?.createdAt || new Date().toISOString(),
        }
      : null;
    saveOrders(orders);
    return { success: true, order: orders[index] };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la réassignation.';
    return { success: false, error: message };
  }
}

/**
 * Module 7: Direct Counter Sale ("Vente directe comptoir")
 * Immediately creates an Order with statut = 'TERMINEE', statutPaiement = 'PAYE', and assigned vendeurId
 */
export interface DirectSaleInput {
  vendorId: string;
  vendorName: string;
  clientNom?: string;
  clientTel?: string;
  typeCommande?: TypeCommande;
  tableId?: string | null;
  modePaiement: ModePaiement;
  items: {
    productId: string;
    quantite: number;
    prixUnitaire?: number;
  }[];
}

export async function createDirectSale(input: DirectSaleInput): Promise<{ success: boolean; order?: Order; error?: string }> {
  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'Veuillez ajouter au moins un produit pour enregistrer la vente.' };
  }

  // Persistance via le BACKEND (POST /api/orders/direct-sale) : la vente est
  // immédiatement TERMINEE + PAYE, assignée à l'utilisateur du JWT, et le
  // numéro de commande/ reçu est généré côté serveur (source de vérité).
  try {
    const created = await apiFetch<Order>('/orders/direct-sale', {
      method: 'POST',
      body: {
        clientNom: input.clientNom,
        clientTel: input.clientTel,
        typeCommande: input.typeCommande,
        tableId: input.tableId,
        modePaiement: input.modePaiement,
        items: input.items.map((it) => ({
          productId: it.productId,
          quantite: it.quantite,
          prixUnitaire: it.prixUnitaire,
        })),
      },
    });
    const orders = getAllOrders();
    orders.unshift(created);
    saveOrders(orders);
    dispatchReceiptEvent(created);
    return { success: true, order: created };
  } catch (e) {
    const message =
      e instanceof ApiError ? e.message : 'Erreur lors de l’enregistrement de la vente.';
    return { success: false, error: message };
  }
}

/** Événement navigateur pour l'ouverture automatique du reçu. */
function dispatchReceiptEvent(order: Order): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('signature_one:receipt_ready', {
          detail: {
            order,
            receiptNumber: order.recuNumero || `REC-${order.numero}`,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Get status badge label and colors for visual representation
 */
export function getStatusDetails(status: StatutCommande): { label: string; step: number; colorClass: string; badgeClass: string; desc: string } {
  switch (status) {
    case 'NOUVELLE':
      return {
        label: 'Nouvelle Commande',
        step: 1,
        colorClass: 'bg-blue-50 text-blue-900 border-blue-200',
        badgeClass: 'bg-blue-50 text-blue-900 border-blue-200',
        desc: 'Votre commande a été reçue et est en attente de prise en charge par notre équipe.',
      };
    case 'ACCEPTEE':
      return {
        label: 'Commande Acceptée',
        step: 2,
        colorClass: 'bg-amber-50 text-amber-900 border-amber-200',
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
        desc: 'Notre équipe a validé votre commande et vérifie les stocks disponibles.',
      };
    case 'EN_PREPARATION':
      return {
        label: 'En Préparation',
        step: 3,
        colorClass: 'bg-purple-50 text-purple-900 border-purple-200',
        badgeClass: 'bg-purple-50 text-purple-900 border-purple-200',
        desc: 'Nos artisans préparent vos gourmandises avec soin en cuisine.',
      };
    case 'PRETE':
      return {
        label: 'Prête',
        step: 4,
        colorClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        desc: 'Votre commande est prête ! Elle est en cours de livraison ou disponible au comptoir.',
      };
    case 'TERMINEE':
      return {
        label: 'Terminée / Livrée',
        step: 5,
        colorClass: 'bg-[#1F3D2E]/10 text-[#1F3D2E] border-[#1F3D2E]/30',
        badgeClass: 'bg-[#1F3D2E]/10 text-[#1F3D2E] border-[#1F3D2E]/30',
        desc: 'Commande livrée et finalisée. Merci pour votre confiance !',
      };
    default:
      return {
        label: status,
        step: 1,
        colorClass: 'bg-stone-100 text-stone-800 border-stone-200',
        badgeClass: 'bg-stone-100 text-stone-800 border-stone-200',
        desc: 'Commande enregistrée.',
      };
  }
}

/**
 * Helper to get payment status label and badge
 */
export function getPaymentStatusDetails(status: StatutPaiement): { label: string; badgeClass: string } {
  switch (status) {
    case 'PAYE':
      return { label: 'Payé', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    case 'EN_ATTENTE':
      return { label: 'En attente de paiement (Flooz/TMoney)', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' };
    case 'PAIEMENT_LIVRAISON':
      return { label: 'Paiement à la livraison', badgeClass: 'bg-sky-100 text-sky-900 border-sky-300' };
    case 'PAIEMENT_SUR_PLACE':
      return { label: 'Paiement sur place / comptoir', badgeClass: 'bg-stone-100 text-stone-900 border-stone-300' };
    default:
      return { label: status, badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' };
  }
}

/**
 * Helper to get reception mode label
 */
export function getReceptionModeDetails(type: TypeCommande): { label: string; icon: string } {
  switch (type) {
    case 'LIVRAISON':
      return { label: 'Livraison à domicile', icon: '🛵' };
    case 'RETRAIT':
      return { label: 'Retrait en boutique', icon: '🛍️' };
    case 'SUR_PLACE':
      return { label: 'Sur place (Salon)', icon: '🍽️' };
    default:
      return { label: type, icon: '📦' };
  }
}

// ============================================================================
// Mobile Money SMS Logs & Automatic Payment Reconciliation (POC)
// ============================================================================

// Cache mémoire (source de vérité = backend + table SmsLog). AUCUN localStorage.
let smsLogsCache: SmsLog[] | null = null;

type SmsLogListener = (logs: SmsLog[]) => void;
const smsLogListeners = new Set<SmsLogListener>();

export function subscribeSmsLogs(listener: SmsLogListener): () => void {
  smsLogListeners.add(listener);
  // Envoie l'état courant immédiatement : un composant monté après une
  // hydrate (ex. AdminSmsLogsManagement ouvert après login) affiche
  // les données au lieu d'attendre le prochain cycle de sync.
  try {
    listener(getAllSmsLogs());
  } catch {
    // Un listener ne doit jamais casser le store.
  }
  return () => smsLogListeners.delete(listener);
}

function notifySmsLogListeners(): void {
  const current = getAllSmsLogs();
  smsLogListeners.forEach((fn) => fn(current));
}

/**
 * Persist an incoming SMS into the local SMS log store (cache mémoire).
 * Source de vérité = backend (table SmsLog via service_role). Ce cache sert
 * de fallback offline (dev) et d'hydrate pour l'admin.
 */
export function saveSmsLog(log: Omit<SmsLog, 'id'>): SmsLog {
  const logs = getAllSmsLogs();
  const entry: SmsLog = {
    ...log,
    id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: log.status || 'PENDING',
    createdAt: new Date().toISOString(),
  };
  logs.unshift(entry);
  setCacheSmsLogs(logs);
  return entry;
}

/**
 * Set the in-memory SMS logs cache (source de vérité = backend). AUCUN localStorage.
 */
function setCacheSmsLogs(logs: SmsLog[]): void {
  smsLogsCache = logs;
  notifySmsLogListeners();
}

/**
 * Get all SMS logs (cache mémoire). Staff authentifié : hydrate depuis le
 * backend (GET /api/sms-logs). Sinon fallback offline vide. Safe dans Node
 * (webhook) et browser.
 */
export function getAllSmsLogs(): SmsLog[] {
  return smsLogsCache ?? [];
}

/**
 * Hydrate le cache des SMS-logs depuis le backend (staff authentifié).
 * Le webhook serveur persiste déjà en DB (SmsLog) ; cette hydrate sert
 * l'historique affiçé dans l'admin depuis la DB.
 */
export async function hydrateSmsLogsFromBackend(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!getApiToken()) return; // staff uniquement
  try {
    const logs = await apiFetch<SmsLog[]>('/sms-logs');
    if (Array.isArray(logs)) setCacheSmsLogs(logs);
  } catch (e) {
    console.warn('[orders] hydrateSmsLogsFromBackend:', e instanceof ApiError ? e.message : e);
  }
}

/**
 * Validate an incoming SMS against a pending order and mark the payment
 * as confirmed when there is exactly one unambiguous match.
 *
 * Returns 'matched' | 'ambiguous' | 'no_match'.
 */
export function reconcilePaymentFromSms(
  smsLogId: string,
  amount: number
): 'matched' | 'ambiguous' | 'no_match' {
  const orders = getAllOrders();
  const candidates = orders.filter(
    (o) => o.total === amount && o.statutPaiement === 'EN_ATTENTE'
  );

  if (candidates.length !== 1) {
    const outcome = candidates.length > 1 ? 'ambiguous' : 'no_match';
    markSmsLogStatus(smsLogId, 'UNMATCHED');
    return outcome;
  }

  const order = candidates[0];
  // La validation passe par le backend (source de vérité).
  void confirmPayment(order.id).then((res) => {
    if (!res.success) {
      console.error('[orders] Rapprochement SMS : échec de validation via backend :', res.error);
    }
  });
  order.statut = order.statut === 'NOUVELLE' ? 'ACCEPTEE' : order.statut;
  saveOrders(orders);
  markSmsLogStatus(smsLogId, 'MATCHED');

  return 'matched';
}

function markSmsLogStatus(smsLogId: string, status: SmsStatus): void {
  if (!smsLogId) return;
  const logs = getAllSmsLogs();
  const target = logs.find((l) => l.id === smsLogId);
  if (!target) return;
    target.status = status;
  setCacheSmsLogs(logs);
}

/**
 * Manually confirm a payment for an order (fallback button in admin).
 */
export async function confirmPayment(orderId: string): Promise<{ success: boolean; order?: Order; error?: string }> {
  const orders = getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { success: false, error: 'Commande introuvable.' };
  }

  // Validation de paiement : backend uniquement (service_role, rôle vérifié).
  try {
    const updated = await apiFetch<Order>(`/orders/${orderId}/pay`, { method: 'PATCH' });
    orders[index] = { ...orders[index], ...updated };
    saveOrders(orders);
    return { success: true, order: orders[index] };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la validation du paiement.';
    return { success: false, error: message };
  }
}

// Les fonctions serveur de rapprochement (fetchOrdersServerSide,
// saveSmsLogServerSide, settleOrderPaymentServerSide, updateSmsLogStatusServerSide)
// ont été déplacées vers src/lib/supabase-server.ts, qui utilise la clé
// service_role (accès serveur de confiance, contourne RLS). Ce fichier (orders.ts)
// est importé par le navigateur : il n'y a PAS de client service_role ici, pour
// éviter de fuiter la clé privilégiée dans le bundle frontend.

/**
 * Hydrate le cache localStorage depuis le BACKEND (GET /api/orders) pour un
 * utilisateur authentifié (admin/vendeur) — accès complet aux colonnes
 * sensibles, contrairement à la lecture anon Supabase.
 *
 * Le backend retourne `vendeur` (nom/téléphone) ET `vendeurId`. On ne doit
 * JAMAIS écraser un `vendeur` connu par `undefined` (ex. réponse partielle
 * ou vieux cache) : la pastille retomberait à "Non assigné" à tort.
 * Règle : le serveur gagne quand il parle, le cache garde sinon.
 */
export async function hydrateOrdersFromBackend(): Promise<void> {
  if (typeof window === 'undefined') return;
  // GET /orders exige le JWT (admin/vendeur). Un anonyme n'a pas de vue
  // globale : il suit ses commandes par numéro (fetchOrderByNumero),
  // depuis la DB via GET /api/orders/track/:numero.
  if (!getApiToken()) return;
  try {
    const serverOrders = await apiFetch<Order[]>('/orders');
    const normalized = normalizeOrders(serverOrders || []);
    ORDERS_CACHE = mergeVendorInfo(ORDERS_CACHE, normalized);
    notifySubscribers();
  } catch (e) {
    console.warn('[orders] hydrateOrdersFromBackend:', e instanceof ApiError ? e.message : e);
  }
}

/**
 * DÉPRÉCIE : la lecture directe Supabase (clé anon) côté navigateur a été
 * abandonnée — le front passe par le backend (JWT service_role serveur) pour
 * éviter de servir toutes les commandes aux clients anonymes. On délègue la
 * charge utile à hydrateOrdersFromBackend (JWT requis pour les staff).
 *
 * NOTE : historiquement ce chemin de lecture s'exécutait côté navigateur via
 * le client anon Supabase (soumis aux policies RLS). Il n'est plus utilisé :
 * le cache en mémoire est désormais alimenté par GET /api/orders (staff) ou
 * GET /api/orders/track/:numero (suivi public).
 */
export async function hydrateOrdersFromSupabase(): Promise<void> {
  await hydrateOrdersFromBackend();
}
