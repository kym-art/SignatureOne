import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ModePaiement, TypeCommande } from '../types';

export const TYPE_COMMANDE_VALUES = ['LIVRAISON', 'RETRAIT', 'SUR_PLACE'];
export const MODE_PAIEMENT_VALUES = ['FLOOZ', 'TMONEY', 'LIVRAISON', 'SUR_PLACE'];
export const STATUT_COMMANDE_VALUES = ['NOUVELLE', 'ACCEPTEE', 'EN_PREPARATION', 'PRETE', 'TERMINEE'];

/**
 * Ligne envoyée par le client.
 * ⚠️ Le prix N'EST PAS importé du client : le serveur recalcule le total depuis
 * la table Product (resolvePricedItems dans OrdersService). quantite > 0.
 */
export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantite!: number;
}

export class DirectSaleItemDto extends OrderItemDto {}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  clientNom!: string;

  @IsString()
  @IsNotEmpty()
  clientTel!: string;

  @IsIn(TYPE_COMMANDE_VALUES)
  typeCommande!: TypeCommande;

  @IsOptional()
  @IsString()
  tableId?: string | null;

  @IsOptional()
  @IsString()
  adresseLivraison?: string | null;

  @IsIn(MODE_PAIEMENT_VALUES)
  modePaiement!: ModePaiement;

  @IsOptional()
  @IsString()
  payment_reference?: string;

  @IsOptional()
  @IsString()
  recuNumero?: string;

  @IsOptional()
  @IsString()
  recuUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class DirectSaleDto {
  @IsOptional()
  @IsString()
  clientNom?: string;

  @IsOptional()
  @IsString()
  clientTel?: string;

  @IsOptional()
  @IsIn(TYPE_COMMANDE_VALUES)
  typeCommande?: TypeCommande;

  @IsOptional()
  @IsString()
  tableId?: string | null;

  @IsIn(MODE_PAIEMENT_VALUES)
  modePaiement!: ModePaiement;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectSaleItemDto)
  items!: DirectSaleItemDto[];
}

export class UpdateStatusDto {
  @IsIn(STATUT_COMMANDE_VALUES)
  statut!: string;
}

export class AssignVendorDto {
  @IsOptional()
  @ValidateIf((o) => o.vendeurId != null)
  @IsString()
  vendeurId?: string | null;
}

