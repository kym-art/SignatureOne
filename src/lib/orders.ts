/**
 * Signature One - Orders Service (Module 4)
 * Handles Order Creation, Sequential Numbering, Status Tracking & Persistence
 */

import { Order, OrderItem, CreateOrderInput, SmsLog, SmsStatus, StatutCommande, StatutPaiement, ModePaiement, TypeCommande } from '../types';
import { getProductById } from './products';
import { supabase, isSupabaseConfigured } from './supabase';
import { isMockDataEnabled } from './config';
import { apiFetch, ApiError } from './api';

const STORAGE_ORDERS_KEY = 'signature_one_orders_v4';
const STORAGE_COUNTER_KEY = 'signature_one_order_counter_v4';
const STORAGE_MY_ORDERS_KEY = 'signature_one_my_orders_v1';

// Initial sample orders for preview & demonstration
const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_sample_0001',
    numero: 'SO-0001',
    clientNom: 'Koffi Mensah',
    clientTel: '+22890123456',
    typeCommande: 'LIVRAISON',
    adresseLivraison: 'Tokoin Doumasséssé, près de la pharmacie du Point, Immeuble Blanc porte 2',
    statut: 'EN_PREPARATION',
    statutPaiement: 'EN_ATTENTE',
    modePaiement: 'TMONEY',
    total: 3000,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item_01',
        orderId: 'ord_sample_0001',
        productId: 'prod_degue_nature',
        quantite: 2,
        prixUnitaire: 1500,
      },
    ],
  },
  {
    id: 'ord_sample_0002',
    numero: 'SO-0002',
    clientNom: 'Abla Lawson',
    clientTel: '+22891987654',
    typeCommande: 'SUR_PLACE',
    tableId: 'tbl_03',
    statut: 'ACCEPTEE',
    statutPaiement: 'PAIEMENT_SUR_PLACE',
    modePaiement: 'SUR_PLACE',
    total: 4300,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item_02',
        orderId: 'ord_sample_0002',
        productId: 'prod_degue_vanille_coco',
        quantite: 1,
        prixUnitaire: 1800,
      },
      {
        id: 'item_03',
        orderId: 'ord_sample_0002',
        productId: 'prod_yaourt_pur_lait',
        quantite: 1,
        prixUnitaire: 2500,
      },
    ],
  },
  {
    id: 'ord_sample_0003',
    numero: 'SO-0003',
    clientNom: 'Foly Edoh',
    clientTel: '+22892334455',
    typeCommande: 'RETRAIT',
    statut: 'NOUVELLE',
    statutPaiement: 'PAIEMENT_SUR_PLACE',
    modePaiement: 'SUR_PLACE',
    total: 2200,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item_04',
        orderId: 'ord_sample_0003',
        productId: 'prod_bissap_menthe',
        quantite: 1,
        prixUnitaire: 1000,
      },
      {
        id: 'item_05',
        orderId: 'ord_sample_0003',
        productId: 'prod_gingembre_ananas',
        quantite: 1,
        prixUnitaire: 1200,
      },
    ],
  },
];

// Order Reactivity Subscription
type OrderChangeListener = (orders: Order[]) => void;
const listeners: Set<OrderChangeListener> = new Set();

