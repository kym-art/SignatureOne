import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  format!: string;

  @IsInt()
  @Min(1)
  prix!: number;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantiteRestante?: number | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsBoolean()
  misEnAvant?: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  format?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  prix?: number;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantiteRestante?: number | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsBoolean()
  misEnAvant?: boolean;
}