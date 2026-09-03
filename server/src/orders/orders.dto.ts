import { ModePaiement, OrderItem, TypeCommande } from '../types';

export interface CreateOrderItemInput {
  productId: string;
  quantite: number;
  prixUnitaire: number;
}

export interface CreateOrderDto {
  clientNom: string;
  clientTel: string;
  typeCommande: TypeCommande;
  tableId?: string | null;
  adresseLivraison?: string | null;
  modePaiement: ModePaiement;
  items: CreateOrderItemInput[];
  // `total` fourni par le client mais RÉCALCULÉ serveur pour éviter la manipulation.
  total?: number;
  payment_reference?: string;
  recuNumero?: string;
  recuUrl?: string;
}

export interface DirectSaleItemInput {
  productId: string;
  quantite: number;
  prixUnitaire?: number;
}

/** Vente directe comptoir : commande immédiatement TERMINEE + PAYE. */
export interface DirectSaleDto {
  clientNom?: string;
  clientTel?: string;
  typeCommande?: TypeCommande;
  tableId?: string | null;
  modePaiement: ModePaiement;
  items: DirectSaleItemInput[];
}

export interface OrderItemRow {
  id: string;
  orderId: string;
  productId: string;
  quantite: number;
  prixUnitaire: number;
}

export type { OrderItem, Order } from '../types';

