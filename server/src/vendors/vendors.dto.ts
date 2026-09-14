import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Role } from '../types';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nom!: string;

  /** Togolese mobile format, ex: +228 92 53 07 00 */
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telephone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @IsNotEmpty()
  motDePasse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientNom?: string;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @IsNotEmpty()
  motDePasse?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'VENDEUR'])
  role?: Role;
}

export class ResetVendorPasswordDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @IsNotEmpty()
  motDePasse?: string;
}

export class VendorResponseDto {
  id!: string;
  role!: Role;
  nom!: string;
  telephone!: string;
  actif!: boolean;
  createdAt!: string;
  /** uniquement pour l'affichage admin — mot de passe temporaire généré */
  tempPassword?: string;
}