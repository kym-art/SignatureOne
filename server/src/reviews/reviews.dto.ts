import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Création d'un avis client (endpoint public, modération a posteriori). */
export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  note!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentaire?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  prenom?: string | null;
}

/** Masquage / publication d'un avis (admin). `misEnAvant` n'est plus persistable. */
export class FeatureReviewDto {
  @IsOptional()
  @IsBoolean()
  valide?: boolean;
}