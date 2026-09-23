import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/** Initiation d'un paiement passerelle pour une commande existante. */
export class InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  /** Référence de transaction générée côté client (SO-CP-SO-0001-...). */
  @IsString()
  @IsNotEmpty()
  reference!: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

/**
 * Payload du webhook CinetPay. Tous les champs sont optionnels : c'est la
 * passerelle qui décide de ce qu'elle envoie (on ne peut pas l'imposer).
 * Les champs numériques arrivent en string depuis CinetPay (`cpm_amount`).
 */
export class CinetPayWebhookDto {
  @IsOptional() @IsString() cpm_site_id?: string;
  @IsOptional() @IsString() cpm_trans_id?: string;
  @IsOptional() @IsString() cpm_trans_date?: string;
  @IsOptional() cpm_amount?: string | number;
  @IsOptional() @IsString() cpm_currency?: string;
  @IsOptional() @IsString() cpm_payment_config?: string;
  @IsOptional() @IsString() cpm_page_action?: string;
  @IsOptional() @IsString() cpm_version?: string;
  @IsOptional() @IsString() cpm_language?: string;
  @IsOptional() @IsString() cpm_designation?: string;
  /** Contient l'orderId (ou le numéro de commande) côté marchand. */
  @IsOptional() @IsString() cpm_custom?: string;
  /** "00" = succès CinetPay. */
  @IsOptional() @IsString() cpm_result?: string;
  /** "ACCEPTED" | "REFUSED". */
  @IsOptional() @IsString() cpm_trans_status?: string;
  @IsOptional() @IsString() payment_method?: string;
  @IsOptional() @IsString() signature?: string;
}

/** Rapprochement manuel d'un paiement (admin). */
export class ReconcilePaymentDto {
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() confirmePar?: string;
}

export { IsInt, Min };
