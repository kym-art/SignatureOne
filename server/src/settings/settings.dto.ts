import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO pour les paramètres de fermeture exceptionnelle.
 * Le backend stocke un ensemble de clés settings (StoreSetting) en JSON.
 */
export class StoreSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(5)
  openHour?: string;           // "09:00"

  @IsOptional()
  @IsString()
  @MaxLength(5)
  closeHour?: string;          // "22:00"

  @IsOptional()
  @IsBoolean()
  closedEnabled?: boolean;     // fermeture exceptionnelle activée

  @IsOptional()
  @IsString()
  @MaxLength(500)
  closedMessage?: string;       // message affiché aux clients

  @IsOptional()
  @IsString()
  @MaxLength(500)
  closedUntil?: string | null;  // ISO date — jusqu'à
}

export interface StoreSettingRow {
  key: string;
  value: Record<string, unknown>;
}

export interface StoreStatus {
  isOpen: boolean;
  openHour: string;
  closeHour: string;
  closedEnabled: boolean;
  closedMessage: string | null;
  closedUntil: string | null;
  reason?: string | null;
}