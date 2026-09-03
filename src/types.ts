/**
 * Signature One - Types & Enums definitions
 * Mirroring the Prisma schema for full-stack and client use
 */

export type Role = 'ADMIN' | 'VENDEUR';
export type TypeCommande = 'LIVRAISON' | 'RETRAIT' | 'SUR_PLACE';
export type StatutCommande = 'NOUVELLE' | 'ACCEPTEE' | 'EN_PREPARATION' | 'PRETE' | 'TERMINEE';
export type StatutPaiement = 'EN_ATTENTE' | 'PAYE' | 'PAIEMENT_LIVRAISON' | 'PAIEMENT_SUR_PLACE';
export type ModePaiement = 'FLOOZ' | 'TMONEY' | 'LIVRAISON' | 'SUR_PLACE';

export interface User {
  id: string;
  role: Role;
  nom: string;
  telephone: string;
  actif: boolean;
  createdAt: Date | string;
  ventes?: Order[];
}

export interface Product {
  id: string;
  nom: string;
  description: string;
  format: string;
  prix: number; // En FCFA
  photoUrl?: string | null;
  disponible: boolean;
  quantiteRestante?: number | null;
  actif: boolean;
  misEnAvant: boolean;
  createdAt?: Date | string;
}

export interface CreateProductInput {
  nom: string;
  description: string;
  format: string;
  prix: number;
  photoUrl?: string | null;
  disponible?: boolean;
  quantiteRestante?: number | null;
  actif?: boolean;
  misEnAvant?: boolean;
}

export interface UpdateProductInput {
  nom?: string;
  description?: string;
  format?: string;
  prix?: number;
  photoUrl?: string | null;
  disponible?: boolean;
  quantiteRestante?: number | null;
  actif?: boolean;
  misEnAvant?: boolean;
}

export interface TableQR {
  id: string;
  numero: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
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
  vendeur?: User | null;
  items: OrderItem[];
  recuNumero?: string | null;
  recuUrl?: string | null;
  datePaiement?: string | null;
  payment_reference?: string | null;
  payment_amount_expected?: number | null;
  payment_matched_sms?: {
    raw_text: string;
    sender: string;
    received_at: string;
    matched_amount: number;
  } | null;
  createdAt: Date | string;
}

/**
 * SMS logs from Mobile Money gateway (Flooz/Yas/Moov Money)
 * Used for automatic payment reconciliation POC.
 */
export type SmsStatus = 'PENDING' | 'MATCHED' | 'UNMATCHED' | 'ERROR';

export interface SmsLog {
  id?: string;
  sender: string;
  message: string;
  receivedAt: Date | string;
  parsedAmount?: number | null;
  parsedSender?: string | null;
  parsedBalance?: number | null;
  previousBalance?: number | null;
  matchedOrderId?: string | null;
  status: SmsStatus;
  createdAt?: Date | string;
}

export interface CartItem {
  product: Product;
  quantite: number;
}

export interface CreateOrderInput {
  clientNom: string;
  clientPrenom?: string;
  clientTel: string;
  typeCommande: TypeCommande;
  tableId?: string | null;
  adresseLivraison?: string | null;
  quartier?: string;
  indications?: string;
  modePaiement: ModePaiement;
  items: {
    productId: string;
    quantite: number;
    prixUnitaire: number;
  }[];
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  reference?: string | null;
  statut: StatutPaiement;
  confirmePar?: string | null;
  createdAt: Date | string;
}

export interface Review {
  id: string;
  orderId: string;
  note: number;
  commentaire?: string | null;
  prenom?: string | null;
  valide: boolean;
  misEnAvant?: boolean;
  createdAt: Date | string;
}

export interface Expense {
  id: string;
  libelle: string;
  montant: number;
  createdAt: Date | string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

export interface LoginCredentials {
  telephone: string;
  motDePasse: string;
}

export interface CreateVendorInput {
  nom: string;
  telephone: string;
  motDePasse?: string;
}

export interface VendorUserRecord extends User {
  motDePasseHash?: string;
  lastLoginAt?: string;
  tempPassword?: string;
}

export interface AppModuleSection {
  id: string;
  title: string;
  path: string;
  description: string;
  badge: string;
  iconName: string;
}