export function subscribeOrders(listener: OrderChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(): void {
  const current = getAllOrders();
  listeners.forEach((fn) => fn(current));
}

// Generate Next Sequential Human-Readable Order Number (e.g. SO-0004)
function getNextOrderNumber(): string {
  if (typeof window === 'undefined') return `SO-000${Date.now().toString().slice(-4)}`;
  try {
    const raw = localStorage.getItem(STORAGE_COUNTER_KEY);
    // Ne démarrer le compteur qu'aux échantillons de démo consommés en dev (3),
    // sinon partir de 0 en production (aucune commande mockée).
    const minCounter = isMockDataEnabled ? 3 : 0;
    let counter = raw ? parseInt(raw, 10) : minCounter;
    if (isNaN(counter) || counter < minCounter) {
      counter = minCounter;
    }
    counter += 1;
    localStorage.setItem(STORAGE_COUNTER_KEY, counter.toString());
    const padded = String(counter).padStart(4, '0');
    return `SO-${padded}`;
  } catch {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SO-${random}`;
  }
}

// Load all orders
export function getAllOrders(): Order[] {
  if (typeof window === 'undefined') return isMockDataEnabled ? INITIAL_ORDERS : [];
  try {
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!raw) {
      if (isMockDataEnabled) {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      }
      return isMockDataEnabled ? INITIAL_ORDERS : [];
    }
    const parsed: Order[] = JSON.parse(raw);
    return parsed;
  } catch {
    return isMockDataEnabled ? INITIAL_ORDERS : [];
  }
}

// Save orders to store
function saveOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    notifySubscribers();
  } catch (err) {
    console.error('Failed to save orders:', err);
  }
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
// "Mes commandes" — restreindre le suivi client à ses propres commandes.
// Les commandes passées depuis cet appareil (boutique/table) sont enregistrées
// ici afin qu'un client puisse uniquement suivre les siennes. Les vendeurs et
// administrateurs (connectés) voient, eux, toutes les commandes.
// ---------------------------------------------------------------------------
export function getMyOrderNumeros(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_MY_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordMyOrder(numero: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getMyOrderNumeros();
    if (!list.includes(numero)) {
      list.push(numero);
      localStorage.setItem(STORAGE_MY_ORDERS_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

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
 * Update order payment status
 */
export function updateOrderPaymentStatus(orderId: string, newStatus: StatutPaiement): { success: boolean; order?: Order; error?: string } {
  const orders = getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { success: false, error: 'Commande introuvable.' };
  }

  orders[index].statutPaiement = newStatus;

  // Module 9: Auto-generate receipt when transitioning to PAYE
  if (newStatus === 'PAYE') {
    if (!orders[index].recuNumero) {
      const suffix = orders[index].numero.startsWith('SO-')
        ? orders[index].numero.replace('SO-', '')
        : Date.now().toString().slice(-4);
      orders[index].recuNumero = `REC-${suffix}`;
      orders[index].recuUrl = `/recu/${orders[index].numero}`;
      orders[index].datePaiement = new Date().toISOString();
    }
  }

  saveOrders(orders);

  // La persistance durable d'un paiement se fait désormais via le backend
  // (PATCH /api/orders/:id/pay, confirmPayment). Ici on ne met à jour que le
  // cache local ; l'écriture Supabase directe depuis le navigateur est
  // supprimée (bloquée par RLS et interdite par la nouvelle architecture).
  console.warn(
    `[orders] updateOrderPaymentStatus(${orderId}, ${newStatus}) : cache local uniquement — la persistance passe par le backend.`
  );

  // Trigger global browser event for receipts
  if (newStatus === 'PAYE' && typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('signature_one:receipt_ready', {
          detail: {
            order: orders[index],
            receiptNumber: orders[index].recuNumero,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch {
      // ignore
    }
  }

  return { success: true, order: orders[index] };
}

export const updateOrderPayment = updateOrderPaymentStatus;

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
  if (!isMockDataEnabled) {
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

  return createDirectSaleMock(input);
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

/** Variante mock locale — utilisée UNIQUEMENT quand USE_MOCK_DATA=true (dév). */
function createDirectSaleMock(input: DirectSaleInput): { success: boolean; order?: Order; error?: string } {
  const orderId = `ord_direct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orderNumero = getNextOrderNumber();
  const typeCommande: TypeCommande = input.typeCommande || 'RETRAIT';

  let total = 0;
  const orderItems: OrderItem[] = input.items.map((item, index) => {
    const product = getProductById(item.productId);
    const unitPrice = item.prixUnitaire || (product ? product.prix : 0);
    const subtotal = unitPrice * item.quantite;
    total += subtotal;

    return {
      id: `item_dir_${Date.now()}_${index}`,
      orderId,
      productId: item.productId,
      product: product || undefined,
      quantite: item.quantite,
      prixUnitaire: unitPrice,
    };
  });

  const newOrder: Order = {
    id: orderId,
    numero: orderNumero,
    clientNom: input.clientNom?.trim() || 'Client Comptoir',
    clientTel: input.clientTel?.trim() || '+228 90 00 00 00',
    typeCommande,
    tableId: input.tableId || null,
    adresseLivraison: null,
    statut: 'TERMINEE', // Immediate completion (Module 7 spec)
    statutPaiement: 'PAYE', // Immediate payment confirmed (Module 7 spec)
    modePaiement: input.modePaiement,
    total,
    vendeurId: input.vendorId,
    vendeur: {
      id: input.vendorId,
      nom: input.vendorName,
      telephone: '',
      role: 'VENDEUR',
      actif: true,
      createdAt: new Date().toISOString(),
    },
    items: orderItems,
    recuNumero: `REC-${orderNumero.replace('SO-', '')}`,
    recuUrl: `/recu/${orderNumero}`,
    datePaiement: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const orders = getAllOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  // Dispatch browser custom event
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('signature_one:receipt_ready', {
          detail: {
            order: newOrder,
            receiptNumber: `REC-${newOrder.numero}`,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch {
      // ignore
    }
  }

  return { success: true, order: newOrder };
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

const STORAGE_SMS_LOGS_KEY = 'signature_one_sms_logs_v1';

/**
 * Persist an incoming SMS into the local SMS log store.
 * Used by the webhook handler and exposed in the admin for manual fallback.
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
  saveSmsLogs(logs);
  return entry;
}

function saveSmsLogs(logs: SmsLog[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_SMS_LOGS_KEY, JSON.stringify(logs));
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Get all persisted SMS logs (most recent first).
 * Safe to call in both browser and Node (webhook handler) contexts.
 */
export function getAllSmsLogs(): SmsLog[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_SMS_LOGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SmsLog[];
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
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
  if (isMockDataEnabled) {
    // Mode mock explicite : mise à jour locale uniquement.
    order.statutPaiement = 'PAYE';
    order.datePaiement = new Date().toISOString();
  } else {
    // Sinon la validation passe par le backend (source de vérité).
    void confirmPayment(order.id).then((res) => {
      if (!res.success) {
        console.error('[orders] Rapprochement SMS : échec de validation via backend :', res.error);
      }
    });
  }
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
  saveSmsLogs(logs);
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
 */
export async function hydrateOrdersFromBackend(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const serverOrders = await apiFetch<Order[]>('/orders');
    if (Array.isArray(serverOrders) && serverOrders.length > 0) {
      const existing = getAllOrders();
      const merged = [...existing.filter((e) => !serverOrders.some((s) => s.id === e.id)), ...serverOrders];
      try {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(merged));
      } catch (err) {
        console.error('Failed to cache orders from backend:', err);
      }
    }
  } catch (e) {
    // Non authentifié ou backend injoignable : on garde le cache local.
    console.warn('[orders] Hydratation depuis le backend ignorée :', e instanceof ApiError ? e.message : e);
  }
}

/**
 * Browser-only: hydrate the localStorage cache from Supabase so that
 * different devices see the same shared orders. Called once at app startup
 * (see App.tsx). Non-destructive: if Supabase is unconfigured or empty,
 * the local cache is left untouched.
 *
 * NOTE : ce chemin de lecture s'exécute côté navigateur => il utilise le client
 * anon standard (soumis aux policies RLS), PAS la clé service_role.
 */
export async function hydrateOrdersFromSupabase(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isSupabaseConfigured) return;

  try {
    const { data } = await supabase
      .from('Order')
      .select('*')
      .order('createdAt', { ascending: false });
    const serverOrders = (data || []) as Order[];
    if (serverOrders.length > 0) {
      const existing = getAllOrders();
      // Merge: keep local-only orders (e.g. currently mid-checkout) on top,
      // then dedupe by id from the Supabase snapshot.
      const merged = [...existing.filter((e) => !serverOrders.some((s) => s.id === e.id)), ...serverOrders];
      try {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(merged));
        notifySubscribers();
      } catch (e) {
        console.error('Failed to persist hydrated orders:', e);
      }
    }
  } catch (err) {
    console.warn('[orders] hydrateOrdersFromSupabase error (ignored):', err);
  }
}
