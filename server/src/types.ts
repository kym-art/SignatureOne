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
  quantiteRestante?: number | null;
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

export interface Expense {
  id: string;
  libelle: string;
  montant: number;
  createdAt: string;
}
