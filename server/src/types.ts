/**
 * Signature One — Types serveur (miroir minimal du schéma Prisma).
 * Ces types sont STRICTEMENT côté serveur ; ils ne sont jamais inclus dans le
 * bundle frontend (qui utilise src/types.ts). Ils évitent toute dépendance
 * vers le code client.
 */

export type Role = 'ADMIN' | 'VENDEUR';
export type TypeCommande = 'LIVRAISON' | 'RETRAIT' | 'SUR_PLACE';
export type StatutCommande = 'NOUVELLE' | 'ACCEPTEE' | 'EN_PREPARATION' | 'PRETE' | 'TERMINEE';
export type StatutPaiement = 'EN_ATTENTE' | 'PAYE' | 'PAIEMENT_LIVRAISON' | 'PAIEMENT_SUR_PLACE';
export type ModePaiement = 'FLOOZ' | 'TMONEY' | 'LIVRAISON' | 'SUR_PLACE';
export type SmsStatus = 'PENDING' | 'MATCHED' | 'UNMATCHED' | 'ERROR';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantite: number;
  prixUnitaire: number;
  /**
   * Enrichissement LECTURE SEULE (jointure applicative) : nom/format du produit.
   * La table OrderItem ne stocke que `productId` et le schéma Prisma n'expose
   * aucune relation `product` → PostgREST ne peut pas joindre Product. Ce champ
   * est donc rempli par OrdersService.attachProductNames pour les reçus/UI.
   */
  product?: { id: string; nom: string; format?: string | null } | null;
}

export interface Order {
  id: string;
  numero: string;
  clientNom: string;
  clientTel: string;
  typeCommande: TypeCommande;
  tableId?: string | null;
  adresseLivraison?: string | null;
  statut: StatutCommande;
  statutPaiement: StatutPaiement;
  modePaiement: ModePaiement;
  total: number;
  vendeurId?: string | null;
  /**
   * Enrichissement LECTURE SEULE (jointure applicative serveur) : le vendeur
   * en charge (id + nom + téléphone). La table Order ne stocke que
   * `vendeurId` : rempli par OrdersService.attachVendorNames, comme les
   * produits des lignes. Sans lui, l'admin voit "Non assigné" même quand
   * une commande est prise en charge (vendeurId présent, nom absent).
   */
  vendeur?: { id: string; nom: string; telephone?: string | null } | null;
  items: OrderItem[];
  recuNumero?: string | null;
  recuUrl?: string | null;
  datePaiement?: string | null;
  createdAt: string;
  payment_reference?: string | null;
  payment_amount_expected?: number | null;
  payment_matched_sms?: unknown;
}

export interface Product {
  id: string;
  nom: string;
  description: string;
  format: string;
  prix: number;
  photoUrl?: string | null;
  disponible: boolean;
  actif: boolean;
  misEnAvant: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  note: number;
  commentaire?: string | null;
  prenom?: string | null;
  valide: boolean;
  createdAt: string;
}

/**
 * TableQR — données de table exposées au client.
 * Source de vérité : table Supabase `TableQR` (id, numero). Le champ `numero`
 * est unique (migration `TableQR_numero_key`). Aucun stockage côté client.
 */
export interface TableQR {
  id: string;
  numero: number;
}


export interface Expense {
  id: string;
  libelle: string;
  montant: number;
  createdAt: string;
}

/**
 * Payment — trace serveur d'une transaction passerelle (CinetPay).
 * `orderId` est UNIQUE en base : une commande n'a qu'un enregistrement de
 * paiement, ce qui sert aussi de verrou d'idempotence du webhook.
 */
export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  reference?: string | null;
  statut: StatutPaiement;
  confirmePar?: string | null;
  createdAt: string;
}

/**
 * SmsLog — journal serveur de la réconciliation mobile-money.
 * La table SmsLog a RLS (aucun accès anon). Source de vérité côté admin = Supabase.
 */
export interface SmsLog {
  id?: string;
  sender: string;
  message: string;
  receivedAt: string;
  parsedAmount?: number | null;
  parsedSender?: string | null;
  parsedBalance?: number | null;
  previousBalance?: number | null;
  matchedOrderId?: string | null;
  status: SmsStatus;
  createdAt?: string;
}
